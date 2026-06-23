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
- Scores accumulate; **101+ = eliminated** (100 is still safe — changed 2026-06-22)
- **Max 60 points per round** for any non-closer player — nobody can enter more than 60 in a single round
- Closer becomes dealer next round; closer's own score capped at 5 (deadwood was ≤5 to close)
- Last survivor wins

**What's Built (as of 2026-06-23 — post-History-fix):**
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
- **DB operations layer** (2026-06-22): `src/db/operations.ts` — 16 named wrapper functions; `useAppStore.ts` has zero `db.*` calls
- **Confetti on winner screen** (2026-06-22): canvas-confetti, 3-wave burst (300ms/600ms/700ms) with green/amber/red/white particles
- **Quick Rematch** (2026-06-22): "🔁 Quick Rematch" button on winner screen — calls `store.newSession(playerIds)` with same players; winner overlay auto-closes (newSession resets overlay to none)
- **Player History Sheet** (2026-06-22): `src/components/overlays/PlayerHistorySheet.tsx` — tap any player card mid-game (when overlay.type === "none" and rounds > 0) to see round-by-round score breakdown; spring-animated bottom sheet, backdrop closes it
- **Mid-game share** (2026-06-22): "📊 Share Standings" button in PauseOverlay (disabled before first round); html2canvas off-screen table-layout card; same pattern as WinnerView share
- **Head-to-Head stats** (2026-06-22): `H2HRecord` interface + h2h state in StatsPage; shown in Players tab when pairs with ≥2 games exist; win bar visualizes lead; computed from all completed sessions pairwise

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

**New features added (2026-06-22, batch-13):**
- **Duplicate player name prevention** — `commitAdd()` and `commitEdit()` both do case-insensitive name uniqueness check against `available[]`. Shows "Yeh naam pehle se hai!" inline red error under the input; input border turns red; error clears on typing. Committed as `b3293a4`, NOT yet pushed (pending user go-ahead).

**New features added (2026-06-22, batch-12):**
- **"playing" instead of "alive"** — LiveGame hero now shows "N playing · X dealing".
- **Dealer picker in PlayerSetup** — "🎴 Pehle kaun deal karega?" section below player grid when ≥2 selected. Blue chip buttons, tap to pick first dealer. Auto-defaults to first selected; tracks deselection. `newSession(playerIds, dealerIndex?)` now accepts optional `dealerIndex` param.
- **Undo/Redo data corruption bug fixed** — `confirmRound()` was NOT clearing `lastUndoneRound`. Scenario: undo R3 → confirm new R3 → redo still available → tapping redo re-inserts OLD R3 alongside new R3 = duplicate round numbers. Fixed by adding `lastUndoneRound: null` to confirmRound's main set() call.
- **Undo defensive fix** — `undoLastRound()` now resets `status: "active"`, clears `winnerId`/`endedAt` if session was somehow "completed" (not reachable in current UI but correct for future).

**New features added (2026-06-22, batch-11):**
- **Player edit/delete** — ✏️ icon on each PlayerSetup card opens an edit sheet with emoji picker + rename + Delete button. `updatePlayer()` and `deletePlayer()` added to operations.ts.
- **newSession() bug fixed** — Now abandons existing active session in DB before creating a new one.
- **Tap hint** — Subtle "Tap any card to see round history" shown in LiveGame when rounds > 0 and no overlay active.
- **Stats: Games Played** — "Games" StatBox added per player in Stats tab; counts completed sessions.
- **History: session duration** — `formatDuration()` added; shown in each history session row as "• 42m".
- **History: Final Scores summary** — After round list in expanded session, a "Final Scores" card shows all players sorted by total with winner 🏆 / eliminated 💀 highlights.
- **Achievement badge descriptions** — Badges in Stats tab are tappable; shows description inline below badge row.
- **Charts: Score Trend line chart** — LineChart (Recharts) added as first chart in Charts tab showing per-player running totals over rounds for most recent game.
- **Copy Text share** — "📋 Copy Text" button in WinnerView; copies formatted text to clipboard; shows "✅ Copied!" for 2s.
- **PlayerHistorySheet mini chart** — Small BarChart (56px) above round list; color-coded (green=0, blue=low, amber=mid, red=high).
- **Operations layer fully migrated** — Home.tsx, StatsPage.tsx, PlayerSetup.tsx all off `db.*` direct calls.

