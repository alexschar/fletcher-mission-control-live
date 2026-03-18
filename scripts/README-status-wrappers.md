# Agent Status Wrappers

These wrappers provide automatic status reporting for all three agents using the existing Mission Control `/api/agents` endpoint.

## Files
- `report-status.js` — low-level status reporter
- `sawyer-wrapper.sh` — wraps Sawyer task execution
- `fletcher-wrapper.sh` — wraps Fletcher policy execution
- `celeste-wrapper.sh` — wraps Celeste build execution

## Behavior
Each wrapper:
1. Reports `working` before the command starts
2. Reports `idle` if the command exits successfully
3. Reports `error` if the command fails
4. Falls back gracefully if the API is unavailable

## Usage

### Sawyer
```bash
./scripts/sawyer-wrapper.sh "Fix dashboard issue" /bin/sh -lc 'echo done'
```

### Fletcher
```bash
./scripts/fletcher-wrapper.sh "Review override request" /bin/sh -lc 'echo policy complete'
```

### Celeste
```bash
./scripts/celeste-wrapper.sh "build health page" /bin/sh -lc 'echo build complete'
```

## Notes
- Rate limiting is enforced server-side
- Heartbeats can still be sent with `node scripts/report-status.js <agent> <status> --heartbeat`
- OpenClaw core was not modified; this is an application-layer wrapper approach per Fletcher's guidance
