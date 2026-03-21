#!/usr/bin/env node
/**
 * Mission Control Memory Sync Script
 * Syncs OpenClaw workspace memory files to Mission Control database
 */

const fs = require('fs');
const path = require('path');
const db = require('../lib/database');

// OpenClaw workspace paths
const WORKSPACE_PATHS = [
  '/Users/fletcheragent/.openclaw/workspace',
  '/Users/fletcheragent/.openclaw/workspace-sawyer', 
  '/Users/fletcheragent/.openclaw/workspace-celeste'
];

const AGENT_MAP = {
  'workspace': 'fletcher',
  'workspace-sawyer': 'sawyer',
  'workspace-celeste': 'celeste'
};

async function syncMemoryFiles() {
  console.log('🔄 Starting memory file sync...');
  
  let totalFiles = 0;
  let syncedFiles = 0;
  
  for (const workspacePath of WORKSPACE_PATHS) {
    if (!fs.existsSync(workspacePath)) {
      console.log(`⚠️ Workspace not found: ${workspacePath}`);
      continue;
    }
    
    const agent = AGENT_MAP[path.basename(workspacePath)] || 'system';
    console.log(`\n📂 Processing ${agent} workspace: ${workspacePath}`);
    
    // Sync MEMORY.md file
    const memoryMdPath = path.join(workspacePath, 'MEMORY.md');
    if (fs.existsSync(memoryMdPath)) {
      try {
        const content = fs.readFileSync(memoryMdPath, 'utf8');
        const stats = fs.statSync(memoryMdPath);
        
        await db.upsertMemoryFile({
          name: `${agent}-MEMORY.md`,
          agent: agent,
          content: content,
          path: 'workspace',
          size: content.length,
          updated_at: stats.mtime.toISOString()
        });
        
        console.log(`  ✅ Synced MEMORY.md (${content.length} bytes)`);
        syncedFiles++;
        totalFiles++;
      } catch (error) {
        console.log(`  ❌ Failed to sync MEMORY.md: ${error.message}`);
        totalFiles++;
      }
    }
    
    // Sync memory/ directory files
    const memoryDirPath = path.join(workspacePath, 'memory');
    if (fs.existsSync(memoryDirPath)) {
      const memoryFiles = fs.readdirSync(memoryDirPath);
      
      for (const filename of memoryFiles) {
        if (!filename.endsWith('.md')) continue;
        
        const filePath = path.join(memoryDirPath, filename);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const stats = fs.statSync(filePath);
          
          await db.upsertMemoryFile({
            name: `${agent}-${filename}`,
            agent: agent,
            content: content,
            path: 'workspace/memory',
            size: content.length,
            updated_at: stats.mtime.toISOString()
          });
          
          console.log(`  ✅ Synced ${filename} (${content.length} bytes)`);
          syncedFiles++;
          totalFiles++;
        } catch (error) {
          console.log(`  ❌ Failed to sync ${filename}: ${error.message}`);
          totalFiles++;
        }
      }
    }
    
    // Sync learning files
    const learningsPath = path.join(workspacePath, '.learnings');
    if (fs.existsSync(learningsPath)) {
      const learningFiles = fs.readdirSync(learningsPath).filter(f => f.endsWith('.md'));
      
      for (const filename of learningFiles) {
        const filePath = path.join(learningsPath, filename);
        
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const stats = fs.statSync(filePath);
          
          await db.upsertMemoryFile({
            name: `${agent}-learning-${filename}`,
            agent: agent,
            content: content,
            path: 'workspace/.learnings',
            size: content.length,
            updated_at: stats.mtime.toISOString()
          });
          
          console.log(`  ✅ Synced learning ${filename} (${content.length} bytes)`);
          syncedFiles++;
          totalFiles++;
        } catch (error) {
          console.log(`  ❌ Failed to sync learning ${filename}: ${error.message}`);
          totalFiles++;
        }
      }
    }
  }
  
  // Add system summary file
  try {
    const systemSummary = generateSystemSummary();
    await db.upsertMemoryFile({
      name: 'system-summary.md',
      agent: 'system',
      content: systemSummary,
      path: 'system',
      size: systemSummary.length,
      updated_at: new Date().toISOString()
    });
    
    console.log(`  ✅ Generated system summary (${systemSummary.length} bytes)`);
    syncedFiles++;
    totalFiles++;
  } catch (error) {
    console.log(`  ❌ Failed to create system summary: ${error.message}`);
    totalFiles++;
  }
  
  console.log(`\n🎉 Memory sync complete!`);
  console.log(`📊 Results: ${syncedFiles}/${totalFiles} files synced successfully`);
  
  // Test the API
  console.log(`\n🧪 Testing memory API...`);
  try {
    const memoryFiles = await db.getMemoryFiles();
    console.log(`✅ API test successful: ${memoryFiles.length} files returned`);
    
    // Show sample files
    if (memoryFiles.length > 0) {
      console.log(`\n📋 Sample files:`);
      memoryFiles.slice(0, 3).forEach(file => {
        console.log(`  - ${file.name} (${file.agent}, ${file.size} bytes)`);
      });
    }
  } catch (error) {
    console.log(`❌ API test failed: ${error.message}`);
  }
}

function generateSystemSummary() {
  return `# Fletcher-Sawyer-Celeste System Summary

## System Architecture
Multi-agent AI system with specialized roles:
- **Fletcher**: Policy authority, exception handler, weekly calibrator
- **Sawyer**: Daily operator, context observer, task dispatcher  
- **Celeste**: Builder, coder, implementation specialist

## Recently Deployed Skills
### March 21, 2026
1. **Multi-Agent Learning System**: Systematic improvement through pattern recognition
2. **Mission Control Task Manager**: Natural language task coordination
3. **Browser Automation Skills**: Safe browser control and frontend verification

## Current Capabilities
- **Natural Language Task Management**: "add task: fix bug" instead of API calls
- **Learning Pattern Recognition**: Automatic detection of recurring coordination issues
- **Cross-Agent Knowledge Sharing**: Learnings propagate between agents
- **Rule Generation**: System suggests AGENTS.md improvements based on patterns

## System Health
- **Skills Deployed**: 5+ production skills across all agents
- **Learning Entries**: 7+ patterns captured with rule suggestions
- **Task Management**: Active natural language coordination
- **Memory Sync**: Automated workspace file synchronization

Generated: ${new Date().toISOString()}
`;
}

if (require.main === module) {
  syncMemoryFiles().catch(error => {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  });
}

module.exports = { syncMemoryFiles };