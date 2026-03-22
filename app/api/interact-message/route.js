import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth';

const { createInteractMessage } = require('../../../lib/supabase');

const TELEGRAM_API_BASE = process.env.TELEGRAM_API_BASE || 'https://api.telegram.org';

const TARGETS = {
  fletcher: {
    label: 'Fletcher',
    botChatId: process.env.FLETCHER_BOT_CHAT_ID || '@fletcheragentbot',
  },
  sawyer: {
    label: 'Sawyer', 
    botChatId: process.env.SAWYER_BOT_CHAT_ID || '@sawyeragentbot',
  },
};

function readEnv(keys = []) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatElementContext(selected = {}) {
  const elementType = String(selected.type || 'element').trim() || 'element';
  const title = String(selected.title || 'Untitled element').trim() || 'Untitled element';
  const contextParts = [selected.details, selected.page, selected.href]
    .map((part) => String(part || '').trim())
    .filter(Boolean);
  const elementDetails = contextParts.length > 0 ? `${title} | ${contextParts.join(' | ')}` : title;
  return `[${elementType} — ${elementDetails}]`;
}

function formatInteractMessage(elementContext, question) {
  return `MC: ${elementContext} Alex asks: ${String(question || '').trim()}`;
}

async function sendTelegramMessage(targetConfig, text) {
  const botToken = readEnv(['ALEX_TELEGRAM_USER_TOKEN', 'TELEGRAM_BOT_TOKEN']);
  const botChatId = targetConfig.botChatId;

  if (!botToken) {
    throw new Error('Telegram bot token not configured');
  }

  if (!botChatId) {
    throw new Error(`Bot chat ID not configured for ${targetConfig.label}`);
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: botChatId,
      text,
    }),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    const telegramDescription = payload?.description || `Telegram API HTTP ${response.status}`;
    throw new Error(`Telegram send failed: ${telegramDescription}`);
  }

  return payload;
}

async function handler(request) {
  try {
    const body = await request.json();
    const targetAgent = String(body.targetAgent || '').toLowerCase();
    const config = TARGETS[targetAgent];

    if (!config) {
      return NextResponse.json({ error: 'Invalid target agent' }, { status: 400 });
    }

    const selected = body.selected || {};
    const question = String(body.question || '').trim();
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const elementContext = formatElementContext(selected);
    const message = formatInteractMessage(elementContext, question);
    const queued = await createInteractMessage({
      agent_target: targetAgent,
      element_context: elementContext,
      user_message: question,
      status: 'pending'
    });

    let telegramMessageId = null;
    let telegramStatus = 'skipped';
    let telegramError = null;

    try {
      const telegram = await sendTelegramMessage(config, message);
      telegramMessageId = telegram?.result?.message_id || null;
      telegramStatus = telegramMessageId ? 'sent' : 'attempted';
    } catch (error) {
      telegramStatus = 'failed';
      telegramError = error?.message || 'Telegram send failed';
      console.warn('Interact Telegram send failed (non-blocking):', telegramError);
    }

    return NextResponse.json({
      ok: true,
      targetAgent,
      targetLabel: config.label,
      deliveryMethod: 'supabase-first',
      message,
      elementContext,
      telegramMessageId,
      telegramStatus,
      telegramError,
      queueMessageId: queued?.id || null,
      queueStatus: queued?.status || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to send interact message' }, { status: 500 });
  }
}

export const POST = withAuth(handler);
