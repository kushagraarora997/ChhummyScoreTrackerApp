---
name: project-context
description: Chhummy Tracker app purpose, game rules, family context, built vs not-built
metadata:
  type: project
---

App is "Chhummy Tracker" — premium mobile-first PWA for the Arora family's card game nights.
Tagline: "Always Agitated Aroras". Deployed on Vercel, linked to GitHub (kushagraarora997/ChhummyScoreTrackerApp).

**Why:** Family replacement for manual score keeping, WhatsApp spam, mental calculations.

**Game Rules:**
- 6-card Rummy variation, 2–6 players
- Close requires: 1 mandatory pure sequence of 3 + remaining 3 as (pure seq OR trail OR deadwood ≤ 5)
- After close: ALL players reveal; multiple players can score 0 — this is valid and common
- Scores accumulate; 100+ = eliminated
- Closer becomes dealer next round; closer's own score capped at 5 (deadwood was ≤5 to close)
- Last survivor wins

**What's Built:** Player management, live game screen, round flow (end→closer→scores→confirm), elimination modal, winner screen, undo last round, autosave to IndexedDB, PWA.

**What's NOT Built:** Stats writing to DB (schema exists, never used), Hall of Fame real data (hardcoded), Stats page, Session History, Achievements (schema exists), Weekly/Monthly dashboard, Share Result Card, Numeric Keypad Modal, Autopause.

**See TODO.md for full task list.**

**How:** Why: Give decisions proper context about what's a bug vs missing feature vs technical debt.