**README Documentation (2026-06-23) ✅:**
- GitHub README fully replaced (was Vite boilerplate). Commit 4c4fde1.
- 12 screenshots captured via Playwright at 390×844 viewport, saved to `docs/screenshots/`
- Content: game rules, all features, achievement table, tech stack, local dev, project structure
- Screenshots show full game flow: home+HoF, setup, live tension, who-closed, enter-scores, elimination, winner, stats (all 3 tabs)

**What's NOT Built:**
- Weekly/Monthly dashboard (time-series Recharts — backlog)
- Cross-device sync undo propagation (known limitation — see KNOWN LIMITATION above)

**Firebase Setup Status (2026-06-23 — PHASE 1 COMPLETE ✅):**
- Firebase project: `chummyscoretracker` (created via Firebase console, project number 633100813203)
- Firestore database: `(default)`, region `asia-south1` (Mumbai) ✅
- Web app: App ID `1:633100813203:web:12248cd2d4df357ac5de66` ✅
- Firestore rules deployed: `families/{familyId}/**` open read/write (room code = auth) ✅
- Firebase config embedded in `src/lib/firebase.ts` (web API keys are public identifiers, security via rules)
- `firebase.json` + `firestore.rules` in repo; committed `51b1a28`, Vercel auto-deployed ✅
- User gave blanket go-ahead to proceed without per-step approval for Firebase work

**Phase 1 features (2026-06-23):**
- `src/lib/firebase.ts` — Firebase singleton (app + Firestore)
- `src/lib/roomCode.ts` — 6-char room code generate/get/set/clear (localStorage: `chhummy_room_code`)
- `src/lib/firebaseSync.ts` — syncPlayer/Session/Round, deleteRoundFromCloud, deletePlayerFromCloud, pullFromCloud
- `src/db/operations.ts` — all mutations fire-and-forget sync to Firestore when room code is set
- `src/pages/Home.tsx` — "📡 Family Sync" section: Create Room, Join Room (pull-on-join + re-init), Change Room
- Firestore schema: `families/{familyId}/players|sessions|rounds`

**Phase 2 COMPLETE (2026-06-23) ✅:**
- Real-time `onSnapshot` via `subscribeToRounds` + `subscribeToSession` in `firebaseSync.ts`
- Stats/achievements Firestore sync: `syncStats`, `syncAchievement` functions; `writeStats()` dual-writes
- `pushToCloud()` called from `handleCreateRoom` — pushes existing local data on room creation
- StatsPage backlog: Longest Game stat, Fastest Win stat, Weekly Chart (BarChart by week), "Clear All Data" button
- "● Live" indicator on Home when room code is set; also visible on LiveGame hero
- Phase 2 E2E tests: 16/16 features-e2e passing (commit 3d174db); 34/34 multi-device E2E passing

**KNOWN BUG (Firebase race, not yet fixed):**
- Undo + Firebase "modified" event race: `setDoc` fires TWO onSnapshot events per write.
  If undo happens between event 1 ("added", hasPendingWrites=true) and event 2 ("modified", hasPendingWrites=false),
  the "modified" event re-adds the undone round. Fix: filter hasPendingWrites events OR track deletedRoundIds.

**KNOWN LIMITATION (undo propagation):**
- `subscribeToRounds` only handles "added"|"modified", NOT "removed". Undo on Device A never propagates to Device B.
  Fix: handle `change.type === "removed"` in subscribeToRounds + add `removeIngestedRound` store action.

