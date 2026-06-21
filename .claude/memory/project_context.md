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

**All UI Audit items resolved (2026-06-21):**
1. Player Setup empty state — "Sab ko add karo! 👇" heading added ✅
2. Who Closed odd player count — col-span-2 for last card in odd list ✅
3. Live game score — right-aligned `text-2xl font-black` number, "Total:" removed ✅
4. Emoji circle on selected cards — `bg-black/20` when active (green bg) ✅
5. Score entry chips — `py-5` (was py-4) ✅
6. Winner screen — emoji scale-bounce on mount, "SURVIVES" fade+slide-up ✅
7. Stats chart — `winsChartData` filters 0-win players from Wins chart ✅

**Sound feedback added (2026-06-21):**
- `src/utils/sound.ts` — soundWinner() (C→E→G fanfare), soundElimination() (A→E sawtooth), soundConfirm() (30ms tick)
- Called from confirmRound() and declareWinner() in useAppStore.ts
- Vibration: `[100, 50, 100, 50, 300]` on winner, `[200, 100, 200]` on elimination

**Extended haptics + UI polish pass (2026-06-21, batch-10):**
All 8 haptic patterns implemented:
- Chip tap: `navigator.vibrate?.(8)` on each chip in EnterScores
- Who Closed player tap: `navigator.vibrate?.(20)` in WhoClosed
- Confirm Round: `navigator.vibrate?.(30)` in EnterScores handleConfirm
- Warning threshold (70+): `navigator.vibrate?.([30,20,30])` in confirmRound() normal-round path
- Critical threshold (85+): `navigator.vibrate?.([50,30,50,30,50])` — takes priority over warning
- Start Session: `navigator.vibrate?.([40,20,80])` in PlayerSetup start()
- Custom numpad confirm: `navigator.vibrate?.(20)` in numpad ✓ handler
- Undo confirmed: `navigator.vibrate?.(15)` on "Yes" tap in LiveGame

UI polish also applied (same session):
- LiveGame: player cards vertically centered with `flex-1 flex flex-col justify-center`; score font bumped to `text-3xl`
- EnterScores: label changed "Score: N" → "Total: N pts"; chip 25 added (3×3 symmetric grid); numpad shows "[Name] ka score" header
- WhoClosed: "Round N" subtitle below "Kaun Jeeta Be?" title
- StatsPage: Y-axis domain `[0, max+1]` on Wins chart; avg score renders without trailing `.0`
- PlayerSetup: Add Player button `col-span-2` when no players exist; start session haptic
- Home: tagline bumped to `text-sm opacity-60`

**What's NOT Built:**
- Weekly/Monthly dashboard (time-series Recharts — backlog)

**Deployment:** Vercel is linked to GitHub. `git push main` auto-deploys. **First push was done 2026-06-21** (user approved). Subsequent pushes also need explicit go-ahead per CLAUDE.md.

**Test coverage:** E2E screenshot tour at `C:\Users\kusha\AppData\Local\Temp\pw-test\screenshot-tour.mjs`. Generates 19 screenshots. Run with `node screenshot-tour.mjs` (dev server must be on port 5173). All passing as of 2026-06-21.

**Architecture debt remaining (see architecture.md):** getTotals() redundant calls, confirmRound() length, no lazy loading.

**See TODO.md for full task list.**

**How to apply:** Give decisions proper context about what's a bug vs missing feature vs technical debt.
