
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
