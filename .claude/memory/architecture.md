---
name: architecture
description: "Current architecture, known structural issues, rewrite notes, confirmed bugs"
metadata: 
  node_type: memory
  type: project
  originSessionId: 03a24291-4589-4a87-9cd3-a3a1b0099e16
---

**Routing:** Manual `useState<Route>` in `src/app/App.tsx`. Routes: splash | home | setup | live | stats. No React Router. Simple, works for this app size.

**State:** Single Zustand store `useAppStore` in `src/store/useAppStore.ts`. Mixes UI overlay state, game state, DB operations. Module-level `writeStats()` function handles all stat + achievement writes atomically on game completion.

**Database:** Dexie (IndexedDB), db name `chhummy-db`. All 5 tables active:
- players, sessions, rounds — core game
- stats — single "global" row, `totals: { wins, closes, eliminations, averageScore, survivalRounds, streaks }`
- achievements — per-game rows (ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY)

**Key files:**
- `src/app/App.tsx` — route manager, clean
- `src/store/useAppStore.ts` — all state + DB ops + writeStats()
- `src/pages/LiveGame.tsx` — live game screen + 4 modals (whoClosed, enterScores/numpad, confirmRound, eliminated)
- `src/components/FullOverlay.tsx` — extracted overlay shell (tone: success|danger)
- `src/components/WinnerView.tsx` — winner screen + html2canvas share card
- `src/pages/StatsPage.tsx` — 3-tab stats page (Players, History, Charts)
- `src/pages/Home.tsx` — Hall of Fame loads real data from DB
- `src/db/index.ts` — schema definitions

**Remaining structural debt (minor):**
1. `getTotals()` is a plain function called on every render — could be `useMemo` but not causing performance issues yet
2. `setScore` and `setTempScore` are duplicates — fine for now
3. No lazy loading — all pages imported eagerly

**New actions added (2026-06-21):**
- `declareWinner(winnerId)`: manually declare winner without a round — gets rounds/totals, marks session completed, calls writeStats, sets winner overlay. Used by End Game button when survivors.length === 1.

**Numpad rendering (2026-06-21):**
- Numpad is rendered via `createPortal(numpad, document.body)` in `LiveGame.tsx` — placed OUTSIDE `AnimatePresence`, directly into document.body
- Root cause of the fix: `FullOverlay` uses `backdrop-blur-sm` (backdrop-filter: blur), which creates a new CSS stacking context on Android Chrome. Even `z-[60]` children could not escape it. `createPortal` bypasses all parent stacking contexts entirely.
- Numpad is a plain `<div>` wrapper (not a Framer Motion component at the root) with `style={{ zIndex: 9999 }}`. Inner sheet uses Framer Motion for the slide-up animation.
- The `Overlays` function return is now `<>...<AnimatePresence>...</AnimatePresence>{numpad && createPortal(...)}</>`.
- If numpad ever stops appearing on Android again, check: (1) portal target exists before render, (2) new overlays added since that also use backdrop-filter.

**Critical elimination overlay rule:**
- The `"eliminated"` overlay ONLY renders when `survivors.length > 1` (store line ~389).
- When there are exactly 2 players and one is eliminated, the game skips the elimination overlay and goes DIRECTLY to the winner overlay.
- Tests that check the elimination modal must use 3+ players, otherwise they will never see the `Continue` button — the `SURVIVES` winner screen shows instead.

**Watch out:**
- `LiveGame.tsx` had pre-existing U+201D (curly right double quotes) in some JSX className attributes. Fixed on lines 370 and 377 (2026-06-21). If any new class attributes look wrong in build, check for smart quotes via `cat -v`.

**Fixed bugs (do not re-introduce):**
- `newSession()` now reloads players from DB before setting state — fixes "Player" name bug
- All `window.prompt()` replaced with NumpadModal; all `window.alert()` replaced with inline validation toast
- Winner overlay close now calls `onExit()` to navigate home, not just `closeOverlay()`
- Closer's Custom button hidden (`!isCloser` guard in enterScores overlay)
- Pull-to-refresh blocked via `overscroll-behavior: none`
- `confirmRound()` `survivors.length === 0` case: when ALL players hit 100 in same round, lowest total wins; tie broken by round's closer
- Numpad opens with `numInput = ""` always (not pre-filled with prior chip value); 0→digit correctly replaces leading zero

**How to apply:** When touching any of these files, be aware of the remaining debt. Fix while working, don't introduce more monolith patterns.
