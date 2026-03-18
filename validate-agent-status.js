// Validation script for agent status system
const { getAllAgentStatuses, updateAgentStatus } = require('./lib/store');

async function validateAgentStatus() {
  console.log('🔍 Validating Agent Status System...\n');
  
  try {
    // Test 1: Get all agent statuses
    console.log('Test 1: Getting all agent statuses...');
    const statuses = await getAllAgentStatuses();
    
    const requiredAgents = ['fletcher', 'sawyer', 'celeste'];
    const foundAgents = Object.keys(statuses);
    
    console.log(`✅ Found ${foundAgents.length} agents: ${foundAgents.join(', ')}`);
    
    // Check if all required agents are present
    const missingAgents = requiredAgents.filter(agent => !foundAgents.includes(agent));
    if (missingAgents.length > 0) {
      console.log(`❌ Missing agents: ${missingAgents.join(', ')}`);
      return false;
    }
    
    // Validate data structure
    for (const [agentKey, agentData] of Object.entries(statuses)) {
      const requiredFields = ['name', 'id', 'status', 'role'];
      const missingFields = requiredFields.filter(field => !agentData.hasOwnProperty(field));
      
      if (missingFields.length > 0) {
        console.log(`❌ Agent ${agentKey} missing fields: ${missingFields.join(', ')}`);
        return false;
      }
      
      console.log(`  ${agentData.name}: ${agentData.status} (${agentData.currentTask || 'no task'})`);
    }
    
    // Test 2: Update an agent status
    console.log('\nTest 2: Updating agent status...');
    const testAgent = 'sawyer';
    const testStatus = 'working';
    const testTask = 'System validation test';
    
    const updateResult = await updateAgentStatus(testAgent, {
      status: testStatus,
      currentTask: testTask
    });
    
    console.log(`✅ Updated ${updateResult.name}: ${updateResult.status} - "${updateResult.currentTask}"`);
    
    // Test 3: Verify update persisted
    console.log('\nTest 3: Verifying update persistence...');
    const updatedStatuses = await getAllAgentStatuses();
    const updatedAgent = updatedStatuses[testAgent];
    
    if (updatedAgent.status === testStatus && updatedAgent.currentTask === testTask) {
      console.log(`✅ Update persisted correctly`);
    } else {
      console.log(`❌ Update did not persist. Expected: ${testStatus}/"${testTask}", Got: ${updatedAgent.status}/"${updatedAgent.currentTask}"`);
      return false;
    }
    
    // Test 4: Check timestamps
    console.log('\nTest 4: Checking timestamps...');
    const now = new Date();
    const lastSeen = new Date(updatedAgent.lastSeen);
    const timeDiff = Math.abs(now - lastSeen);
    
    if (timeDiff < 60000) { // Less than 1 minute
      console.log(`✅ Timestamp is recent (${Math.round(timeDiff/1000)}s ago)`);
    } else {
      console.log(`⚠️  Timestamp seems old (${Math.round(timeDiff/1000)}s ago)`);
    }
    
    console.log('\n🎉 All tests passed! Agent status system is working correctly.');
    
    // Show current storage method
    console.log('\n📊 Current Data:');
    console.log(JSON.stringify(updatedStatuses, null, 2));
    
    return true;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

// Run validation
validateAgentStatus().then((success) => {
  process.exit(success ? 0 : 1);
});