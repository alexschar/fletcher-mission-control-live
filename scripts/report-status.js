#!/usr/bin/env node

/**
 * Agent Status Reporter
 * Usage: node report-status.js <agent> <status> [task]
 * 
 * Examples:
 *   node report-status.js sawyer working "Fixing agent status"
 *   node report-status.js sawyer idle
 *   node report-status.js sawyer error "API failure"
 *   node report-status.js sawyer working "Task description" --heartbeat
 */

const https = require('https');

const API_HOST = 'fletcher-mission-control-live.vercel.app';
const API_TOKEN = 'mc_test_token_12345';

function reportStatus(agent, status, currentTask = null, isHeartbeat = false) {
  const data = {
    agent,
    status,
    currentTask,
    heartbeat: isHeartbeat
  };
  
  // Remove null values
  Object.keys(data).forEach(key => {
    if (data[key] === null) delete data[key];
  });
  
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: API_HOST,
    path: '/api/agents',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log(`✅ ${agent} status: ${status}`);
      } else if (res.statusCode === 429) {
        console.log(`⏳ ${agent} rate limited (ok for heartbeat)`);
      } else {
        console.error(`❌ Failed: ${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });

  req.write(postData);
  req.end();
}

// CLI
const args = process.argv.slice(2);
const isHeartbeat = args.includes('--heartbeat');
const filteredArgs = args.filter(a => a !== '--heartbeat');

if (filteredArgs.length < 2) {
  console.log('Usage: node report-status.js <agent> <status> [task] [--heartbeat]');
  console.log('Agents: sawyer, main (fletcher), celeste');
  console.log('Statuses: working, idle, error, waiting, offline');
  process.exit(1);
}

const [agent, status, ...taskParts] = filteredArgs;
const task = taskParts.join(' ') || null;

reportStatus(agent, status, task, isHeartbeat);
