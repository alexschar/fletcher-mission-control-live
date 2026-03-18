#!/usr/bin/env node

/**
 * Agent Status Update Script
 * 
 * This script demonstrates how agents can update their status in the dashboard.
 * Usage examples:
 * 
 * node update_agent_status.js sawyer working "Building new feature"
 * node update_agent_status.js celeste idle
 * node update_agent_status.js fletcher working "Reviewing code"
 */

const https = require('http');
const querystring = require('querystring');

const API_HOST = 'localhost';
const API_PORT = 3000;

function updateAgentStatus(agent, status, currentTask = null, model = null) {
  const data = {
    agent: agent.toLowerCase(),
    status: status.toLowerCase(),
    currentTask,
    model
  };
  
  // Remove null values
  Object.keys(data).forEach(key => {
    if (data[key] === null) delete data[key];
  });
  
  const postData = JSON.stringify(data);
  
  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: '/api/agents',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const result = JSON.parse(responseData);
        console.log(`✅ ${result.name} status updated to: ${result.status}`);
        if (result.currentTask) {
          console.log(`   Task: ${result.currentTask}`);
        }
      } else {
        console.error(`❌ Failed to update status: ${res.statusCode}`);
        console.error(responseData);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Error:', err.message);
  });

  req.write(postData);
  req.end();
}

// Command line interface
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node update_agent_status.js <agent> <status> [task] [model]');
  console.log('');
  console.log('Examples:');
  console.log('  node update_agent_status.js sawyer working "Building dashboard"');
  console.log('  node update_agent_status.js celeste idle');
  console.log('  node update_agent_status.js fletcher working "Code review" "claude-sonnet-4"');
  process.exit(1);
}

const [agent, status, task, model] = args;
updateAgentStatus(agent, status, task, model);