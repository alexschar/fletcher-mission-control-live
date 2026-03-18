# Supabase Setup Guide

## Current Status

The API wrapper (`lib/supabase.js`) and test script (`scripts/test-supabase.js`) are ready, but the database tables need to be created first.

## Why Tables Don't Exist Yet

The Supabase REST API (PostgREST) doesn't support DDL statements (CREATE TABLE, ALTER TABLE, etc.). Tables must be created through:
1. Supabase Dashboard SQL Editor
2. Supabase CLI migrations
3. Direct PostgreSQL connection

## Option 1: Create Tables via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/yulirzjagrebzhfteyqx/sql
2. Copy and paste the contents of `supabase/migrations/20260318T144438_create_tables.sql`
3. Click "Run"

## Option 2: Create Tables via Supabase CLI

```bash
# Install Supabase CLI if not already
npm install -g supabase-cli

# Link to project (requires Supabase account access)
cd ~/mission-control
npx supabase link --project-ref yulirzjagrebzhfteyqx

# Push migrations
npx supabase db push
```

## Option 3: Provide Database Credentials

If you have the Supabase database password, I can connect directly:

1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the connection string or password
3. Provide it to me so I can create the tables

## After Tables Are Created

Run the test script:

```bash
cd ~/mission-control
node scripts/test-supabase.js
```

## Files Created

- `lib/supabase.js` - API wrapper with all required functions
- `scripts/test-supabase.js` - Test script
- `supabase/migrations/20260318T144438_create_tables.sql` - SQL migration file
