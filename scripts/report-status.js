#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_HOST = 'fletcher-mission-control-live.vercel.app';
const API_TOKEN = 'mc_test_token_12345';
const LOG_FILE = path.join(__dirname, 'status-reports.log');

function appendFallback(agent, status, currentTask, reason) {
  const line = `${new Date().toISOString()} | ${agent} | ${status} | ${currentTask || 'null'} | ${reason}\n`;
  try {
    fs.appendFileSync(LOG_FILE, line);
  } catch (err) {
    console.error('❌ Fallback log failed:', err.message);
  }
}

function reportStatus(agent, status, currentTask = null, isHeartbeat = false) {
  const data = { agent, status, currentTask, heartbeat: isHeartbeat };
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
        console.log(`⏳ ${agent} rate limited (logged locally)`);
        appendFallback(agent, status, currentTask, 'rate-limited');
      } else {
        console.error(`❌ Failed: ${res.statusCode}`);
        appendFallback(agent, status, currentTask, `http-${res.statusCode}`);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error:', err.message);
    appendFallback(agent, status, currentTask, `network-${err.message}`);
  });

  req.write(postData);
  req.end();
}

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
