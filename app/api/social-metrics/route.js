import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { createSocialMetric, getSocialMetrics } = require('../../../lib/supabase');

const ALLOWED_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'twitter'];

function parseLimit(searchParams) {
  const raw = searchParams.get('limit');
  if (!raw) return 10;
  const limit = Number.parseInt(raw, 10);
  if (Number.isNaN(limit) || limit < 1) return null;
  return Math.min(limit, 50);
}

function parseSince(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isValidMetricValue(value) {
  return typeof value === 'number' && !Number.isNaN(value);
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams);
    if (limit == null) {
      return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 });
    }

    const platform = searchParams.get('platform');
    if (platform && !ALLOWED_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: `platform must be one of: ${ALLOWED_PLATFORMS.join(', ')}` }, { status: 400 });
    }

    const since = parseSince(searchParams.get('since'));
    if (since === null) {
      return NextResponse.json({ error: 'since must be a valid ISO date string' }, { status: 400 });
    }

    const metric_type = searchParams.get('metric_type') || undefined;
    const metrics = await getSocialMetrics({ limit, platform, metric_type, since });
    return NextResponse.json(metrics);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.platform || !ALLOWED_PLATFORMS.includes(body.platform)) {
      return NextResponse.json({ error: `platform is required and must be one of: ${ALLOWED_PLATFORMS.join(', ')}` }, { status: 400 });
    }

    if (!Array.isArray(body.metrics) || body.metrics.length === 0) {
      return NextResponse.json({ error: 'metrics is required and must be a non-empty array' }, { status: 400 });
    }

    for (const metric of body.metrics) {
      if (typeof metric?.metric_type !== 'string' || !metric.metric_type.trim()) {
        return NextResponse.json({ error: 'Each metric must include metric_type as a non-empty string' }, { status: 400 });
      }

      if (!isValidMetricValue(metric?.metric_value)) {
        return NextResponse.json({ error: 'Each metric must include metric_value as a number' }, { status: 400 });
      }

      if (metric.metadata != null && (typeof metric.metadata !== 'object' || Array.isArray(metric.metadata))) {
        return NextResponse.json({ error: 'metadata must be an object when provided' }, { status: 400 });
      }
    }

    const snapshotDate = new Date().toISOString().slice(0, 10);
    const createdRecords = [];

    for (const metric of body.metrics) {
      const metricType = metric.metric_type.trim();
      const previousMetrics = await getSocialMetrics({
        platform: body.platform,
        metric_type: metricType,
        limit: 1,
      });

      const previousValue = previousMetrics[0]?.metric_value ?? null;
      const delta = previousValue == null ? null : metric.metric_value - previousValue;

      const record = await createSocialMetric({
        platform: body.platform,
        metric_type: metricType,
        metric_value: metric.metric_value,
        previous_value: previousValue,
        delta,
        metadata: metric.metadata ?? {},
        snapshot_date: snapshotDate,
      });

      createdRecords.push(record);
    }

    return NextResponse.json(createdRecords, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
