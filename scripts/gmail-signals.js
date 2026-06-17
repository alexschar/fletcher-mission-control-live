#!/usr/bin/env node
/**
 * Gmail Signals - Email Ingestion Pipeline
 * 
 * This script manages the configuration for Gmail account integration with Mission Control.
 * It defines which accounts are monitored and how emails are categorized.
 * 
 * The actual Gmail API access is handled by Sawyer using the Gmail skill via OpenAI Codex Apps.
 * Sawyer polls Gmail accounts and POSTs to /api/life-signals to create signals.
 * 
 * Configuration: data/gmail-accounts.json
 * 
 * Usage:
 *   node scripts/gmail-signals.js          # Show current configuration
 *   node scripts/gmail-signals.js --verify # Verify configuration and API connectivity
 * 
 * Cron (for future use when direct Gmail API is implemented):
 *   Run every 5 minutes (example crontab line commented out)
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
const ACCOUNTS_CONFIG_PATH = path.join(__dirname, '..', 'data', 'gmail-accounts.json');

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
        'Authorization': `Bearer ${MC_API_TOKEN}`
      }
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
  log('Checking existing Gmail signals...');
  
  try {
    // Check for signals from different sources
    const sources = ['gmail', 'gmail_scharalex', 'gmail_alexschar12'];
    const results = {};
    
    for (const source of sources) {
      const response = await fetch(
        `${MISSION_CONTROL_URL}/api/life-signals?source=${source}&limit=1`,
        { headers: { 'Authorization': `Bearer ${MC_API_TOKEN}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        results[source] = data.length;
      }
    }
    
    log('Existing signals by source:');
    for (const [source, count] of Object.entries(results)) {
      log(`  ${source}: ${count} signals`);
    }
    
    return results;
  } catch (error) {
    log(`Error checking signals: ${error.message}`);
    return {};
  }
}

function printConfig() {
  const accounts = loadAccountsConfig();
  
  console.log('\n=== Gmail Account Configuration ===\n');
  
  for (const account of accounts) {
    const status = account.enabled ? '✅ Enabled' : '❌ Disabled';
    console.log(`Account: ${account.email}`);
    console.log(`  ID: ${account.accountId}`);
    console.log(`  Source: ${account.source}`);
    console.log(`  Status: ${status}`);
    console.log(`  Categories: ${account.categories?.join(', ') || 'email'}`);
    
    if (account.priorityDomains?.length) {
      console.log(`  Priority Domains: ${account.priorityDomains.join(', ')}`);
    }
    
    if (account.prioritySenders?.length) {
      console.log(`  Priority Senders: ${account.prioritySenders.join(', ')}`);
    }
    
    if (account.description) {
      console.log(`  Description: ${account.description}`);
    }
    
    console.log('');
  }
  
  console.log('=== Configuration Notes ===');
  console.log('');
  console.log('When creating life-signals from Gmail:');
  console.log('  - Use "source" field to distinguish accounts (e.g., gmail_scharalex, gmail_alexschar12)');
  console.log('  - Include "metadata.account" with the full email address');
  console.log('  - Include "metadata.account_id" for account identification');
  console.log('');
  console.log('Example signal payload:');
  console.log(JSON.stringify({
    source: 'gmail_alexschar12',
    category: 'email',
    signal_type: 'email_received',
    title: 'Example Email Subject',
    body: 'Email body content...',
    metadata: {
      account: 'alexschar12@gmail.com',
      account_id: 'alexschar12',
      from: 'sender@example.com',
      email_id: 'message-id-123'
    },
    priority: 'normal',
    status: 'unread'
  }, null, 2));
  console.log('');
}

async function main() {
  const args = process.argv.slice(2);
  const verifyMode = args.includes('--verify');
  
  if (verifyMode) {
    log('=== Gmail Signals Verification ===');
    
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
  checkExistingSignals
};
