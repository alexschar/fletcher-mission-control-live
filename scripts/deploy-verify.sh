#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: bash scripts/deploy-verify.sh /tasks|/schedule|/reports|/app"
  exit 1
fi

BASE_URL="${MISSION_CONTROL_BASE_URL:-https://fletcher-mission-control-live.vercel.app}"
TOKEN="${MISSION_CONTROL_TOKEN:-mc_test_token_12345}"
ACTOR="${MISSION_CONTROL_ACTOR:-sawyer}"
COMMIT_HASH="$(git rev-parse HEAD)"
SHORT_HASH="$(git rev-parse --short HEAD)"
FAIL=0

api() {
  curl -fsS "$@" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-mc-actor: $ACTOR"
}

page_status() {
  curl -sS -o /tmp/mc-verify-body.txt -w "%{http_code}" "$1"
}

assert_page_ok() {
  local url="$1"
  local code
  code="$(page_status "$url")"
  if [[ "$code" != "200" ]]; then
    echo "❌ FAIL: $url returned HTTP $code"
    sed -n '1,40p' /tmp/mc-verify-body.txt || true
    exit 1
  fi
  echo "✅ $url responding (HTTP 200)"
}

assert_json_array() {
  node -e 'const raw=process.argv[1]; const data=JSON.parse(raw); if(!Array.isArray(data)) { console.error("Expected array JSON"); process.exit(1); } console.log(`Array length: ${data.length}`);' "$1"
}

echo "╔══════════════════════════════════════╗"
echo "║   DEPLOYMENT VERIFICATION PROTOCOL   ║"
echo "╚══════════════════════════════════════╝"
echo ""

echo "── Step 1: Checking working tree ──"
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "❌ FAIL: Uncommitted changes detected:"
  git status --short
  FAIL=1
else
  echo "✅ Working tree clean"
fi
echo ""

echo "── Step 2: Checking for unpushed commits ──"
LOCAL="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
REMOTE="$(git rev-parse @{u} 2>/dev/null || echo none)"
if [[ "$LOCAL" != "$REMOTE" ]]; then
  echo "❌ FAIL: Local commits not pushed to remote"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE"
  FAIL=1
else
  echo "✅ All commits pushed (HEAD: ${SHORT_HASH})"
fi
echo ""

if [[ $FAIL -ne 0 ]]; then
  echo "❌ VERIFICATION FAILED"
  exit 1
fi

echo "── Step 3: Waiting 30 seconds for Vercel deployment ──"
sleep 30
echo "✅ Wait complete"
echo ""

echo "── Step 4: Testing production API health ──"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/status" 2>/dev/null || echo "000")
if [[ "$API_STATUS" != "200" ]]; then
  echo "❌ FAIL: Production API returned HTTP $API_STATUS"
  exit 1
fi
echo "✅ Production API responding (HTTP $API_STATUS)"
echo ""

verify_tasks() {
  echo "── Verifying /tasks ──"
  assert_page_ok "$BASE_URL/tasks"
  local created id moved deleted
  created="$(api -X POST "$BASE_URL/api/tasks" -H 'Content-Type: application/json' --data '{"title":"Verify task '$SHORT_HASH'","description":"deploy-verify","status":"backlog"}')"
  assert_json_array "$created"
  id="$(node -e 'const data=JSON.parse(process.argv[1]); const item=data.find(t=>String(t.title||"")==process.argv[2]); if(!item?.id){process.exit(1)} console.log(item.id)' "$created" "Verify task $SHORT_HASH")"
  moved="$(api -X POST "$BASE_URL/api/tasks" -H 'Content-Type: application/json' --data '{"action":"update","id":"'$id'","updates":{"status":"in_progress"}}')"
  node -e 'const data=JSON.parse(process.argv[1]); const item=data.find(t=>String(t.id)===process.argv[2]); if(!item||item.status!=="in_progress"){console.error("Task move failed");process.exit(1)} console.log("✅ Move verified")' "$moved" "$id"
  deleted="$(api -X POST "$BASE_URL/api/tasks" -H 'Content-Type: application/json' --data '{"action":"delete","id":"'$id'"}')"
  node -e 'const data=JSON.parse(process.argv[1]); if(data.some(t=>String(t.id)===process.argv[2])){console.error("Task delete failed");process.exit(1)} console.log("✅ Delete verified")' "$deleted" "$id"
}

