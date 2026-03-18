CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core Mission Control tables
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

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT,
  summary TEXT NOT NULL,
  topics TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  source TEXT
);

CREATE TABLE IF NOT EXISTS costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  calculated_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_status (
  agent TEXT PRIMARY KEY,
  status TEXT,
  current_task TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS override_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT,
  task_description TEXT,
  risk_level TEXT,
  outcome TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports system
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  goal TEXT,
  summary TEXT,
  existing_state TEXT,
  implemented_changes TEXT,
  agent_assignments TEXT,
  escalations TEXT,
  timeline TEXT,
  memories_added TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  created_by TEXT,
  submitted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_addendums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fletcher_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE REFERENCES reports(id) ON DELETE CASCADE,
  audit_content TEXT,
  suggestions_for_team TEXT,
  suggestions_per_agent TEXT,
  rules_compliance TEXT,
  scope_assessment TEXT,
  performance_assessment TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_created_at_idx ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS report_addendums_report_id_idx ON report_addendums(report_id, created_at DESC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE override_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_addendums ENABLE ROW LEVEL SECURITY;
ALTER TABLE fletcher_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON tasks;
DROP POLICY IF EXISTS "Allow all for service role" ON conversations;
DROP POLICY IF EXISTS "Allow all for service role" ON costs;
DROP POLICY IF EXISTS "Allow all for service role" ON agent_status;
DROP POLICY IF EXISTS "Allow all for service role" ON override_log;
DROP POLICY IF EXISTS "Allow all for service role" ON reports;
DROP POLICY IF EXISTS "Allow all for service role" ON report_addendums;
DROP POLICY IF EXISTS "Allow all for service role" ON fletcher_audits;

CREATE POLICY "Allow all for service role" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON agent_status FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON override_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON report_addendums FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON fletcher_audits FOR ALL USING (true) WITH CHECK (true);
