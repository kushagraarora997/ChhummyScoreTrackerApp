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

**Key files (as of 2026-06-21 modularization):**
- `src/app/App.tsx` — route manager, clean; `AnimatePresence mode="wait"` wraps all routes
- `src/store/useAppStore.ts` — all state + DB ops + writeStats()
- `src/pages/LiveGame.tsx` — ~200 line orchestrator; just renders player cards + Overlays component; all overlay logic is in separate files
- `src/components/overlays/WhoClosed.tsx` — "Who Closed?" overlay, grid of player buttons
- `src/components/overlays/EnterScores.tsx` — score entry overlay + custom numpad portal
- `src/components/overlays/EliminationOverlay.tsx` — full-screen red elimination screen
- `src/components/overlays/WinnerOverlay.tsx` — wraps WinnerView in FullOverlay
- `src/components/overlays/PauseOverlay.tsx` — pause + end-game confirm sheet
- `src/components/FullOverlay.tsx` — reusable bottom-sheet shell (tone: success|danger); motion.div with opacity/y animations
- `src/components/WinnerView.tsx` — winner content + html2canvas share card (off-screen hidden div approach)
- `src/pages/StatsPage.tsx` — 3-tab stats page (Players, History, Charts)
- `src/pages/Home.tsx` — Hall of Fame loads real data from DB
- `src/db/index.ts` — schema definitions

**Remaining structural debt (as of 2026-06-21):**
1. **`confirmRound()` is 100+ lines** — builds round, writes DB, updates session, decides elimination/winner/tie, triggers overlays all in one function. Acceptable at this scale; risky to touch without care.
2. No lazy loading — all pages imported eagerly (acceptable for this app size).

**Sound utility (2026-06-21):**
- `src/utils/sound.ts` — Web Audio API tones. `soundWinner()`, `soundElimination()`, `soundConfirm()`.
- All wrapped in try/catch; check `document.hidden` before playing.
- Called from `useAppStore.ts` in `confirmRound()` and `declareWinner()`.

**New actions added (2026-06-21):**
- `declareWinner(winnerId)`: manually declare winner without a round — gets rounds/totals, marks session completed, calls writeStats, sets winner overlay. Used by End Game button when survivors.length === 1.

**Numpad rendering (2026-06-21):**
- Numpad is rendered via `createPortal(numpad, document.body)` INSIDE `EnterScores.tsx` — at the bottom of the component, after the FullOverlay JSX
- Root cause of the fix: `FullOverlay` uses `backdrop-blur-sm` (backdrop-filter: blur), which creates a new CSS stacking context on Android Chrome. Even `z-[60]` children could not escape it. `createPortal` bypasses all parent stacking contexts entirely.
- Numpad outer wrapper is a plain `<div>` with `style={{ zIndex: 9999 }}`. Inner sheet uses Framer Motion for the slide-up animation.
- If numpad ever stops appearing on Android again, check: (1) portal target exists before render, (2) new overlays added since that also use backdrop-filter.

**Critical elimination overlay rule:**
- The `"eliminated"` overlay ONLY renders when `survivors.length > 1` (store ~line 360).
- When there are exactly 2 players and one is eliminated, the game skips the elimination overlay and goes DIRECTLY to the winner overlay.
- Tests that check the elimination modal must use 3+ players, otherwise they will never see the `Continue` button — the `SURVIVES` winner screen shows instead.

**html2canvas share card fix (2026-06-21):**
- Root cause of distortion: capturing a card inside `fixed inset-0 max-h-[92vh] overflow-y-auto` FullOverlay. Scroll context and parent positioning cause pixel distortion.
- Fix: render a SECOND share card in `WinnerView.tsx` via `hiddenCardRef` pointing to an off-screen `<div>` with `position: fixed; left: -9999px`. Uses explicit `rgba()` colors and inline styles (no Tailwind). html2canvas captures only this clean, isolated node.
- `html2canvas` options: `{ backgroundColor: "#050505", scale: 2, useCORS: true, allowTaint: true, logging: false, width: ..., height: ... }`

**CRITICAL — html2canvas does NOT support CSS flexbox:**
- Any `display: flex` in the off-screen capture div causes html2canvas to render all children as stacked blocks — no side-by-side layout, no gap, no justify-content.
- Symptom: player rows collapse so name and pts appear on separate lines; stats row shows Rounds and Closes vertically.
- Fix: use `<table>` layout for any side-by-side elements in the hidden card. Nested tables work fine. `float` also works. Absolutely avoid flexbox or grid in anything html2canvas will capture.
- The VISIBLE card (display-only, not captured) can still use Tailwind flexbox freely.

**abandonSession() ordering (important — do not swap):**
- `await db.sessions.put(...)` FIRST, then `set({ activeSession: undefined, ... })`
- Reason: if `set()` fires before the await, Zustand's `useSyncExternalStore` triggers a synchronous re-render of LiveGame while route is still "live" (React batch hasn't processed `setRoute("home")` yet), showing the "No active session." fallback
- The race condition this was "fixing" doesn't exist in practice — the 1200ms gap before `newSession()` is called is far longer than the ~20ms DB write

**Playwright E2E screenshot tour (2026-06-21):**
- Test at `C:\Users\kusha\AppData\Local\Temp\pw-test\screenshot-tour.mjs` — generates 19 screenshots
- Dev server must be on port 5173 (`npm run dev`)
- Run: `node screenshot-tour.mjs` from the pw-test directory
- Key quirk: `page.evaluate(() => document.body.getBoundingClientRect())` must precede "End Round" clicks in loops — without it, Playwright's click is fired before Framer Motion's `motion.div layout` animation system completes its initialization, and a transient DOM element intercepts the click
- Test covers: splash, home, accordion, player setup (add modal), live game, who-closed, enter-scores (scroll), back+cancel, pause, abandon, second full game (3 rounds, winner), stats (3 tabs), hall of fame

**CSS gotcha — bg-inherit through wrapper divs:**
- `bg-inherit` only inherits the computed `background-color` of the IMMEDIATE parent, not the nearest ancestor with a non-transparent background. If a child div sits inside `<div className="pb-10">` (no background), `bg-inherit` on a deeper element resolves to `transparent`, not the grandparent's colour.
- Fix: use an explicit colour (e.g. `bg-[#171717]`) on sticky/floating elements. Affected: Confirm Round sticky bar in EnterScores overlay.

**Fixed bugs (do not re-introduce):**
- `newSession()` reloads players from DB before setting state — fixes "Player" name bug
- `newSession()` ALWAYS resets `ui.overlay` to none — prevents stale overlay from previous game
- `endRoundStart()` clears `tempScores: {}` — prevents stale score chips from previous round entry persisting if closer is changed
- Dead exports removed from store: `setScore` (dup of `setTempScore`), `resumeLatest()` (unused), `ui.toast` field
- All `window.prompt()` replaced with NumpadModal; all `window.alert()` replaced with inline validation
- Winner overlay close calls `onExit()` to navigate home
- Closer's Custom button hidden (`!isCloser` guard in EnterScores overlay)
- Pull-to-refresh blocked via `overscroll-behavior: none`
- `confirmRound()` `survivors.length === 0` case: when ALL players hit 100 in same round, lowest total wins; tie broken by round's closer
- Numpad opens with `numInput = ""` always (not pre-filled); 0→digit correctly replaces leading zero

**Watch out:**
- `LiveGame.tsx` previously had U+201D curly right double quotes in JSX className attrs. Fixed 2026-06-21. Check for smart quotes (`cat -v`) if builds look wrong.