verify_schedule() {
  echo "── Verifying /schedule ──"
  assert_page_ok "$BASE_URL/schedule"
  local before created id paused resumed name
  name="verify-job-$SHORT_HASH-$(date +%s)"
  before="$(api "$BASE_URL/api/schedule")"
  assert_json_array "$before"
  created="$(api -X POST "$BASE_URL/api/schedule" -H 'Content-Type: application/json' --data '{"name":"'$name'","schedule":"Every 15m","description":"deploy-verify","status":"active","lastRun":null}')"
  assert_json_array "$created"
  id="$(node -e 'const data=JSON.parse(process.argv[1]); const item=data.find(x=>String(x.name)===process.argv[2]); if(!item?.id){process.exit(1)} console.log(item.id)' "$created" "$name")"
  paused="$(api -X POST "$BASE_URL/api/schedule" -H 'Content-Type: application/json' --data '{"action":"update","id":"'$id'","updates":{"status":"paused"}}')"
  node -e 'const data=JSON.parse(process.argv[1]); const item=data.find(x=>String(x.id)===process.argv[2]); if(!item||item.status!=="paused"){console.error("Pause failed");process.exit(1)} console.log("✅ Pause verified")' "$paused" "$id"
  resumed="$(api -X POST "$BASE_URL/api/schedule" -H 'Content-Type: application/json' --data '{"action":"update","id":"'$id'","updates":{"status":"active"}}')"
  node -e 'const data=JSON.parse(process.argv[1]); const item=data.find(x=>String(x.id)===process.argv[2]); if(!item||item.status!=="active"){console.error("Resume failed");process.exit(1)} console.log("✅ Resume verified")' "$resumed" "$id"
}

verify_reports() {
  echo "── Verifying /reports addendums ──"
  assert_page_ok "$BASE_URL/reports"
  local reports report_id before post after unique_note
  reports="$(api "$BASE_URL/api/reports")"
  report_id="$(node -e 'const data=JSON.parse(process.argv[1]); if(!Array.isArray(data)||!data[0]?.id){console.error("No reports found"); process.exit(1)} console.log(data[0].id)' "$reports")"
  before="$(api "$BASE_URL/api/reports/$report_id/addendums")"
  assert_json_array "$before"
  unique_note="verification-addendum-$SHORT_HASH-$(date +%s)"
  post="$(api -X POST "$BASE_URL/api/reports/$report_id/addendums" -H 'Content-Type: application/json' --data '{"content":"'$unique_note'"}')"
  node -e 'const item=JSON.parse(process.argv[1]); if(!item?.id || item.content !== process.argv[2]){console.error("Addendum POST failed");process.exit(1)} console.log("✅ Addendum POST verified")' "$post" "$unique_note"
  after="$(api "$BASE_URL/api/reports/$report_id/addendums")"
  node -e 'const data=JSON.parse(process.argv[1]); if(!Array.isArray(data) || !data.some(x=>x.content===process.argv[2])){console.error("Addendum GET after POST failed");process.exit(1)} console.log("✅ Addendum GET verified")' "$after" "$unique_note"
}

verify_error_boundaries() {
  echo "── Verifying app-wide error boundary coverage ──"
  assert_page_ok "$BASE_URL/agents"
  assert_page_ok "$BASE_URL/tasks"
  assert_page_ok "$BASE_URL/schedule"
  assert_page_ok "$BASE_URL/reports"
  test -f app/error.jsx
  test -f app/global-error.jsx
  test -f app/components/AppErrorBoundary.jsx
  echo "✅ Error boundary files present in commit and core pages return 200"
}

for PAGE in "$@"; do
  case "$PAGE" in
    /tasks)
      verify_tasks
      ;;
    /schedule)
      verify_schedule
      ;;
    /reports)
      verify_reports
      ;;
    /app|/)
      verify_error_boundaries
      ;;
    *)
      echo "❌ Unsupported page: $PAGE"
      exit 1
      ;;
  esac
  echo ""
done

echo "✅ VERIFICATION PASSED"
echo "Commit: $COMMIT_HASH"
echo "Pages: $*"
echo "Production: $BASE_URL"
