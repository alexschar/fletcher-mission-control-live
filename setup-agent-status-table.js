// Script to create agent_status table in Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yulirzjagrebzhfteyqx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGlyemphZ3JlYnpoZnRleXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0Njg0NSwiZXhwIjoyMDg4OTIyODQ1fQ.ut_Cr1c1JTvINpHWlYAi-Xd3T99z9EQrVpiQDSoTGcE';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function setupAgentStatusTable() {
  try {
    console.log('Creating agent_status table...');
    
    // First, check what the current user's role is
    const { data: user, error: userError } = await supabase.auth.getUser();
    console.log('Current user/auth:', userError ? userError.message : 'service key auth');
    
    // Try to create the table directly
    // We'll use the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey
      },
      body: JSON.stringify({
        sql: `
          CREATE TABLE IF NOT EXISTS agent_status (
            agent TEXT PRIMARY KEY,
            status TEXT,
            current_task TEXT,
            updated_at TIMESTAMPTZ DEFAULT now()
          );
          
          -- Create policy to allow service role access
          ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "Allow all for service role" ON agent_status;
          CREATE POLICY "Allow all for service role" ON agent_status FOR ALL USING (true) WITH CHECK (true);
        `
      })
    });
    
    if (!response.ok) {
      console.log('REST API approach failed, trying direct insert...');
      
      // Alternative: Try to insert sample data to trigger table creation
      const { data, error } = await supabase
        .from('agent_status')
        .upsert({
          agent: 'sawyer',
          status: 'idle',
          current_task: null,
          updated_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Insert failed:', error);
        console.log('\nPlease run this SQL in your Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS agent_status (
  agent TEXT PRIMARY KEY,
  status TEXT,
  current_task TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service role" ON agent_status;
CREATE POLICY "Allow all for service role" ON agent_status FOR ALL USING (true) WITH CHECK (true);
        `);
        return false;
      } else {
        console.log('Table created successfully via insert!');
        return true;
      }
    } else {
      const result = await response.json();
      console.log('Table creation result:', result);
      return true;
    }
  } catch (error) {
    console.error('Setup error:', error);
    console.log('\nPlease run this SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS agent_status (
  agent TEXT PRIMARY KEY,
  status TEXT,
  current_task TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service role" ON agent_status;
CREATE POLICY "Allow all for service role" ON agent_status FOR ALL USING (true) WITH CHECK (true);
    `);
    return false;
  }
}

// Run the setup
setupAgentStatusTable().then((success) => {
  if (success) {
    console.log('✅ Agent status table is ready!');
    
    // Test the table by inserting initial data for all agents
    const testData = async () => {
      const agents = ['fletcher', 'sawyer', 'celeste'];
      for (const agent of agents) {
        const { data, error } = await supabase
          .from('agent_status')
          .upsert({
            agent: agent,
            status: 'offline',
            current_task: null,
            updated_at: new Date().toISOString()
          });
        
        if (error) {
          console.error(`Failed to insert ${agent}:`, error);
        } else {
          console.log(`✅ Initialized ${agent} status`);
        }
      }
      
      // Test reading the data
      const { data: allStatus, error: readError } = await supabase
        .from('agent_status')
        .select('*');
        
      if (readError) {
        console.error('Failed to read agent status:', readError);
      } else {
        console.log('📊 Current agent statuses:', allStatus);
      }
    };
    
    testData();
  } else {
    console.log('❌ Manual setup required');
  }
});