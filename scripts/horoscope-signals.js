#!/usr/bin/env node
/**
 * horoscope-signals.js — Daily horoscope fetcher for Mission Control
 *
 * Fetches daily, weekly, and monthly horoscopes for Alex's chart:
 *   - Aquarius (Sun)
 *   - Virgo (Moon)
 *   - Libra (Rising)
 *
 * Posts each as a life_signal to Mission Control API.
 * Run once daily via cron at ~6:30 AM:
 *   30 6 * * * cd ~/Projects/fletcher-mission-control-live/scripts && node horoscope-signals.js >> ~/logs/horoscope-signals.log 2>&1
 *
 * Environment variables (set in shell or .env):
 *   MC_API_URL   — Mission Control base URL (default: https://fletcher-mission-control-live.vercel.app)
 *   MC_API_TOKEN — Auth token for POST /api/life-signals
 */

const MC_API_URL = process.env.MC_API_URL || 'https://fletcher-mission-control-live.vercel.app';
const MC_API_TOKEN = process.env.MC_API_TOKEN || process.env.MC_AUTH_TOKEN;

if (!MC_API_TOKEN) {
  console.error('[horoscope] MC_API_TOKEN not set. Exiting.');
  process.exit(1);
}

// Alex's natal chart
const CHART = [
  { sign: 'aquarius', placement: 'Sun',    emoji: '☀️' },
  { sign: 'virgo',    placement: 'Moon',   emoji: '🌙' },
  { sign: 'libra',    placement: 'Rising', emoji: '⬆️' },
];

// Horoscope API endpoints (tried in order, first success wins)
const APIS = [
  {
    name: 'horoscope-app-api',
    daily: (sign) => `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign}&day=TODAY`,
    weekly: (sign) => `https://horoscope-app-api.vercel.app/api/v1/get-horoscope/weekly?sign=${sign}`,
    parse: (json) => ({
      text: json.data?.horoscope_data || json.horoscope || '',
      date: json.data?.date || json.date || new Date().toISOString().slice(0, 10),
    }),
  },
  {
    name: 'horoscope-herokuapp',
    daily: (sign) => `https://horoscope-api.herokuapp.com/horoscope/today/${sign}`,
    weekly: (sign) => `https://horoscope-api.herokuapp.com/horoscope/week/${sign}`,
    parse: (json) => ({
      text: json.horoscope || '',
      date: json.date || json.week || new Date().toISOString().slice(0, 10),
    }),
  },
];

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function getHoroscope(sign, period = 'daily') {
  for (const api of APIS) {
    try {
      const url = period === 'weekly' ? api.weekly(sign) : api.daily(sign);
      const json = await fetchWithTimeout(url);
      const parsed = api.parse(json);
      if (parsed.text) {
        console.log(`[horoscope] ${sign} ${period} fetched from ${api.name}`);
        return { ...parsed, api: api.name };
      }
    } catch (err) {
      console.warn(`[horoscope] ${api.name} failed for ${sign} ${period}: ${err.message}`);
    }
  }
  console.error(`[horoscope] All APIs failed for ${sign} ${period}`);
  return null;
}

async function postSignal(signal) {
  try {
    const res = await fetch(`${MC_API_URL}/api/life-signals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MC_API_TOKEN}`,
      },
      body: JSON.stringify(signal),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error(`[horoscope] POST failed (${res.status}):`, data);
      return null;
    }
    console.log(`[horoscope] Signal created: ${data.id} — ${signal.title}`);
    return data;
  } catch (err) {
    console.error(`[horoscope] POST error: ${err.message}`);
    return null;
  }
}

function getDayOfWeek() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function run() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const dayOfWeek = getDayOfWeek();
  const isMonday = now.getDay() === 1;

  console.log(`[horoscope] Running for ${dateStr} (${dayOfWeek})`);

  for (const { sign, placement, emoji } of CHART) {
    // Daily horoscope
    const daily = await getHoroscope(sign, 'daily');
    if (daily) {
      await postSignal({
        source: 'horoscope',
        category: 'creative',
        signal_type: 'daily_horoscope',
        title: `${emoji} ${placement} (${sign.charAt(0).toUpperCase() + sign.slice(1)}) — ${dayOfWeek}`,
        body: daily.text,
        priority: 'low',
        metadata: {
          sign,
          placement,
          period: 'daily',
          date: daily.date,
          api_source: daily.api,
        },
        agent_notes: {
          chart_position: placement,
          sign,
        },
      });
    }

    // Weekly horoscope — only on Mondays
    if (isMonday) {
      const weekly = await getHoroscope(sign, 'weekly');
      if (weekly) {
        await postSignal({
          source: 'horoscope',
          category: 'creative',
          signal_type: 'weekly_horoscope',
          title: `${emoji} ${placement} (${sign.charAt(0).toUpperCase() + sign.slice(1)}) — Week of ${dateStr}`,
          body: weekly.text,
          priority: 'low',
          metadata: {
            sign,
            placement,
            period: 'weekly',
            date: weekly.date,
            api_source: weekly.api,
          },
          agent_notes: {
            chart_position: placement,
            sign,
          },
        });
      }
    }
  }

  console.log(`[horoscope] Done.`);
}

run().catch((err) => {
  console.error('[horoscope] Fatal:', err);
  process.exit(1);
});
