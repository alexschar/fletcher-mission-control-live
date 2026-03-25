# Circle-Back Items

## From Sprint 1
- **CSS scroll bug**: Life Feed page content doesn't scroll smoothly via mouse wheel. The `main` element expands to fit content (1167px) but the page scroll is janky. Likely needs `overflow-y: auto` on the main content container or a layout restructure.
- **Silent error swallowing in `getLifeSignalStats()`**: The stats function destructures `{ count }` from Promise.all results without checking `.error`. If Supabase fails, it returns zeros instead of throwing. Should add error checks.
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`**: Currently set to `sb_publishable_...` which is not a valid Supabase JWT. This doesn't affect anything right now (code only uses the service role key), but should be corrected to the actual anon JWT if client-side Supabase access is ever needed.
- **Agent deployment tasks (Sprint 1 items 14-18)**: These are Alex-side tasks — adding LIFE SIGNALS section to Sawyer AGENTS.md, TOOLS.md curl templates, HEARTBEAT.md updates. Not Cowork scope but worth tracking.
