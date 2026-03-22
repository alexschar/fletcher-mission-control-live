CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS project_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'blocked')),
  last_update TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS project_status_updated_at_idx ON project_status(updated_at DESC);

ALTER TABLE project_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service role" ON project_status;
CREATE POLICY "Allow all for service role" ON project_status FOR ALL USING (true) WITH CHECK (true);

INSERT INTO project_status (project_name, status, last_update, updated_by)
SELECT seed.project_name, seed.status, seed.last_update, seed.updated_by
FROM (
  VALUES
    ('Neon Pastoral', 'active', 'Unity optimization phases 2-3 complete, enemy AI gameplay fixes in progress', 'Alex'),
    ('Mission Control', 'active', 'agent dashboard, project page being built', 'Celeste'),
    ('Portfolio', 'active', 'software portfolio site in progress', 'Alex'),
    ('Content Pipeline', 'active', 'Telegram bot running, social metrics polling', 'Sawyer'),
    ('OpenClaw Agent System', 'active', '3 agents operational, operating model reset today', 'Fletcher')
) AS seed(project_name, status, last_update, updated_by)
WHERE NOT EXISTS (SELECT 1 FROM project_status existing WHERE existing.project_name = seed.project_name);
