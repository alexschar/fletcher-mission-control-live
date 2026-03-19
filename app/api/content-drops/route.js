import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const {
  createContentDrop,
  getContentDrops,
} = require('../../../lib/supabase');

const ALLOWED_PLATFORMS = ['youtube', 'tiktok', 'instagram', 'twitter', 'web', 'other'];
const ALLOWED_CONTENT_TYPES = ['transcript', 'caption', 'article', 'post', 'other'];

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function parseLimit(searchParams) {
  const raw = searchParams.get('limit');
  if (!raw) return 10;
  const limit = Number.parseInt(raw, 10);
  if (Number.isNaN(limit) || limit < 1) return null;
  return Math.min(limit, 50);
}

function parseProcessed(value) {
  if (value == null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return null;
}

function parseSince(value) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
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

    const search = searchParams.get('search')?.trim() || undefined;

    const processed = parseProcessed(searchParams.get('processed'));
    if (processed === null) {
      return NextResponse.json({ error: 'processed must be true or false' }, { status: 400 });
    }

    const since = parseSince(searchParams.get('since'));
    if (since === null) {
      return NextResponse.json({ error: 'since must be a valid ISO date string' }, { status: 400 });
    }

    const drops = await getContentDrops({ limit, platform, processed, since, search });
    return NextResponse.json(drops);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.source_url || !isValidUrl(body.source_url)) {
      return NextResponse.json({ error: 'source_url is required and must be a valid URL' }, { status: 400 });
    }

    if (!body.platform || !ALLOWED_PLATFORMS.includes(body.platform)) {
      return NextResponse.json({ error: `platform is required and must be one of: ${ALLOWED_PLATFORMS.join(', ')}` }, { status: 400 });
    }

    if (!body.content_type || !ALLOWED_CONTENT_TYPES.includes(body.content_type)) {
      return NextResponse.json({ error: `content_type is required and must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}` }, { status: 400 });
    }

    if (typeof body.raw_content !== 'string' || !body.raw_content.trim()) {
      return NextResponse.json({ error: 'raw_content is required and must be a non-empty string' }, { status: 400 });
    }

    if (body.topics != null && !Array.isArray(body.topics)) {
      return NextResponse.json({ error: 'topics must be an array' }, { status: 400 });
    }

    if (body.relevant_agents != null && !Array.isArray(body.relevant_agents)) {
      return NextResponse.json({ error: 'relevant_agents must be an array' }, { status: 400 });
    }

    const record = await createContentDrop({
      source_url: body.source_url,
      platform: body.platform,
      content_type: body.content_type,
      title: body.title?.trim() || null,
      raw_content: body.raw_content.trim(),
      summary: typeof body.summary === 'string' ? body.summary.trim() || null : null,
      topics: body.topics || [],
      relevant_agents: body.relevant_agents || [],
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
