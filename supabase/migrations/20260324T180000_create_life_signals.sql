-- Life Signals: unified data model for Mission Control v3
-- Every external signal (email, social, calendar, shopping) flows through this table.
-- Agents read and triage signals; Alex provides feedback to train preferences.

CREATE TABLE IF NOT EXISTS life_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,            -- gmail, outlook, calendar, instagram, youtube, tiktok, pinterest, linkedin, amazon
  category TEXT NOT NULL,          -- email, sponsorship, social, shopping, calendar
  signal_type TEXT NOT NULL,       -- new_email, engagement_spike, order_shipped, event_reminder, etc.
  title TEXT NOT NULL,
  body TEXT,                       -- Sanitized, truncated to 2K chars
  metadata JSONB DEFAULT '{}',    -- Source-specific structured data
  priority TEXT DEFAULT 'normal',  -- urgent, high, normal, low, dismissed
  status TEXT DEFAULT 'unread',    -- unread, read, acted_on, dismissed
  agent_notes JSONB,              -- STRUCTURED checklist (not freeform). See build plan for schema.
  agent_draft TEXT,               -- Drafted response (email reply, social post, etc.)
  feedback TEXT,                  -- Alex: useful, not_useful, wrong, spam, important
  feedback_note TEXT,             -- Alex's context note for preference learning
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS life_signals_status_idx ON life_signals(status);
CREATE INDEX IF NOT EXISTS life_signals_category_idx ON life_signals(category);
CREATE INDEX IF NOT EXISTS life_signals_source_idx ON life_signals(source);
CREATE INDEX IF NOT EXISTS life_signals_created_at_idx ON life_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS life_signals_priority_idx ON life_signals(priority);

-- RLS
ALTER TABLE life_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service role" ON life_signals;
CREATE POLICY "Allow all for service role" ON life_signals FOR ALL USING (true) WITH CHECK (true);
