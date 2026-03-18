# Health API Fix - Manual Step Required

The Health API has been migrated from filesystem to Supabase, but the `health_audits` table needs to be created manually.

## What Was Fixed

1. **Health API** (`app/api/health/route.js`)
   - Migrated from filesystem storage to Supabase
   - Now uses `getHealthAudits()` and `addHealthAudit()` functions
   - Works on Vercel's read-only filesystem

2. **Supabase Functions** (`lib/supabase.js`)
   - Added `getHealthAudits(limit)` - retrieves health audits
   - Added `addHealthAudit(audit)` - creates new health audit

3. **Status API** (`app/api/status/route.js`)
   - Fixed missing `await` on `getAllAgentStatuses()`
   - Fixed missing `await` on `updateAgentStatus()`

## Manual Step: Create the Table

Please run this SQL in your Supabase SQL Editor:

```sql
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_health_audits_agent ON health_audits(agent);
CREATE INDEX IF NOT EXISTS idx_health_audits_timestamp ON health_audits(timestamp DESC);
```

## After Creating the Table

Once the table is created, the Health API will work immediately. Test it with:

```bash
curl -X GET "https://fletcher-mission-control-live.vercel.app/api/health" \
  -H "Authorization: Bearer mc_test_token_12345"
```

## Files Changed

- `app/api/health/route.js` - Migrated to Supabase
- `app/api/status/route.js` - Fixed missing await
- `lib/supabase.js` - Added health audit functions
- `scripts/setup-health-table.js` - Setup script (requires manual SQL)
