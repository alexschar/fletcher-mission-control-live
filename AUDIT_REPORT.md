# Mission Control Board Audit Report

**Date:** 2026-03-18  
**Auditor:** Sawyer  
**Scope:** Full system audit of Mission Control dashboard

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| Core APIs | ⚠️ PARTIAL | Health API broken on Vercel |
| Data Layer | ✅ WORKING | Supabase + JSON fallback functional |
| UI Pages | ✅ WORKING | All pages render correctly |
| Authentication | ✅ WORKING | Token-based auth functional |
| Reports System | ✅ WORKING | Auto-submit, notifications working |

---

## Critical Issues Found

### 1. Health API - BROKEN on Vercel (HIGH PRIORITY)

**File:** `app/api/health/route.js`

**Problem:** The health endpoint attempts to write to the filesystem:
```javascript
const DATA_FILE = path.join(process.cwd(), 'data', 'health_audits.json');
// ...
fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
```

**Error on Vercel:**
```
{"error":"EROFS: read-only file system, open '/var/task/data/health_audits.json'"}
```

**Impact:** Health monitoring page is non-functional in production.

**Fix Required:** Migrate health audits to Supabase (like agent_status, reports, etc.)

---

### 2. Agent Status API - Missing await (MEDIUM PRIORITY)

**File:** `app/api/status/route.js`

**Problem:** GET handler calls async function without await:
```javascript
export async function GET(request) {
  // ...
  const statuses = getAllAgentStatuses();  // Missing await!
  return NextResponse.json(statuses);
}
```

**Impact:** May return Promise instead of data in some cases.

**Fix Required:** Add `await` before `getAllAgentStatuses()`

---

### 3. Store.js - FileSystem Writes Won't Persist (LOW PRIORITY)

**File:** `lib/store.js`

**Problem:** Functions like `writeJSON` use filesystem:
```javascript
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}
```

**Impact:** On Vercel, these writes are ephemeral (lost on next deploy/cold start). However, the Supabase fallback is working, so this only affects local development.

**Status:** Acceptable - Supabase fallback handles production.

---

## Working Features

### ✅ Authentication System
- Token-based auth with `MC_AUTH_TOKEN`
- Login page stores token in localStorage
- All API routes protected with `authMiddleware`

### ✅ Agent Status
- Supabase-backed agent status persistence
- Stale/offline detection (15min/60min thresholds)
- Real-time updates via polling

### ✅ Task Board
- Full CRUD operations
- Kanban columns: Backlog, In Progress, Review, Done
- Supabase + JSON fallback working

### ✅ Cost Tracker
- Daily/monthly spend tracking
- Budget alerts (green/yellow/red)
- SVG spend chart

### ✅ Reports System
- Auto-submitted reports (no drafts)
- Notification badges (blue=new report, purple=new audit)
- Sidebar notification count
- Fletcher audit section (Alex/Fletcher only)

### ✅ Conversations & Overrides
- Both pages functional
- Filtering by agent, topic, outcome, tier
- StatusCard component working

### ✅ Memory Viewer
- Supabase-backed memory files
- Agent filtering
- Search functionality

### ✅ Schedule
- Static schedule display
- Shows configured cron jobs

---

## API Test Results

| Endpoint | Status | Response |
|----------|--------|----------|
| GET /api/agents | ✅ | Returns agent statuses |
| GET /api/tasks | ✅ | Returns tasks array |
| GET /api/costs | ✅ | Returns cost summary |
| GET /api/reports | ✅ | Returns reports |
| GET /api/conversations | ✅ | Returns conversations |
| GET /api/overrides | ✅ | Returns overrides |
| GET /api/schedule | ✅ | Returns schedule |
| GET /api/memory | ✅ | Returns empty array (no files) |
| GET /api/health | ❌ | EROFS: read-only file system |

---

## Recommendations

### Immediate (Fix Today)
1. **Migrate Health API to Supabase**
   - Create `health_audits` table
   - Update `app/api/health/route.js` to use Supabase
   - Reference pattern: `agent_status` table implementation

2. **Fix Missing await in Status API**
   - Add `await` to `getAllAgentStatuses()` call

### Short Term (This Week)
3. **Add Health Audits Table Migration Script**
   - Create `scripts/setup-health-table.js`
   - Follow pattern from `setup-agent-status-table.js`

4. **Add Data Validation**
   - Some APIs don't validate request body shape
   - Could lead to inconsistent data

### Long Term (Nice to Have)
5. **Consolidate Database Access**
   - Some routes use `lib/store.js`, others use `lib/database.js`
   - Consider standardizing on one pattern

6. **Add API Tests**
   - No automated tests found
   - Consider adding Jest tests for critical paths

---

## Database Schema Status

| Table | Status | Notes |
|-------|--------|-------|
| tasks | ✅ | Working |
| conversations | ✅ | Working |
| costs | ✅ | Working |
| agent_status | ✅ | Working |
| override_log | ✅ | Working |
| memory_files | ✅ | Working |
| reports | ✅ | Working |
| report_addendums | ✅ | Working |
| fletcher_audits | ✅ | Working |
| health_audits | ❌ | **MISSING - Needed for Health API** |

---

## Conclusion

Mission Control is **mostly functional** with one critical issue (Health API). The architecture using Supabase with JSON fallback is working well. The Reports system is fully operational with the notification features you requested.

**Priority Fix:** Migrate Health API from filesystem to Supabase.