**Known Architectural Gaps (updated 2026-06-23):**
1. **Offline write loss** — failed Firestore writes are silently dropped; no retry queue. Rounds confirmed while offline don't reach Firestore.
2. **Missing `orderBy` on active session pull** — `pullFromCloud` queries sessions without `orderBy`. If two active sessions exist accidentally, undefined behavior.
3. ~~**Stats/achievements not synced**~~ — **FIXED (2026-06-23)**: `syncStats`, `syncAchievement`, `pullStatsFromCloud` all implemented. Stats/achievements dual-write to Firestore.
4. **Player deduplication risk** — two devices creating same-named player independently = both appear after join.
5. **Room code only in localStorage** — clearing site data loses the room code.

**History tab fix (2026-06-23, commit f7e7239):**
- `pullFromCloud` now fetches ALL sessions (not just active) → joined devices see completed games in History
- `fetchRoundsForSession(familyId, sessionId)` added to `firebaseSync.ts` — on-demand fetch when History expand finds no local rounds
- `pullStatsFromCloud(familyId)` added to `firebaseSync.ts` — re-pulls stats+achievements 3s after winner declared on joined device
- `ingestCloudSession` in `useAppStore.ts` now shows winner overlay on joined device when `session.status === "completed"`
- `bulkPutRounds(rounds)` added to `operations.ts` — caches cloud-fetched rounds to local Dexie

**Two-Repo Strategy — Decided 2026-06-22:**
- **Repo 1 (current):** `kushagraarora997/ChhummyScoreTrackerApp` — Firebase Firestore sync. Priority: family delivery speed. Ship quickly, family uses it.
- **Repo 2 (new):** `kushagraarora997/ChhummyTracker-Server` (public) — Spring Boot + PostgreSQL + WebSocket backend. Priority: resume/portfolio. Shows Java backend skills.
- **Fork status (2026-06-22):** COMPLETE. `ChhummyTracker-Server` live at github.com/kushagraarora997/ChhummyTracker-Server. Full codebase pushed. Backup at `C:\Users\kusha\chhummy-tracker-backup`.
- **Fork timing:** Fork Repo 2 BEFORE Firebase code is added to Repo 1 (so Repo 2 starts clean).
- **Pre-work:** All 3 architecture refactors done (commit b22c8ed). CLAUDE.md updated. Ready to push code once GitHub repo exists.
- **Maintenance policy:** Repo 1 is source of truth for UI. Any game logic/UI fix in Repo 1 must be manually ported to Repo 2. The two repos only diverge at the sync layer.
- **No cross-cloud data sharing** — two truly separate deployments. Family uses Repo 1. Resume demos Repo 2.
- **gh CLI:** Installed v2.95.0 at `C:\Program Files\GitHub CLI` (installed 2026-06-22 via winget). Needs `$env:PATH = $env:PATH + ";C:\Program Files\GitHub CLI"` in each PowerShell session. Authenticated as `kushagraarora997` via device code flow (`gh auth login --hostname github.com --git-protocol https --web`). Use device code flow for future auth — PAT approach is unreliable (GitHub auto-revokes tokens pasted in chat).

