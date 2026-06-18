-- Migration: Create agent_preferences tables
-- Created: 2025-06-18
-- Tables: agent_actions, agent_learnings

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: agent_actions
-- Tracks actions taken by agents
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL CHECK (agent IN ('sawyer', 'celeste', 'fletcher')),
  action TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: agent_learnings
-- Stores agent learnings and preferences
CREATE TABLE IF NOT EXISTS agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'process', 'preference', 'error', 'pattern')),
  content TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS agent_actions_agent_idx ON agent_actions(agent);
CREATE INDEX IF NOT EXISTS agent_actions_status_idx ON agent_actions(status);
CREATE INDEX IF NOT EXISTS agent_actions_created_at_idx ON agent_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS agent_learnings_agent_idx ON agent_learnings(agent);
CREATE INDEX IF NOT EXISTS agent_learnings_category_idx ON agent_learnings(category);
CREATE INDEX IF NOT EXISTS agent_learnings_verified_idx ON agent_learnings(verified);
CREATE INDEX IF NOT EXISTS agent_learnings_created_at_idx ON agent_learnings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learnings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow all for service role" ON agent_actions;
DROP POLICY IF EXISTS "Allow all for service role" ON agent_learnings;

-- Create policies for service role access
CREATE POLICY "Allow all for service role" ON agent_actions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON agent_learnings FOR ALL USING (true) WITH CHECK (true);

-- Trigger to auto-update updated_at on agent_learnings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agent_learnings_updated_at ON agent_learnings;
CREATE TRIGGER update_agent_learnings_updated_at
  BEFORE UPDATE ON agent_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
