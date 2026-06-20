---
name: architecture
description: Current architecture, known structural issues, rewrite discussion notes
metadata:
  type: project
---

**Routing:** Manual `useState<Route>` in `src/app/App.tsx`. No React Router. Simple, works for this app size.

**State:** Single Zustand store `useAppStore` mixing UI state, game state, DB operations. Fine for now, but stats will need expansion.

**Database:** Dexie (IndexedDB). Schema has 5 tables — players, sessions, rounds, stats, achievements. Only first 3 actively used.

**Key files:**
- `src/app/App.tsx` — route manager (38 lines, clean)
- `src/store/useAppStore.ts` — all state + DB ops (379 lines)
- `src/pages/LiveGame.tsx` — 670 lines, monolith containing: LiveGame screen + Overlays component + FullOverlay component + WinnerView component + all 4 modals
- `src/db/index.ts` — schema definitions (74 lines, clean)

**Known structural problems:**
1. `LiveGame.tsx` is 670 lines — 5 modal components inside one file. Needs splitting.
2. `getTotals()` is a plain function called on every render — should be `useMemo` or derived state.
3. `setScore` and `setTempScore` are duplicates — both do the same thing.
4. **CRITICAL BUG (test-confirmed 2026-06-20):** `newSession()` doesn't refresh `players` in store. Flow: PlayerSetup writes new players to DB via `db.players.add()` but only updates local React state (`available`). `newSession()` saves session + playerIds but never reloads `store.players` from DB. Result: `store.players` stays as it was at `init()` time (empty on first run). LiveGame falls back to `{ name: "Player" }` for every player. Worse: `Overlays()` component filters `store.players` to build the "Who Closed?" button list — if store.players is empty, ZERO buttons render and the round flow is completely broken. Fix: in `newSession()`, add `const players = await db.players.toArray(); set({ players, activeSession: session, rounds: [] })` — one line surgical fix.
5. `window.prompt()` used in PlayerSetup (add player) and LiveGame (custom score). `window.alert()` used for validation in LiveGame. All need custom modals.
6. No lazy loading — all pages imported eagerly in App.tsx.

**Rewrite verdict (discussed 2026-06-20):**
No full rewrite needed. Targeted refactor:
- Split LiveGame.tsx into components
- Fix store player sync bug
- Add stats writing
- Replace browser dialogs with custom modals
React Router not worth adding for this app size. Keep manual routing.

**How to apply:** When touching any of these files, be aware of the structural debt. Fix while working, don't introduce more monolith patterns.
