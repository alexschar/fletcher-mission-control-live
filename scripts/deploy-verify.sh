#!/bin/bash
# scripts/deploy-verify.sh
# Celeste runs this as her LAST step after ANY Mission Control change.
# Usage: bash scripts/deploy-verify.sh /tasks
#        bash scripts/deploy-verify.sh /agents
#        bash scripts/deploy-verify.sh /schedule /reports /costs
#
# Exit 0 = PASS (safe to report "done")
# Exit 1 = FAIL (fix the issue, then run again)

set -euo pipefail

PROD_URL="https://fletcher-mission-control-live.vercel.app"
API_TOKEN="mc_test_token_12345"
FAIL=0

echo "╔══════════════════════════════════════╗"
echo "║   DEPLOYMENT VERIFICATION PROTOCOL   ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Step 1: Uncommitted changes ──
echo "── Step 1: Checking working tree ──"
if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "❌ FAIL: Uncommitted changes detected:"
  git status --short
  echo ""
  echo "Fix: git add . && git commit -m 'your message'"
  FAIL=1
else
  echo "✅ Working tree clean"
fi
echo ""

# ── Step 2: Unpushed commits ──
echo "── Step 2: Checking for unpushed commits ──"
LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "none")
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "❌ FAIL: Local commits not pushed to remote"
  echo "   Local:  $LOCAL"
  echo "   Remote: $REMOTE"
  echo ""
  echo "Fix: git push"
  FAIL=1
else
  echo "✅ All commits pushed (HEAD: ${LOCAL:0:7})"
fi
echo ""

# ── Step 3: Wait for Vercel deployment ──
echo "── Step 3: Waiting 90 seconds for Vercel deployment ──"
echo -n "   Waiting"
for i in $(seq 1 18); do
  sleep 5
  echo -n "."
done
echo " done"
echo ""

# ── Step 4: Test production API ──
echo "── Step 4: Testing production API ──"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $API_TOKEN" \
  "$PROD_URL/api/status" 2>/dev/null || echo "000")
if [ "$API_STATUS" != "200" ]; then
  echo "❌ FAIL: Production API returned HTTP $API_STATUS"
  echo "   URL: $PROD_URL/api/status"
  FAIL=1
else
  echo "✅ Production API responding (HTTP $API_STATUS)"
fi
echo ""

# ── Step 5: Test specific pages ──
if [ $# -gt 0 ]; then
  echo "── Step 5: Testing page endpoints ──"
  for PAGE in "$@"; do
    PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      "$PROD_URL$PAGE" 2>/dev/null || echo "000")
    if [ "$PAGE_STATUS" != "200" ]; then
      echo "❌ FAIL: $PAGE returned HTTP $PAGE_STATUS"
      FAIL=1
    else
      echo "✅ $PAGE responding (HTTP $PAGE_STATUS)"
    fi
  done
  echo ""
fi

# ── Step 6: Test specific API endpoints for the changed pages ──
echo "── Step 6: Testing related API endpoints ──"
for PAGE in "$@"; do
  case "$PAGE" in
    /tasks)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/tasks" 2>/dev/null || echo "000")
      echo "   /api/tasks → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
    /schedule)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/schedule" 2>/dev/null || echo "000")
      echo "   /api/schedule → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
    /reports*)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/reports" 2>/dev/null || echo "000")
      echo "   /api/reports → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
    /costs)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/costs" 2>/dev/null || echo "000")
      echo "   /api/costs → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
    /agents)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/agents" 2>/dev/null || echo "000")
      echo "   /api/agents → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
    /health)
      EP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $API_TOKEN" \
        "$PROD_URL/api/health" 2>/dev/null || echo "000")
      echo "   /api/health → HTTP $EP_STATUS"
      [ "$EP_STATUS" != "200" ] && FAIL=1
      ;;
  esac
done
echo ""

# ── Final Result ──
echo "════════════════════════════════════════"
if [ $FAIL -eq 0 ]; then
  echo "✅ VERIFICATION PASSED"
  echo "   Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
  echo "   Time:   $(date '+%Y-%m-%d %H:%M:%S %Z')"
  echo "   Prod:   $PROD_URL"
  echo ""
  echo "Safe to report task as DONE."
  exit 0
else
  echo "❌ VERIFICATION FAILED"
  echo "   Fix the issues above, then run this script again."
  echo "   Do NOT report the task as done."
  exit 1
fi
