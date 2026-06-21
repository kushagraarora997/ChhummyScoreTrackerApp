---
name: project-context
description: "Chhummy Tracker app purpose, game rules, family context, built vs not-built"
metadata: 
  node_type: memory
  type: project
  originSessionId: 03a24291-4589-4a87-9cd3-a3a1b0099e16
---

App is "Chhummy Tracker" — premium mobile-first PWA for the Arora family's card game nights.
Tagline: "Always Agitated Aroras". Deployed on Vercel, linked to GitHub (kushagraarora997/ChhummyScoreTrackerApp).

**Why:** Family replacement for manual score keeping, WhatsApp spam, mental calculations.

**Game Rules:**
- 6-card Rummy variation, 2–6 players
- Close requires: 1 mandatory pure sequence of 3 + remaining 3 as (pure seq OR trail OR deadwood ≤ 5)
- After close: ALL players reveal; multiple players can score 0 — this is valid and common
- Scores accumulate; 100+ = eliminated
- **Max 60 points per round** for any non-closer player — nobody can enter more than 60 in a single round
- Closer becomes dealer next round; closer's own score capped at 5 (deadwood was ≤5 to close)
- Last survivor wins

**What's Built (as of 2026-06-21 — post-modularization):**
- Player management, live game screen, full round flow (end→closer→scores→confirm)
- Elimination modal (full-screen, dark red, vibration, giant score hero + "points — OUT" label) — NOTE: only shows when ≥2 survivors remain; with 2 players, game goes directly to winner
- Winner screen (celebration + share card via html2canvas off-screen div fix)
- Numeric Keypad Modal — custom numpad replaces window.prompt() entirely; renders via createPortal into document.body; inside EnterScores.tsx overlay component
- Max 60 cap in numpad: digits exceeding 60 are rejected during typing; subtitle shows "Max 60"/"Max reached"; confirm clamps with Math.min(v,60)
- Closer constraint: sees only 0–5 chips, no Custom button
- Running total preview in score entry (currentTotal + pending = newTotal, colored by threshold)
- Visual tension: warning (70+) amber card bg + text, critical (85+) red bg + pulsing text
- Undo last round with confirmation
- Redo last undo (lastUndoneRound in store)
- Cancel button on Who Closed overlay (← Cancel)
- Back button on Enter Scores (← Back → reopens Who Closed)
- End Game button (amber gradient) when only 1 survivor left; calls declareWinner()
- Trophy badge on player card (🏆 N closes)
- Dealer pill (🎴 Dealer) on dealer's player card
- Autosave to IndexedDB, offline PWA
- Stats system: writeStats() writes to stats + achievements tables on every game end
- Hall of Fame: coloured pill rows — gold/Champion, amber/Closer, red/Patsy
- "How to Close" accordion on Home
- Stats page: 3 tabs (Players with achievement badges, History expandable, Charts with Recharts)
- Share Result Card: off-screen hidden div captured by html2canvas + Web Share API / download fallback
- Pause screen: bottom-sheet with blurred live game behind, End Game → confirm flow
- PlayerSetup: players sorted by lastUsedAt desc
- Emoji circular backdrop (bg-white/10) behind all emoji instances for dark emoji visibility
- Modularized overlay components (2026-06-21): WhoClosed, EnterScores, EliminationOverlay, WinnerOverlay, PauseOverlay each in own file under `src/components/overlays/`

**Pending UI Issues (from self-audit 2026-06-21, all in TODO.md):**
1. Player Setup empty state looks broken — lone dashed box in black void
2. Who Closed — last card stranded (odd player count, grid-cols-2)
3. Live game "Total: 0" reads like a form label — should be a bold right-aligned number
4. Emoji circle invisible on selected (green) player cards in PlayerSetup
5. Score entry chips slightly cramped (py-4 → py-5)
6. Winner screen needs more celebration (static text, no animation)
7. Stats chart: 0-win players show blank column, looks like missing data

**What's NOT Built:**
- Weekly/Monthly dashboard (time-series Recharts — backlog)

**Deployment:** Vercel is linked to GitHub. `git push main` auto-deploys. Push requires explicit user go-ahead per CLAUDE.md.

**Test coverage:** E2E screenshot tour at `C:\Users\kusha\AppData\Local\Temp\pw-test\screenshot-tour.mjs`. Generates 19 screenshots. Run with `node screenshot-tour.mjs` (dev server must be on port 5173). All passing as of 2026-06-21.

**Architecture debt remaining (see architecture.md):** getTotals() redundant calls, confirmRound() length, no lazy loading.

**See TODO.md for full task list.**

**How to apply:** Give decisions proper context about what's a bug vs missing feature vs technical debt.
