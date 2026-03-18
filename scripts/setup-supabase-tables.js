// Setup script to create tables using SQL execution
// This attempts to create tables through various methods

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yulirzjagrebzhfteyqx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGlyemphZ3JlYnpoZnRleXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0Njg0NSwiZXhwIjoyMDg4OTIyODQ1fQ.ut_Cr1c1JTvINpHWlYAi-Xd3T99z9EQrVpiQDSoTGcE';

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const createTablesSQL = `
-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'backlog',
  assigned_to TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  priority TEXT DEFAULT 'medium'
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT,
  summary TEXT NOT NULL,
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  source TEXT
);

-- Create costs table
CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  calculated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create agent_status table
CREATE TABLE IF NOT EXISTS agent_status (
  agent TEXT PRIMARY KEY,
  status TEXT,
  current_task TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create override_log table
CREATE TABLE IF NOT EXISTS override_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT,
  task_description TEXT,
  risk_level TEXT,
  outcome TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for service role)
CREATE POLICY "Allow all for service role" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON agent_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON override_log FOR ALL USING (true) WITH CHECK (true);
`;

async function setupTables() {
  console.log('Attempting to create tables...');
  
  // Try using rpc to execute SQL if there's a function available
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: createTablesSQL });
    
    if (error) {
      console.log('RPC method failed:', error.message);
    } else {
      console.log('Tables created via RPC:', data);
      return;
    }
  } catch (e) {
    console.log('RPC error:', e.message);
  }
  
  // Alternative: Try direct table creation via POST (won't work but let's try)
  console.log('Trying alternative methods...');
  
  // Since we can't execute SQL directly, let's create a migration file
  const fs = require('fs');
  const path = require('path');
  
  const migrationDir = path.join(__dirname, '..', 'supabase', 'migrations');
  fs.mkdirSync(migrationDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const migrationFile = path.join(migrationDir, `${timestamp}_create_tables.sql`);
  
  fs.writeFileSync(migrationFile, createTablesSQL);
  console.log('Migration file created:', migrationFile);
  console.log('\nTo apply the migration, run:');
  console.log('  npx supabase db push');
  console.log('Or manually execute the SQL in the Supabase SQL editor.');
}

setupTables().then(() => {
  console.log('\nSetup attempt complete.');
  process.exit(0);
}).catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
