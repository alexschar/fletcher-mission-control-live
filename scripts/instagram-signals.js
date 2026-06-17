#!/usr/bin/env node
/**
 * Instagram Signals - Social Metrics Pipeline
 * 
 * This script manages the configuration for Instagram account integration with Mission Control.
 * It defines which accounts are monitored and how social metrics are tracked.
 * 
 * The actual Instagram API access is handled by Sawyer using web scraping or API tools.
 * Sawyer polls Instagram accounts and POSTs to /api/life-signals to create signals.
 * 
 * Configuration: data/instagram-accounts.json
 * 
 * Usage:
 *   node scripts/instagram-signals.js          # Show current configuration
 *   node scripts/instagram-signals.js --verify # Verify configuration and API connectivity
 *   node scripts/instagram-signals.js --poll   # Trigger a poll for all accounts (Sawyer handles this)
 * 
 * Life Signal Format:
 *   - source: instagram_<username> (e.g., instagram_alexcandothat)
 *   - category: social
 *   - signal_type: social_metrics
 *   - title: "Instagram @<username>: <followers> followers (+<delta>)"
 *   - body: "Followers: <followers> (+<delta>%)\nPosts: <media_count>"
 *   - metadata: { platform, username, followers, media_count, follower_delta, follower_delta_pct }
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from host .env
const envPath = path.join(process.env.HOME || '/Users/fletcheragent', '.openclaw', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key.trim()]) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const MISSION_CONTROL_URL = process.env.MISSION_CONTROL_URL || 'https://fletcher-mission-control-live.vercel.app';
const MC_API_TOKEN = process.env.MC_API_TOKEN || 'mc_test_token_12345';

// Load account configuration
const ACCOUNTS_CONFIG_PATH = path.join(__dirname, '..', 'data', 'instagram-accounts.json');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function loadAccountsConfig() {
  try {
    if (fs.existsSync(ACCOUNTS_CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(ACCOUNTS_CONFIG_PATH, 'utf8'));
      return config.accounts || [];
    }
  } catch (error) {
    log(`Error loading accounts config: ${error.message}`);
  }
  return [];
}

async function verifyApiConnectivity() {
  log('Verifying API connectivity...');
  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/life-signals?limit=1`, {
      headers: {
        'Authorization': `Bearer ${MC_API_TOKEN}`}
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    log('✅ API connectivity verified');
    return true;
  } catch (error) {
    log(`❌ API connectivity failed: ${error.message}`);
    return false;
  }
}

async function checkExistingSignals() {
  log('Checking existing Instagram signals...');
  
  try {
    // Check for signals from Instagram sources
    const accounts = loadAccountsConfig();
    const results = {};
    
    for (const account of accounts) {
      if (!account.enabled) continue;
      
      const response = await fetch(
        `${MISSION_CONTROL_URL}/api/life-signals?source=${account.source}&limit=1`,
        { headers: { 'Authorization': `Bearer ${MC_API_TOKEN}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        results[account.username] = {
          count: data.length,
          latest: data[0]?.created_at || null
        };
      }
    }
    
    log('Existing signals by account:');
    for (const [username, info] of Object.entries(results)) {
      const latestStr = info.latest ? new Date(info.latest).toLocaleDateString() : 'never';
      log(`  @${username}: ${info.count} signals (latest: ${latestStr})`);
    }
    
    return results;
  } catch (error) {
    log(`Error checking signals: ${error.message}`);
    return {};
  }
}

async function createLifeSignal(account, metrics) {
  const {
    followers,
    media_count,
    follower_delta = 0,
    follower_delta_pct = 0
  } = metrics;
  
  const deltaStr = follower_delta >= 0 ? `+${follower_delta}` : `${follower_delta}`;
  const deltaPctStr = follower_delta_pct >= 0 ? `+${follower_delta_pct}` : `${follower_delta_pct}`;
  
  const signal = {
    source: account.source,
    category: 'social',
    signal_type: 'social_metrics',
    title: `Instagram @${account.username}: ${followers} followers (${deltaStr})`,
    body: `Followers: ${followers} (${deltaPctStr}%)\nPosts: ${media_count}`,
    metadata: {
      platform: 'instagram',
      username: account.username,
      followers,
      media_count,
      follower_delta,
      follower_delta_pct
    },
    priority: 'normal',
    status: 'unread',
    agent_notes: {
      reason: follower_delta !== 0 ? `follower change: ${deltaStr}` : 'no follower change',
      triage: 'routine',
      sender_known: true,
      action_needed: false,
      engagement_spike: Math.abs(follower_delta_pct) >= 5
    }
  };
  
  try {
    const response = await fetch(`${MISSION_CONTROL_URL}/api/life-signals`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MC_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signal)
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    log(`✅ Created signal for @${account.username}: ${followers} followers`);
    return data;
  } catch (error) {
    log(`❌ Failed to create signal for @${account.username}: ${error.message}`);
    throw error;
  }
}

function printConfig() {
  const accounts = loadAccountsConfig();
  
  console.log('\n=== Instagram Account Configuration ===\n');
  
  for (const account of accounts) {
    const status = account.enabled ? '✅ Enabled' : '❌ Disabled';
    const primary = account.isPrimary ? ' [PRIMARY]' : '';
    console.log(`Account: @${account.username}${primary}`);
    console.log(`  ID: ${account.accountId}`);
    console.log(`  Source: ${account.source}`);
    console.log(`  Status: ${status}`);
    console.log(`  Category: ${account.category}`);
    
    if (account.description) {
      console.log(`  Description: ${account.description}`);
    }
    
    console.log('');
  }
  
  console.log('=== Configuration Notes ===');
  console.log('');
  console.log('When creating life-signals from Instagram:');
  console.log('  - Use "source" field to distinguish accounts (e.g., instagram_alexcandothat)');
  console.log('  - Include "metadata.username" with the Instagram handle');
  console.log('  - Include "metadata.platform" set to "instagram"');
  console.log('  - Track followers, media_count, follower_delta, follower_delta_pct');
  console.log('');
  console.log('Example signal payload:');
  console.log(JSON.stringify({
    source: 'instagram_alexcandothat',
    category: 'social',
    signal_type: 'social_metrics',
    title: 'Instagram @alexcandothat: 1234 followers (+5)',
    body: 'Followers: 1234 (+0.4%)\nPosts: 45',
    metadata: {
      platform: 'instagram',
      username: 'alexcandothat',
      followers: 1234,
      media_count: 45,
      follower_delta: 5,
      follower_delta_pct: 0.4
    },
    priority: 'normal',
    status: 'unread'
  }, null, 2));
  console.log('');
}

async function createSignalsFromArgs(args) {
  // Parse command line arguments for manual signal creation
  // Format: --create username=<username> followers=<count> posts=<count> [delta=<count>]
  const params = {};
  for (const arg of args) {
    if (arg.includes('=')) {
      const [key, value] = arg.split('=');
      params[key] = value;
    }
  }
  
  const username = params.username || params.u;
  const followers = parseInt(params.followers || params.f, 10);
  const mediaCount = parseInt(params.posts || params.p, 10);
  const delta = parseInt(params.delta || params.d || '0', 10);
  
  if (!username || isNaN(followers) || isNaN(mediaCount)) {
    console.log('Usage: node instagram-signals.js --create username=<username> followers=<count> posts=<count> [delta=<count>]');
    console.log('Example: node instagram-signals.js --create username=alexcandothat followers=1500 posts=50 delta=10');
    return false;
  }
  
  const accounts = loadAccountsConfig();
  const account = accounts.find(a => a.username === username);
  
  if (!account) {
    log(`❌ Account @${username} not found in configuration`);
    return false;
  }
  
  if (!account.enabled) {
    log(`❌ Account @${username} is disabled`);
    return false;
  }
  
  const deltaPct = followers > 0 ? ((delta / (followers - delta)) * 100).toFixed(1) : 0;
  
  const metrics = {
    followers,
    media_count: mediaCount,
    follower_delta: delta,
    follower_delta_pct: parseFloat(deltaPct)
  };
  
  log(`Creating signal for @${username}...`);
  await createLifeSignal(account, metrics);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const verifyMode = args.includes('--verify');
  const createMode = args.includes('--create');
  
  if (createMode) {
    const success = await createSignalsFromArgs(args);
    process.exit(success ? 0 : 1);
  }
  
  if (verifyMode) {
    log('=== Instagram Signals Verification ===');
    
    const apiOk = await verifyApiConnectivity();
    if (!apiOk) {
      process.exit(1);
    }
    
    await checkExistingSignals();
    printConfig();
    
    log('=== Verification Complete ===');
  } else {
    printConfig();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { 
  loadAccountsConfig,
  verifyApiConnectivity,
  checkExistingSignals,
  createLifeSignal
};