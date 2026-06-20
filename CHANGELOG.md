# Changelog

All notable changes to Chhummy Tracker will be documented here.
Format: `[version or date] — what changed and why.`

---

## [2026-06-20] — Project Harness Setup

### Added
- `CLAUDE.md` — AI working rules, game rules reference, architecture notes, known bugs, design constraints
- `TODO.md` — Full task backlog: bugs, features, stats system, share card, cleanup, security audit
- `.claude/commands/dev.md` — `/dev` skill to start Vite dev server
- `.claude/commands/deploy.md` — `/deploy` skill for git push → Vercel flow
- `.claude/commands/plan.md` — `/plan` skill to review TODO and propose next task for approval
- `.claude/memory/` — Knowledge base: project context, user preferences, feedback rules, architecture notes
- `.claude/settings.json` — Stop hook: reminds Claude to update knowledge base after every session

### Notes
- No app code changed. This entry covers tooling and AI harness only.
- App is deployed on Vercel via GitHub (kushagraarora997/ChhummyScoreTrackerApp).

---

<!-- New entries go at the top, above this line -->