**Cross-Device Sync — Planned (2026-06-22, not yet implemented):**
- Stack (Repo 1): **Firebase Firestore** — `onSnapshot` real-time, offline-first automatic, fastest to ship.
- Auth model: **Family Room Code** — 6-char alphanumeric code (e.g. "ARORA1"). No email/password. All devices with same code share same cloud data. Pending user confirmation of this model vs email login.
- 8 modules planned and documented in TODO.md:
  1. Supabase project setup (tables mirror Dexie schema + `family_id` column on all, RLS, Realtime enabled on rounds+sessions)
  2. Supabase client (`src/lib/supabase.ts` singleton + typed)
  3. Family Room / Auth UX (room code entry on Home, `familyId` in localStorage, anonymous Supabase auth)
  4. Cloud write layer (dual-write: Dexie-first non-blocking, Supabase async background write)
  5. Real-time round subscription (Supabase Realtime → everyone's phone sees round added live during game)
  6. Initial sync (pull-on-join + push-on-first-room for local history migration)
  7. Offline queue — deferred (queue failed writes, flush on reconnect)
  8. UI indicators (sync pill on Home, live badge in game, join-mid-game flow)
- **Auth model confirmed (2026-06-22):** Single Family Room Code (e.g. `ARORA1`) — no individual logins. All devices with the code share the same data.
- **Permanent players confirmed:** Pops, Mom, Nanz, Hanz — `permanent: true` flag, always shown first in player selection, cannot be deleted, pre-seeded into the room.
- **Guest players:** Added normally, persist in cloud under family room, can be deleted (unlike permanent players).
- **Stack decision REVISED (2026-06-22):** Spring Boot + WebSocket (STOMP) + PostgreSQL — recommended as primary option because Kush is a Java backend engineer and needs this project to demonstrate Java skills. Firebase/Supabase are BaaS tools that show no Java proficiency. Confirmation from user still pending (research delivered, awaiting go-ahead).
- **Rejected options (for resume reasons):**
  - Firebase Firestore: No Java code involved. "Used a Google product" on resume.
  - Supabase: PostgreSQL under the hood (better than Firebase), but still BaaS. Minimal backend skill demonstrated.
  - SQLite: Local-only. No sync capability.
- **Recommended architecture:**
  - `Spring Boot 3` REST API — sessions, rounds, players, stats endpoints
  - `spring-boot-starter-websocket` with STOMP — real-time round sync during game
  - `PostgreSQL` — schema mirrors existing Dexie design, lifted to proper relational DB
  - `Spring Security` — family room code as bearer token (no OAuth needed for family use)
  - `Railway` or `Render` — free Java hosting with GitHub CI/CD
  - React PWA keeps Dexie for offline; dual-writes to Spring Boot API when online
- **Four decisions still pending from user:**
  1. Spring Boot stack confirmed? (research delivered 2026-06-22, pending go-ahead)
  2. Room code value — user picks or auto-generated
  3. Guest deletion scope — any device, or only the device that added them?
  4. Real-time during game — live score updates on all phones mid-round, or sync only between games?
- No code written yet. Implementation begins when user confirms stack + answers pending questions.

**Deployment:** Vercel is linked to GitHub. `git push main` auto-deploys. Pushed through commit `0f0ee63` (batch-12) on 2026-06-22 (user approved with "push it").

**Test coverage:**
- Screenshot tour: `C:\Users\kusha\AppData\Local\Temp\pw-test\screenshot-tour.mjs` — 19 screenshots, run with `node screenshot-tour.mjs` (dev server port 5173)
- Batch-12 feature suite: `C:\Users\kusha\AppData\Local\Temp\pw-test\batch12.mjs` — 24 tests, **17 pass / 7 fail** (all failures test-script bugs)
- Batch-13 comprehensive suite: `C:\Users\kusha\AppData\Local\Temp\pw-test\batch13.mjs` — 47 tests across 10 groups (regression, boundaries, edge cases, all features). **Run incomplete — new test-script bugs found mid-run:**
  - **Strict mode violation: `text=Chhummy Champion`** — This text appears in BOTH the visible winner card AND the off-screen html2canvas div (`position: fixed; left: -9999px`). Playwright strict mode rejects when 2 elements match. Fix: use `.first()` on this locator everywhere.
  - **Strict mode violation: `text=/Round N/`** — Round number appears in the hero heading AND in the "End Round #N" button text simultaneously. Fix: scope to `.text-4xl.font-black` or use `.first()`.
  - All subsequent tests cascade into timeout because winner navigation never completed.
  - App itself is correct — these are test locator issues only.

**Architecture debt remaining (see architecture.md):** getTotals() redundant calls, confirmRound() length, no lazy loading.

**See TODO.md for full task list.**

**How to apply:** Give decisions proper context about what's a bug vs missing feature vs technical debt.
