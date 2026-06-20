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

**What's Built (as of 2026-06-21):**
- Player management, live game screen, full round flow (end→closer→scores→confirm)
- Elimination modal (full-screen, dark red, vibration, giant score hero + "points — OUT" label) — NOTE: only shows when ≥2 survivors remain; with 2 players, game goes directly to winner
- Winner screen (celebration + share card)
- Numeric Keypad Modal — custom numpad replaces window.prompt() entirely; renders via createPortal into document.body to bypass Android Chrome stacking context issues
- Max 60 cap in numpad: digits exceeding 60 are rejected during typing; subtitle shows "Max 60"/"Max reached"; confirm clamps with Math.min(v,60)
- Closer constraint: sees only 0–5 chips, no Custom button
- Running total preview in score entry (currentTotal + pending = newTotal, colored by threshold)
- Visual tension: warning (70+) amber card bg + text, critical (85+) red bg + pulsing text
- Undo last round with confirmation (inline Yes/No row, disabled when no rounds to undo)
- Redo last undo: `lastUndoneRound` in store; `redoLastRound()` / `clearRedo()` actions; amber inline row "↩ Redo available" → tap → confirm "Redo Round N? Yes/No"; cleared on any new round, abandon, or winner
- Cancel button on Who Closed overlay (← Cancel dismisses without starting round)
- End Game button (amber gradient) replaces End Round when only 1 survivor left; calls declareWinner()
- Trophy badge on player card (🏆 N closes) — hidden at 0
- Dealer pill (🎴 Dealer) directly on the dealer's player card
- Autosave to IndexedDB, offline PWA
- Stats system: `writeStats()` writes to stats + achievements tables on every game end
- Hall of Fame: coloured pill rows — gold/Champion, amber/Closer, red/Patsy
- "How to Close" accordion on Home: always visible, collapsed by default
- Stats page with 3 tabs: Players (per-player cards + achievements), History (expandable sessions), Charts (Recharts bar charts)
- Share Result Card: full ranked leaderboard (winner gold-highlighted, eliminated with 💀 + red, pts for all); html2canvas + Web Share API (Android) / download fallback (desktop)
- Pause screen: bottom-sheet style with blurred live game behind
- PlayerSetup: players sorted by `lastUsedAt` desc (most recently used first)
- Emoji contrast fix: `w-12 h-12 rounded-full bg-white/10` circular backdrop behind all emoji instances (player cards, Who Closed buttons, Enter Scores rows) — dark emojis like 😎 now visible
- Score entry sticky bottom: `bg-[#171717]` + `z-10` on Confirm Round bar (was `bg-inherit` → resolved to transparent through intermediate wrapper div)
- Back button on score entry: "← Back" below Confirm Round calls `store.endRoundStart()` → reopens "Who Closed?" overlay so wrong closer can be corrected

**What's NOT Built:**
- Weekly/Monthly dashboard (time-series Recharts — backlog)
- Deployment: pushed to main on 2026-06-21 (Vercel auto-deployed)

**UI Improvements Made (2026-06-20, session 2):**
- History expanded: each player now on own row, `+score → total` right-aligned, colored by threshold (amber 70+, orange 85+, red 100+ with 💀)
- Charts: `<Legend />` added to "Closes vs Eliminations" chart — amber=Closes, red=Eliminations
- Score entry: shows "Score: X" under each player name before they tap a chip — no mental recall needed mid-game
- Who Closed buttons: show current pts below name, colored amber/red if in danger zone
- Home empty state: "How to Close" Quick Rules card appears below Hall of Fame when no games played yet; disappears once data exists
- Score entry overflow: already handled by FullOverlay's `max-h-[92vh] overflow-y-auto`

**Bugs Fixed (2026-06-20, session 2 — found via adversarial edge-case testing):**
- **Both players hit 100 same round → game stuck** (`survivors.length === 0` unhandled): `confirmRound()` now picks lowest total as winner; tie broken by whoever closed that round
- **Numpad leading zero**: typing 0 then 5 showed "05" (value correct but display wrong). Fixed: numpad opens empty (not pre-filled with prior chip value); typing a 1-9 digit when display shows "0" replaces it; typing "0" when already "0" keeps "0" (prevents "00")

**Test coverage:** 136 automated tests across batch-05 (17) + batch-06b (6) + batch-07 (20) + batch-08 (65) + batch-09 (28). All 136 pass.

**batch-08 (2026-06-21)** — Full end-to-end review, 65/65. Verified: splash, home, player setup, live game, all overlays (pause, who-closed+cancel, score-entry, numpad, elimination, winner), undo confirmation, end-game button, stats page (3 tabs), hall of fame, resume session, visual tension (amber/red), eliminated card. One confirmed bug: numpad accepts scores > 60 (cap at 60 is pending TODO).

**Test Status (Batch 5 — 2026-06-20):** 17/17 tests PASS. Full flow verified: game start, visual tension badges, running total preview + 💀, winner nav home, stats page with real data, achievements, history expand, charts, closer-no-custom, numpad.

**See TODO.md for full task list.**

**How to apply:** Give decisions proper context about what's a bug vs missing feature vs technical debt.
