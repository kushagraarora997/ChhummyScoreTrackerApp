---
name: architecture
description: "Current architecture, known structural issues, rewrite notes, confirmed bugs"
metadata: 
  node_type: memory
  type: project
  originSessionId: 03a24291-4589-4a87-9cd3-a3a1b0099e16
---

## Quick Reference (latest commit: 5a8aeb4, 2026-06-23)

**Dev server:** `npm run dev` → http://localhost:5173  
**Build:** `npm run build` (TypeScript strict + Vite, 1600KB bundle, zero errors)  
**Deploy:** `git push origin main` → auto-deploys to Vercel  
**Firebase project:** `chummyscoretracker` | API key: `AIzaSyCZDaVKefU0UwBy-y8Kj5FE2t3eJKhW1gs`  
**Room code localStorage key:** `chhummy-room-code` (NOT `chhummy_room_code`)  
**Test dir:** `C:\Users\kusha\AppData\Local\Temp\pw-test\` — run any `.mjs` with `node filename.mjs`

---

**Routing:** Manual `useState<Route>` in `src/app/App.tsx`. Routes: splash | home | setup | live | stats. No React Router. Simple, works for this app size.

**State:** Single Zustand store `useAppStore` in `src/store/useAppStore.ts`. Mixes UI overlay state, game state, DB operations. Module-level `writeStats()` function handles all stat + achievement writes atomically on game completion.

**Database:** Dexie (IndexedDB), db name `chhummy-db`. All 5 tables active:
- players, sessions, rounds — core game
- stats — single "global" row, `totals: { wins, closes, eliminations, averageScore, survivalRounds, streaks }`
- achievements — per-game rows (ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY)

**Key files (as of 2026-06-22):**
- `src/app/App.tsx` — route manager, clean; `AnimatePresence mode="wait"` wraps all routes
- `src/store/useAppStore.ts` — all state; zero db.* calls (uses operations layer)
- `src/db/operations.ts` — 16 named Dexie wrapper functions (added 2026-06-22)
- `src/pages/LiveGame.tsx` — orchestrator: player cards + Overlays component + PlayerHistorySheet
- `src/components/overlays/WhoClosed.tsx` — "Who Closed?" overlay, grid of player buttons
- `src/components/overlays/EnterScores.tsx` — score entry overlay + custom numpad portal
- `src/components/overlays/EliminationOverlay.tsx` — full-screen red elimination screen
- `src/components/overlays/WinnerOverlay.tsx` — wraps WinnerView in FullOverlay; passes onRematch callback
- `src/components/overlays/PauseOverlay.tsx` — pause + end-game confirm + mid-game share (html2canvas)
- `src/components/overlays/PlayerHistorySheet.tsx` — slide-up sheet showing player's round-by-round scores (new 2026-06-22)
- `src/components/FullOverlay.tsx` — reusable bottom-sheet shell (tone: success|danger); motion.div with opacity/y animations
- `src/components/WinnerView.tsx` — winner content + confetti + html2canvas share card; accepts onClose and onRematch props
- `src/pages/StatsPage.tsx` — 3-tab stats page (Players+H2H, History, Charts)
- `src/pages/Home.tsx` — Hall of Fame loads real data from DB
- `src/db/index.ts` — schema definitions

**DB operations layer (fully migrated 2026-06-22, updated 2026-06-23):**
- `src/db/operations.ts` — 20 named functions: `getPlayers`, `addPlayer`, `updatePlayerLastUsed`, `updatePlayer`, `deletePlayer`, `getActiveSession`, `getCompletedSessions`, `addSession`, `putSession`, `getRoundsBySession`, `countRoundsBySession`, `addRound`, `putRound`, `putRoundLocal` (Dexie-only, no Firestore re-sync — used by ingestCloudRound), `bulkPutRounds` (caches cloud rounds), `deleteRound`, `getGlobalStats`, `putStats`, `getAchievements`, `addAchievement`
- `deleteRound` signature changed (2026-06-23, batch-16): takes `Pick<Round, "id"|"sessionId"|"number">` not just `id: string` — full round needed to compute composite Firestore key for delete
- `useAppStore.ts` imports from `../db/operations` — zero `db.*` calls in the store
- `Home.tsx`, `StatsPage.tsx`, `PlayerSetup.tsx` all migrated — zero `db.*` calls in any page
- `updatePlayer(id, Partial<Player>)` and `deletePlayer(id)` added 2026-06-22 for player management feature

**Remaining structural debt (as of 2026-06-22, post pre-work):**
1. **No error boundary** — IndexedDB errors silently crash the store. Low priority.
2. **`getPlayers()` redundant call in `newSession()`** — intentional, picks up PlayerSetup edits.
3. No lazy loading — all pages imported eagerly (fine at this size).

**Pre-work COMPLETED (commit b22c8ed, 2026-06-22):**
1. `resolveRoundOutcome(playerIds, prevTotals, totals, survivors)` — extracted as module-level pure function WITHIN `useAppStore.ts` (NOT in operations.ts — it is pure logic, no DB access). Returns `{ outcome: "normal"|"elimination"|"winner"|"allOut", justEliminated }`. `confirmRound()` calls it and switches on outcome.
2. `writeStats()` — moved to `src/db/operations.ts`. Store imports it from there. Zero module-level DB logic remains in store.
3. Per-field Zustand selectors — `LiveGame`, `EnterScores`, `WhoClosed` all use `useAppStore(s => s.field)`. Zero `const store = useAppStore()` whole-store subscriptions in these components.

**Minor code observations (2026-06-22):**
- `App.tsx:35` background gradient uses `from-[#050816]` (blue-tinted), not design system's `#050505`. Barely visible.
- `getTotals()` memoized in LiveGame via `useMemo([rounds])` — only recomputes when rounds change.
- `EnterScores` running total shows 💀 when `currentTotal + pending > 100` — player isn't actually eliminated yet. Minor UX ambiguity, not a bug.

**Fork readiness review (2026-06-22):**
- Source code: clean ✅ — no `db.*` calls in store/pages, selectors in place, pure functions extracted
- Build: passes, 1022KB/295KB gzip ✅
- Tests: 67/67 ✅
- Known bugs: none ✅
- **CLAUDE.md fully updated (2026-06-22)** — "What Is Built" now covers all features; writeStats location correctly documented as `src/db/operations.ts`; deployment status accurate. Ready for fork.
- Backup of repo created at `C:\Users\kusha\chhummy-tracker-backup` before CLAUDE.md edits.

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

**Firebase sync additions (2026-06-23, commit f7e7239):**
- `firebaseSync.ts` — added `fetchRoundsForSession(familyId, sessionId)`: on-demand Firestore round fetch for History expand on joined devices; `pullStatsFromCloud(familyId)`: re-pulls stats+achievements after game ends
- `useAppStore.ts::ingestCloudSession` — now shows winner overlay on joined device when `session.status === "completed" && session.winnerId && ui.overlay.type !== "winner"`; queues `pullStatsFromCloud` 3s later
- `StatsPage.tsx::expandSession` — lazy-fetches rounds from Firestore when local Dexie has 0 rounds for the session (joined devices); caches via `bulkPutRounds`
- `pullFromCloud` — changed sessions query from `where("status", "==", "active")` to fetch ALL sessions; only eagerly fetches rounds for the active session (keeps join fast)
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

**Batch-14 comprehensive suite (2026-06-22, 67/67 PASS):**
- Test file: `C:\Users\kusha\AppData\Local\Temp\pw-test\batch14.mjs`
- 67 tests across 11 groups. Run: `node batch14.mjs` (dev server on port 5173)
- Key locator gotcha: `page.waitForSelector("text=Round History")` matched the LiveGame tap hint "Tap any card to see **round history**" (Playwright `text=` is case-insensitive partial match). PlayerHistorySheet has no "Round History" heading — use `text=rounds played` instead (unique to PlayerHistorySheet).
- Backdrop close detection: use `page.mouse.click(x, y)` (absolute viewport coords, no hit-test check) then `waitForTimeout(900)` + `isVisible` check. Do NOT use `locator.click({ position })` for backdrop clicks — it performs a hit-test which can fail if z-indices are unclear.

**Multi-player test suite (2026-06-22):**
- Test file: `C:\Users\kusha\AppData\Local\Temp\pw-test\multi-player-tests.mjs`
- 53 tests, 0 failures. Covers 2P/3P/4P/5P/6P complete games + all-out edge case
- Run: `node multi-player-tests.mjs` from pw-test dir (dev server must be on port 5176)
- Key Playwright gotcha discovered: `body.textContent()` concatenates adjacent text nodes — "Round 1" + "2 alive" = "12 alive". Use `page.getByText(/\d+ alive/).first()` to scope to the specific element
- Numpad has 60-cap enforced in JS — cannot test scores > 60 via numpad. Build up high totals over multiple rounds using ≤60 per round
- Tests verify: 101 threshold, no elim modal for 2P, elim modal for 3P+, Continue flow, critical-but-alive (85-100), all-out tiebreaker (closer wins)

**Playwright E2E screenshot tour (2026-06-21):**
- Test at `C:\Users\kusha\AppData\Local\Temp\pw-test\screenshot-tour.mjs` — generates 33 screenshots
- UI audit script at `C:\Users\kusha\AppData\Local\Temp\pw-test\ui-audit.mjs` — generates 32 screenshots of every screen for visual review
- Dev server must be on port 5173 (`npm run dev`)
- Run: `node screenshot-tour.mjs` from the pw-test directory
- Key quirk: `page.evaluate(() => document.body.getBoundingClientRect())` must precede "End Round" clicks in loops — without it, Playwright's click is fired before Framer Motion's `motion.div layout` animation system completes its initialization, and a transient DOM element intercepts the click
- Test covers: splash, home, accordion, player setup (add modal), live game, who-closed, enter-scores (scroll), back+cancel, pause, abandon, 2-player 3-round game (winner + share), stats (3 tabs), hall of fame, 3-player game (elimination, undo, redo, redo-survives-cancel, winner)

**CRITICAL — db.players.toArray() ordering:**
- Dexie's `toArray()` returns records in PRIMARY KEY (nanoid string) lexicographic order — NOT insertion order, NOT lastUsedAt order
- nanoid = `Math.random().toString(36).slice(2) + Date.now().toString(36)` — random prefix, so order is unpredictable
- `newSession()` sets `store.players` from raw `db.players.toArray()` — the order is random and stable within a session
- `EnterScores` renders player sections in `store.players` order → the "first" chip button in DOM may NOT be the closer's chip
- FIX in tests: never use `.first()` to click a specific player's chip; always scope to that player's section using `filter({ hasText: "Closer" })` or `filter({ hasText: playerName })`

**CRITICAL — LiveGame bg-elevated overlap with EnterScores sections:**
- LiveGame player cards in "normal" state (total < 70) use `bg-elevated` class + `rounded-2xl` — SAME classes as EnterScores player sections
- So `page.locator(".rounded-2xl.bg-elevated").filter({ hasText: "Priya" })` in Playwright matches BOTH the background LiveGame card AND the EnterScores section
- This is safe for chained `.locator("button", { hasText: "Custom" })` — the background card has no button children, so the chain uniquely resolves to the EnterScores Custom button
- NOT safe for `.locator("button").filter({ hasText: /^0$/ }).first()` — same ambiguity between background score div (but that's a div not a button) and EnterScores chips. Since background cards only have divs (no buttons), the "0" chip button is unique within the matched set — BUT only when Arjun sorts first. With 3 players where another player sorts first in nanoid order, that player's "0" chip becomes `.first()`
- Always use scoped closer locator: `.filter({ hasText: "Closer" }).locator("button").filter({ hasText: /^0$/ })`

**CRITICAL — "End Round" button includes round number in text:**
- Button text is "End Round #2", "End Round #3" etc — NOT just "End Round"
- In Playwright tests, always use partial match: `{ hasText: /End Round/ }` not exact `{ hasText: "End Round" }`
- "End Game" button (when 1 survivor remains) does NOT include the round number

**CRITICAL — Who Closed player buttons selector:**
- WhoClosed overlay renders player buttons as `<button class="h-32 rounded-2xl ...">` inside the `.fixed.inset-0.z-50` overlay
- Correct selector: `page.locator(".fixed.inset-0.z-50 button.h-32")`
- Do NOT use `.rounded-2xl.bg-elevated` to click Who Closed cards — that matches background LiveGame cards, and the overlay backdrop (`fixed inset-0`) intercepts the click

**CRITICAL — Numpad portal blocks Playwright simulated clicks:**
- The numpad backdrop div (`fixed inset-0 bg-black/70`) intercepts Playwright's synthetic pointer events even when targeting buttons inside it
- Standard `.click()` on numpad buttons will timeout with "intercepts pointer events"
- Fix: use `page.evaluate()` JS click — `page.evaluate((lbl) => { const btn = [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === lbl && b.closest('[style*="9999"]')); btn?.click(); }, label)`
- Add Player modal confirm button text is "Add" (not "Done") — must scope to modal to avoid matching "+ Add Player": use `.fixed.inset-0.z-50 button` with `/^Add$/` regex

**waitForFunction after Confirm Round:**
- After `confirmRound()`, the FullOverlay has a 300ms Framer Motion exit animation (`exit={{ opacity: 0, y: 24 }}`)
- Use `page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 5000 }).catch(() => {})` to wait for overlay to fully exit before clicking Undo/Redo
- Note: only appropriate when no elimination/winner follows (those also show z-50 overlays)

**CSS gotcha — bg-inherit through wrapper divs:**
- `bg-inherit` only inherits the computed `background-color` of the IMMEDIATE parent, not the nearest ancestor with a non-transparent background. If a child div sits inside `<div className="pb-10">` (no background), `bg-inherit` on a deeper element resolves to `transparent`, not the grandparent's colour.
- Fix: use an explicit colour (e.g. `bg-[#171717]`) on sticky/floating elements. Affected: Confirm Round sticky bar in EnterScores overlay.

**LiveGame.tsx header redesign (2026-06-22):**
- Removed "Round N" from center of 3-button header; now Pause (left) and Undo (right) only
- Added ⏸ icon to Pause button text
- Added hero section below header: `text-4xl font-black` Round number, context line ("N alive · X dealing"), round history dots (1 dot per completed round, max 14, then "+N")

**Elimination threshold change (2026-06-22):**
- Changed from `>= 100` to `> 100` across ALL files — 100 is now safe, 101+ = eliminated
- Files changed: useAppStore.ts (survivors filter, justEliminated filter, writeStats elim check), LiveGame.tsx (cardState, survivors, sorted), EnterScores.tsx (players filter, running total 💀 preview), WhoClosed.tsx (eliminated check), PauseOverlay.tsx (ranked sort + hidden card elim), WinnerView.tsx (isElim ×2), PlayerHistorySheet.tsx (dangerTotal), StatsPage.tsx (elim in history), CLAUDE.md game rules

**Known open bugs (as of 2026-06-22, post fix pass):**
- None. All review findings fixed in commit `231d94c`.

**Fixed in commit 231d94c (2026-06-22):**
- PATSY threshold: `>= 100` → `> 100` — player at exactly 100pts no longer falsely earns PATSY
- EnterScores player order: now maps `session.playerIds` → `playerMap.get(id)` so score sections always follow session order, not random IndexedDB order
- `devtools` middleware: `{ enabled: import.meta.env.DEV }` — disabled in production build
- `getTotals()` in LiveGame: wrapped in `useMemo([rounds])` — only recomputes when rounds array changes

**Remaining structural debt (as of 2026-06-22, post pre-work):**
- **No error boundary** — IndexedDB errors (quota, corruption) silently crash the store; add try/catch in `confirmRound()` at minimum.
- **`getPlayers()` redundant call in `newSession()`** — intentional (needed to pick up player edits from PlayerSetup local state), but could be avoided if PlayerSetup updated the Zustand store on edit.
- No lazy loading — all pages imported eagerly (fine at this size).

**Undo/Redo analysis (2026-06-22):**
- Undo to round 0 → guarded, dealer resets to 0. ✓
- Multiple undos → only last undo is redoable (single-level redo). Acceptable.
- Undo after elimination overlay dismissed → accessible and works correctly. ✓
- Undo/redo of winner rounds → NOT reachable in current UI (winner overlay covers LiveGame, only Back to Home or Rematch available). No fix needed.
- `redoLastRound()` does not re-run outcome resolution — acceptable because redo of winner round is unreachable.

**`newSession()` signature (updated batch-12):**
- `newSession(playerIds: string[], dealerIndex = 0)` — optional second param for first dealer
- Called from PlayerSetup with computed dealerIndex based on user's dealer chip selection
- Called from Quick Rematch with no dealerIndex (defaults to 0)

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

**PlayerHistorySheet tap guard (2026-06-22):**
- Player card `onClick` checks `rounds.length > 0 && store.ui.overlay.type === "none"` before setting historyPlayerId
- Sheet uses z-40 backdrop + z-50 sheet (same level as game overlays — but game overlays physically block player card taps anyway)
- Sheet rendered in its own `AnimatePresence` below the main `Overlays` component in LiveGame

**Quick Rematch flow (2026-06-22):**
- `WinnerOverlay` captures `playerIds = store.activeSession?.playerIds ?? []` before passing `onRematch` to WinnerView
- `onRematch` calls `store.newSession(playerIds)` — which already sets `ui.overlay: { type: "none" }` internally, so the winner overlay auto-dismisses
- No navigation needed — the live game screen is already mounted

**canvas-confetti (2026-06-22):**
- Installed as a dep (not devDep). `import confetti from "canvas-confetti"` in WinnerView.tsx
- useEffect fires 3 confetti bursts at 300ms/600ms/700ms; cleanup clears timeouts on unmount
- Colors: green #22C55E, amber #F59E0B, red #EF4444, white #FFFFFF

**Mid-game share pattern (2026-06-22):**
- PauseOverlay now has html2canvas share following the exact same off-screen table-layout pattern as WinnerView
- Disabled when `store.rounds.length === 0` (no rounds yet — nothing meaningful to share)
- Share disabled state: `disabled:opacity-40`

**Watch out:**
- `LiveGame.tsx` previously had U+201D curly right double quotes in JSX className attrs. Fixed 2026-06-21. Check for smart quotes (`cat -v`) if builds look wrong.

**Firestore data model (as of commit 5a8aeb4):**
```
families/{familyId}/
  players/{playerId}          — doc key = player.id (nanoid)
  sessions/{sessionId}        — doc key = session.id (nanoid)
  rounds/{sessionId}_{number} — doc key = COMPOSITE (not round.id!)
  stats/global                — single doc
  achievements/{achievementId} — doc key = achievement.id (nanoid)
```
CRITICAL: rounds use `${sessionId}_${number}` as the Firestore document key, NOT `round.id`.
This is intentional — prevents two devices from creating duplicate docs for the same round number.
`round.id` (nanoid) is stored as a FIELD inside the document, not as the key.

**DOUBLE-WRITE FIX (2026-06-23, commit 5a8aeb4) — RESOLVED:**
- Root cause: two devices confirming the same round before sync arrived each generated a unique nanoid round ID → `syncRound` used `round.id` as Firestore doc key → TWO separate Firestore docs for same round number → `ingestCloudRound` deduped by ID only → duplicate Round N in state
- Fix 1 (Firestore layer): `syncRound` now writes to composite key `${round.sessionId}_${round.number}` — last-write-wins means at most ONE doc per round number ever exists in Firestore
- Fix 2 (client dedup): `ingestCloudRound` added second guard: `if (existing.some(r => r.sessionId === round.sessionId && r.number === round.number)) return` — drops any incoming round whose number already exists locally
- Fix 3 (avoid circular sync): `ingestCloudRound` now uses `putRoundLocal` (Dexie-only) instead of `putRound` (which also re-synced to Firestore) — removes N×M unnecessary Firestore writes when 6 devices each re-upload received rounds
- Fix 4 (delete): `deleteRoundFromCloud` signature changed to `(familyId, sessionId, roundNumber)` so undo correctly deletes the composite-key Firestore doc
- Verified by DW1-DW6 tests (39/39 pass) including: composite key format confirmed via REST API, 3-device bidirectional, late joiner, injected fake duplicate rejected, 6-device fan-out, alternating A/B play

**Firebase Phase 2 — real-time sync (implemented 2026-06-23, commit dd6a254):**
- `subscribeToRounds(familyId, sessionId, onRound)` + `subscribeToSession(familyId, sessionId, onSession)` in `src/lib/firebaseSync.ts` — returns unsubscribe fn; uses `onSnapshot` with `docChanges()` filtering for "added"|"modified"
- `ingestCloudRound(round)` + `ingestCloudSession(session)` actions in `useAppStore.ts`
- `LiveGame.tsx`: subscription `useEffect` starts when `roomCode + session` exist; cleans up on unmount; dep array is `[session?.id, roomCode]`
- "● Live" green pill (`bg-success/20 text-success text-[10px]`) shown in LiveGame header when `roomCode` is set

**Firebase Phase 2+ — stats/achievements sync + push-on-create (commit 3d174db, 2026-06-23):**
- `syncStats(familyId, stats)` + `syncAchievement(familyId, achievement)` added to `src/lib/firebaseSync.ts`
- `putStats()` in `operations.ts` now calls `syncStats()` fire-and-forget; `addAchievement()` calls `syncAchievement()`
- `pushToCloud(familyId)` reads all Dexie tables and fires all sync functions in parallel — called from `handleCreateRoom()` in Home.tsx
- `pullFromCloud()` updated to also pull stats (via `getDoc`) and achievements (via `getDocs`) into Dexie
- `clearAllData()` added to `operations.ts` — clears all 5 Dexie tables; called from StatsPage "Clear All Data" button

**StatsPage new features (commit 3d174db, 2026-06-23):**
- Records: Longest Game (amber) + Fastest Win (green) in Charts tab — computed from `history.roundCount`
- Weekly Activity: 8-week BarChart (blue cells, 160px) showing games played per week
- Clear All Data: two-step confirm button at bottom of StatsPage (outside the `!loaded` ternary); calls `clearAllData()` + `clearRoomCode()` + `init()` + `onBack()`

**CRITICAL — ingestCloudRound race condition (fixed 2026-06-23):**
- Firestore SDK immediately applies `setDoc` to its local cache BEFORE network round-trip. This triggers `onSnapshot` on the same device that wrote the doc — potentially BEFORE `confirmRound()`'s `set()` runs.
- Initial naive check `if (rounds.some((r) => r.id === round.id)) return` passes (rounds=[] at start of ingest), then `await putRound` completes AFTER `confirmRound`'s `set({ rounds: [round1] })` runs, so the ingest's functional `set((s) => [...s.rounds, round])` appends a DUPLICATE (s.rounds already has round1).
- Fix: double-check INSIDE the functional setter: `set((s) => { if (s.rounds.some(...)) return s; return {...} })` — the functional setter always has the latest state at call time, so it won't add a round that another set() already added.

**KNOWN BUG — Undo + Firebase "modified" event re-adds round (NOT fixed, 2026-06-23):**
- Firestore fires onSnapshot TWICE per write: (1) "added" with `hasPendingWrites=true` (local cache, immediate), (2) "modified" with `hasPendingWrites=false` (server confirmation, ~1-4s later)
- Both events hit `ingestCloudRound`. If the round is still in state, the double-check returns early for both — safe.
- BUT if `undoLastRound()` runs BETWEEN event 1 and event 2: event 2 fires after undo, round is not in state, double-check passes, round gets re-added. UI shows Round 2 again after undo.
- Fix options: (a) filter `hasPendingWrites` events in `subscribeToRounds` — only process confirmed writes; (b) maintain a `deletedRoundIds: Set<string>` in store and skip re-ingestion; (c) handle `change.type === "removed"` to undo state (would also fix propagation issue below).

**KNOWN LIMITATION — Undo doesn't propagate to remote devices (2026-06-23):**
- `undoLastRound()` calls `deleteRoundFromCloud(deleteDoc)` which fires a Firestore "removed" event.
- `subscribeToRounds` only handles `change.type === "added" | "modified"` — "removed" is silently ignored.
- Remote devices stay on their current Round N; they never see the undo. Confirmed in Test 18.
- Fix: handle `change.type === "removed"` in `subscribeToRounds` and add a `removeIngestedRound(roundId)` action in the store that filters the round out of `state.rounds`.
