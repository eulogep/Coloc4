<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Coloc4 project rules

- Design source of truth: `docs/phase-0-design.md` (ADRs, data model, open decisions).
- One ticket per branch; implement → verify → report → stop.
- Money is `bigint` minor units end to end; strings across JSON. No floats in `src/modules/*/domain`.
- Household data access is enforced by Postgres RLS + RPCs, never by frontend filtering.
- Test statuses: PASS / FAIL / NOT_RUN / BLOCKED only.
