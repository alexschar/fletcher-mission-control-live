# Circle-Back Items

## From Sprint 1
- ~~**CSS scroll bug**~~: ✅ Fixed in Sprint 2 commit — changed `html, body { height: 100% }` to `html { height: 100% }` + `body { min-height: 100% }`
- ~~**Silent error swallowing in `getLifeSignalStats()`**~~: ✅ Fixed in Sprint 2 commit — now checks `.error` on each result and throws
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`**: Currently set to `sb_publishable_...` which is not a valid Supabase JWT. This doesn't affect anything right now (code only uses the service role key), but should be corrected to the actual anon JWT if client-side Supabase access is ever needed.
- **Agent deployment tasks (Sprint 1 items 14-18)**: These are Alex-side tasks — adding LIFE SIGNALS section to Sawyer AGENTS.md, TOOLS.md curl templates, HEARTBEAT.md updates. Not Cowork scope but worth tracking.

## From Sprint 2
- **Alex-side: email-signals.js fetcher** (Task 22): Write Gmail + Outlook fetcher script for Mac Mini cron
- **Alex-side: prompt injection detection** (Task 23): Implement detection layer for email content
- **Alex-side: 5-minute cron setup** (Task 24): Configure cron on Mac Mini for email fetcher
- **Alex-side: Telegram alert format** (Task 25): Configure alert format with feedback prompt
- **Agent-side: Sawyer HEARTBEAT.md** (Task 26): Add email triage heartbeat step
- **Agent-side: feedback collection + Fletcher calibration** (Tasks 27-28): Feedback loop and weekly calibration
- **Seed real email data**: Once email fetcher is running, verify /email page renders real signals correctly
