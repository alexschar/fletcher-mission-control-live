// Script to create health_audits table in Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yulirzjagrebzhfteyqx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGlyemphZ3JlYnpoZnRleXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0Njg0NSwiZXhwIjoyMDg4OTIyODQ1fQ.ut_Cr1c1JTvINpHWlYAi-Xd3T99z9EQrVpiQDSoTGcE';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function setupHealthAuditsTable() {
  try {
    console.log('Creating health_audits table...');
    
    // Try to create the table by inserting a test record
    const testAudit = {
      agent: 'sawyer',
      status: 'green',
      message: 'Test audit - table initialization',
      timestamp: new Date().toISOString(),
      checks: { note: 'initialization' },
      checks_summary: 'initialization'
    };
    
    const { data, error } = await supabase
      .from('health_audits')
      .insert(testAudit)
      .select();
    
    if (error) {
      if (error.message && error.message.includes('does not exist')) {
        console.log('Table does not exist. Please run this SQL in Supabase SQL Editor:');
        console.log(`
CREATE TABLE IF NOT EXISTS health_audits (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  checks JSONB DEFAULT '{}',
  checks_summary TEXT
);

-- Enable RLS
ALTER TABLE health_audits ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
DROP POLICY IF EXISTS "Allow all for service role" ON health_audits;
CREATE POLICY "Allow all for service role" ON health_audits FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_health_audits_agent ON health_audits(agent);
CREATE INDEX IF NOT EXISTS idx_health_audits_timestamp ON health_audits(timestamp DESC);
        `);
        return false;
      } else {
        console.error('Insert failed:', error);
        return false;
      }
    }
    
    // Delete the test record
    await supabase.from('health_audits').delete().eq('id', data[0].id);
    
    console.log('✅ health_audits table is ready!');
    return true;
    
  } catch (error) {
    console.error('Setup error:', error);
    console.log('\nPlease run this SQL in your Supabase SQL Editor:');
    console.log(`
CREATE TABLE IF NOT EXISTS health_audits (
  id SERIAL PRIMARY KEY,
  agent TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  checks JSONB DEFAULT '{}',
  checks_summary TEXT
);

ALTER TABLE health_audits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service role" ON health_audits;
CREATE POLICY "Allow all for service role" ON health_audits FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_health_audits_agent ON health_audits(agent);
CREATE INDEX IF NOT EXISTS idx_health_audits_timestamp ON health_audits(timestamp DESC);
    `);
    return false;
  }
}

// Run the setup
setupHealthAuditsTable().then((success) => {
  if (success) {
    console.log('✅ Health audits table is ready!');
  } else {
    console.log('❌ Manual setup required - see SQL above');
    process.exit(1);
  }
});
