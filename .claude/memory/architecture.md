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

**Remaining structural debt (from full architecture review 2026-06-21):**
1. **`ui.toast` is dead** — `undoLastRound()` and `redoLastRound()` write to `ui.toast` ("Undid previous round" / "Redid round") but NO component reads or displays it. The toast silently gets set and dropped. Either wire up a toast UI or delete the field and the two `set()` calls that write it.
2. **`setScore` is dead code** — identical body to `setTempScore`. Exposed in `AppState` interface but never called anywhere. Only `setTempScore` is used.
3. **`resumeLatest()` is never called** — `init()` already loads active session on app start. `resumeLatest()` is a dead export on the store.
4. **`getTotals()` called 4+ times per render in enterScores** — once for filter, once per player for display, once for running total preview, once in confirm handler. Not a performance issue at current scale but redundant.
5. **`tempScores` not cleared on "← Back"** — `endRoundStart()` reopens whoClosed but does NOT clear tempScores. Old scores survive. Implicit behavior — could be intentional (same round, same scores) or confusing (different closer).
6. **`confirmRound()` is 100+ lines** — builds round, writes DB, updates session, decides elimination/winner/tie, triggers overlays all in one function. Acceptable at this scale; risky to touch without care.
7. No lazy loading — all pages imported eagerly (acceptable for this app size).

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

**CSS gotcha — bg-inherit through wrapper divs (2026-06-21):**
- `bg-inherit` only inherits the computed `background-color` of the IMMEDIATE parent, not the nearest ancestor with a non-transparent background. If a child div sits inside `<div className="pb-10">` (no background), `bg-inherit` on a deeper element resolves to `transparent`, not the grandparent's colour.
- Fix: use an explicit colour (e.g. `bg-[#171717]`) on sticky/floating elements when they're wrapped in a bare div inside a coloured container. Affected: the Confirm Round sticky bar in enterScores overlay.

**Fixed bugs (do not re-introduce):**
- `newSession()` now reloads players from DB before setting state — fixes "Player" name bug
- All `window.prompt()` replaced with NumpadModal; all `window.alert()` replaced with inline validation toast
- Winner overlay close now calls `onExit()` to navigate home, not just `closeOverlay()`
- Closer's Custom button hidden (`!isCloser` guard in enterScores overlay)
- Pull-to-refresh blocked via `overscroll-behavior: none`
- `confirmRound()` `survivors.length === 0` case: when ALL players hit 100 in same round, lowest total wins; tie broken by round's closer
- Numpad opens with `numInput = ""` always (not pre-filled with prior chip value); 0→digit correctly replaces leading zero

**How to apply:** When touching any of these files, be aware of the remaining debt. Fix while working, don't introduce more monolith patterns.
