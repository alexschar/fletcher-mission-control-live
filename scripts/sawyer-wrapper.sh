#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TASK_DESC="${1:-unspecified task}"
shift || true

report_working() {
  node "$SCRIPT_DIR/report-status.js" sawyer working "$TASK_DESC" || true
}

report_idle() {
  node "$SCRIPT_DIR/report-status.js" sawyer idle || true
}

report_error() {
  local code="${1:-1}"
  node "$SCRIPT_DIR/report-status.js" sawyer error "Task failed: $TASK_DESC (exit $code)" || true
}

report_working

if [ "$#" -eq 0 ]; then
  report_idle
  exit 0
fi

set +e
"$@"
EXIT_CODE=$?
set -e

if [ $EXIT_CODE -eq 0 ]; then
  report_idle
else
  report_error "$EXIT_CODE"
fi

exit $EXIT_CODE
