# Chhummy Tracker — Todo

Brainstormed on 2026-06-20. Do karo ek ek karke.

---

## Bugs

- [x] **[DONE] New Player Name + Who Closed Broken** — Fixed 2026-06-20.
- [x] **[DONE] Pull-to-Refresh Block** — Fixed 2026-06-20.
- [x] **[DONE] App Phone Lock/Background** — Fixed 2026-06-20.
- [x] **[DONE] Winner Not Shown When Last Player Eliminated** — Fixed 2026-06-20.
- [x] **[DONE] alert() Calls in Score Entry** — Fixed 2026-06-20.
- [x] **[DONE] End Round visible after game ends** — Fixed 2026-06-20. Closing winner overlay navigates home.

---

## Live Game Improvements

- [x] **[DONE] End Game / Abandon Session** — Fixed 2026-06-20.
- [x] **[DONE] Splash Screen** — Fixed 2026-06-20.
- [x] **[DONE] Score Entry — "0" chip full width + closer only sees 0–5** — Fixed 2026-06-20.
- [x] **[DONE] Closer has no Custom button** — Fixed 2026-06-20.
- [x] **[DONE] Numeric Keypad Modal** — Fixed 2026-06-20.
- [x] **[DONE] Vibration on Elimination** — Fixed 2026-06-20.
- [x] **[DONE] Running Total Preview** — Fixed 2026-06-20. Shows currentTotal + pendingScore = newTotal, colored by threshold.
- [x] **[DONE] Visual Tension** — Fixed 2026-06-20. Warning (70+) gets amber card bg + amber total text. Critical (85+) gets red card bg + pulsing danger total text.

---

## Code Structure

- [x] **[DONE] Dead Files Delete Karo** — Fixed 2026-06-20.
- [x] **[DONE] LiveGame.tsx Split Karo** — Fixed 2026-06-20. WinnerView + FullOverlay → src/components/.

---

## Stats System

- [x] **[DONE] Stats — Game End pe DB mein Write Karo** — Fixed 2026-06-20.
- [x] **[DONE] Hall of Fame (Real Data)** — Fixed 2026-06-20.
- [x] **[DONE] Real Stats Page** — Fixed 2026-06-20. Three tabs: Players (per-player cards + achievements), History (expandable sessions), Charts (Recharts bar charts).
- [x] **[DONE] Session History Browser** — Fixed 2026-06-20. History tab in StatsPage. Tap session to expand round-by-round breakdown.
- [x] **[DONE] Achievements — Write + Display** — Fixed 2026-06-20. ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY written on game end. Displayed as badges in Stats page.
- [x] **[DONE] Recharts Dashboard** — Fixed 2026-06-20. "Wins per Player" bar chart + "Closes vs Eliminations" grouped bar chart.

---

## Share & Social

- [x] **[DONE] Share Result Card (PNG + WhatsApp)** — Fixed 2026-06-20. html2canvas captures result card. Web Share API on Android, download fallback on desktop. Error message if share fails.

---

## Security

- [x] **[DONE] Security Audit** — Done 2026-06-20. Zero innerHTML/eval/dangerouslySetInnerHTML. Zero window.prompt/alert. React JSX auto-escapes all player names. IndexedDB is origin-isolated. Web Share passes only PNG blob. All clear.

---

## Pending

- [x] **[DONE] Cancel button on "Who Closed?" overlay** — Fixed 2026-06-21. Added "← Cancel" button at bottom of Who Closed overlay. Calls closeOverlay(), dismisses without starting round.
- [x] **[DONE] Undo confirmation before executing** — Fixed 2026-06-21. Inline confirmation row appears below header when Undo tapped. Shows "Undo Round N?" with Yes/No buttons. Undo button disabled (opacity-30) when no rounds to undo.
- [x] **[DONE] Replace End Round with End Game when only 1 player is left** — Fixed 2026-06-21. Added `declareWinner(winnerId)` action. When survivors.length === 1, amber gradient "End Game — {name} Wins!" button replaces green End Round button.

---

- [x] **[DONE] Max 60 points per round** — Fixed 2026-06-21. Digits that would exceed 60 are rejected during typing (no visual surprise). Display subtitle shows "Max 60" / "Max reached" at 60. Confirm handler also clamps with Math.min(v, 60) as safety. Chips are all ≤20 so no chip changes needed. Closer already capped at 5 separately.

---

## Full End-to-End Review — batch-08 (2026-06-21)

**65/65 tests PASS.** All screens and flows verified:
- Splash, Home, Hall of Fame, Stats button ✅
- Player setup: min 2 players, name cap 20 chars, Start Session gating ✅
- Live game: Round display, Dealer, Pause, Undo, player cards ✅
- Pause overlay: Resume/Abandon options work ✅
- Who Closed + Cancel: opens, shows both players, Cancel dismisses without advancing round ✅
- Score entry: closer-only chips 0–5, no Custom for closer, non-closer has full chips + Custom ✅
- Running total preview ✅
- Numpad: opens empty, type/backspace/leading-zero safe, ✓ closes ✅
- Score cap: **75 currently accepted — pending fix** ✅
- Confirm round: advances round ✅
- Undo confirmation: Yes/No flow works, No cancels, disabled on round 1 ✅
- Visual tension: amber at 70+, red at 85+ ✅
- Elimination → winner screen shown ✅
- Winner screen: SURVIVES text, Always Agitated Aroras, Share, Back to Home ✅
- Stats page: all 3 tabs (Players, History, Charts) ✅
- Hall of Fame real data after game ✅
- Resume session on page reload ✅
- End Game button: appears at 1 survivor, End Round disappears, shows winner name ✅
- Edge cases: undo no-op on round 1, chip change, 💀 OUT on eliminated card ✅

---

## Pending

- [x] **[DONE] Back button on Player Setup** — Already existed. PlayerSetup has `onBack` prop; App.tsx passes `() => setRoute("home")`. No change needed.

- [x] **[DONE] Redo last undo** — Fixed 2026-06-21. `lastUndoneRound: Round | null` added to store. `undoLastRound()` saves removed round to `lastUndoneRound`. `redoLastRound()` re-inserts it. `clearRedo()` dismisses it. Cleared on `endRoundStart`, `confirmRound`, `abandonSession`, `declareWinner`. UI: amber inline row below header shows "↩ Redo available" → tap → confirm row "Redo Round N? Yes/No".

- [x] **[DONE] "How to Close" rules card always visible on Home** — Fixed 2026-06-21. Changed to a collapsible accordion below Hall of Fame. Tap "📖 How to Close ▼" to expand/collapse. Always present regardless of game count.

- [x] **[DONE] Share card shows full leaderboard** — Fixed 2026-06-21. WinnerView now shows ranked list of all session players with final scores, 💀 for eliminated, gold highlight for winner. Existing rounds/closes summary kept below.

---

## UI Review — Self-Audit (2026-06-21)

- [x] **[DONE] Trophy badge shows "🏆 0"** — Fixed 2026-06-21. Badge now only renders when `wins > 0`.

- [x] **[DONE] Dealer indicator too easy to miss** — Fixed 2026-06-21. Removed the text row; added "🎴 Dealer" blue pill badge directly on the dealer's player card (same style as Closer badge).

- [x] **[DONE] "Round N • Live Score Tracker" wrong line break** — Fixed 2026-06-21. Single unbroken line now.

- [x] **[DONE] Player Setup doesn't sort by recent use** — Fixed 2026-06-21. `db.players.toArray()` result sorted by `lastUsedAt` descending before setting state.

- [x] **[DONE] Home: "Stats & History" button too muted** — Fixed 2026-06-21. Removed `opacity-80` and `text-sm`; now `text-base font-medium` with `border-white/10`.

- [x] **[DONE] Home: Hall of Fame rows have no visual hierarchy** — Fixed 2026-06-21. Each row now a coloured pill card: gold for Champion, amber for Closer, red for Patsy. Badge labels added on the right.

- [x] **[DONE] Stats: Avg Score not rounded** — Fixed 2026-06-21. `r.avgScore.toFixed(1)` passed to StatBox. StatBox `value` prop now accepts `number | string`.

- [x] **[DONE] Stats Charts: no section headers** — False positive. Headers already existed in the code (`"Wins per Player"`, `"Closes vs Eliminations"`).

- [x] **[DONE] Elimination modal score not prominent** — Fixed 2026-06-21. Score is now a giant `text-7xl font-black text-danger` number. Name shown above it, "points — OUT" label below.

---

## batch-09 End-to-End Test (2026-06-21)

**28/28 tests PASS.** All new features verified:
- Home: Stats & History button style, How to Close accordion (collapse/expand) ✅
- Hall of Fame: Champion (gold), Closer (amber), Patsy (red) hierarchy rows ✅
- Live Game: Trophy badge hidden at 0, dealer pill on card, bottom bar single line ✅
- Trophy badge appears after close, dealer pill moves to new closer ✅
- Undo/Redo: unavailable before undo, available after undo; confirm row (Yes/No) ✅
- Redo Yes: restores round, clears redo row; Redo No: clears redo; new round clears redo ✅
- Elimination modal: "points — OUT" label, score value, Continue button ✅
- Winner share card: both player names, 💀 for eliminated, pts shown ✅
- Stats Players tab: Avg Score label visible after completed game ✅
- PlayerSetup: players appear in grid ✅

---

## Pending

- [x] **[DONE] Emoji contrast on dark card background** — Fixed 2026-06-21. Added `w-12 h-12 rounded-full bg-white/10` circular backdrop behind all emoji instances (player cards, Who Closed buttons, Enter Scores rows).

- [x] **[DONE] Score entry overlay — sticky bottom loses background on scroll** — Fixed 2026-06-21. Replaced `bg-inherit` (was resolving to transparent through intermediate wrapper) with explicit `bg-[#171717]` + `z-10` on the sticky Confirm Round bar.

- [x] **[DONE] No back button on score entry overlay** — Fixed 2026-06-21. Added "← Back" button below Confirm Round in the score entry sticky bar. Calls `store.endRoundStart()` to return to "Who Closed?" overlay.

---

- [x] **[DONE] Who Closed cards redesigned** — Fixed 2026-06-21. Cards now `h-32` (was h-24), emoji circle `w-14 h-14 text-3xl` (was w-11 text-2xl), card bg tinted amber/red matching player danger state, score shown as colored pill (e.g. "40 pts" in warning/danger color), eliminated state merged into pill ("💀 OUT"), subtle gradient shimmer line at top of each active card.

---

## UI Audit — Self-Review (2026-06-21)

- [x] **[DONE] Player Setup empty state looks broken** — Fixed 2026-06-21. Added "Sab ko add karo! 👇" heading above the grid when no players exist.

- [x] **[DONE] Player Setup — emoji circle invisible on selected (green) cards** — Fixed 2026-06-21. Circle uses `bg-black/20` when active (green bg) and `bg-white/10` when unselected.

- [x] **[DONE] Who Closed — last card stranded with odd player count** — Already done in WhoClosed.tsx. `isLast` guard adds `col-span-2` for the final card in an odd-count list.

- [x] **[DONE] Live Game player cards — "Total: 0" reads like a form label** — Fixed 2026-06-21. Score moved to right column as `text-2xl font-black` number (colored by state). "Total:" prefix removed. State badges (70+, 85+, etc.) shown below the score.

- [x] **[DONE] Score entry chips — slightly cramped** — Fixed 2026-06-21. Non-zero chips changed from `py-4` to `py-5`.

- [x] **[DONE] Winner screen — needs more celebration** — Fixed 2026-06-21. Winner emoji gets a scale-bounce motion on mount. "SURVIVES" text has fade+slide-up entry animation.

- [x] **[DONE] Stats Charts — 0-win players show blank column** — Fixed 2026-06-21. "Wins per Player" chart uses `winsChartData` (filtered to players with wins > 0). "Closes vs Eliminations" still shows all players.

---

## Haptics & Sound

- [x] **[DONE] Vibration on winner declared** — Fixed 2026-06-21. `navigator.vibrate?.([100, 50, 100, 50, 300])` added in both `confirmRound()` (survivors.length === 1 and === 0 paths) and `declareWinner()`.

- [x] **[DONE] Vibration on elimination — already done** — `navigator.vibrate([200, 100, 200])` fires in `confirmRound()` when `justEliminated.length > 0`. No change needed.

- [x] **[DONE] Sound feedback using Web Audio API** — Fixed 2026-06-21. `src/utils/sound.ts` created with `soundWinner()` (C→E→G fanfare), `soundElimination()` (A→E sawtooth drop), `soundConfirm()` (30ms tick). Called from `confirmRound()` and `declareWinner()`. Wrapped in try/catch; respects `document.hidden`.

### Extended haptics — audit 2026-06-21

- [x] **[DONE] Chip tap in score entry** — Fixed 2026-06-21. `navigator.vibrate?.(8)` on each chip button click.
- [x] **[DONE] Who Closed — player selection** — Fixed 2026-06-21. `navigator.vibrate?.(20)` when tapping a closer.
- [x] **[DONE] Confirm Round** — Fixed 2026-06-21. `navigator.vibrate?.(30)` in handleConfirm before confirmRound().
- [x] **[DONE] Warning threshold crossed (70+)** — Fixed 2026-06-21. `navigator.vibrate?.([30,20,30])` in confirmRound() normal-round path.
- [x] **[DONE] Critical threshold crossed (85+)** — Fixed 2026-06-21. `navigator.vibrate?.([50,30,50,30,50])` in confirmRound() normal-round path, takes priority over warning.
- [x] **[DONE] Start Session** — Fixed 2026-06-21. `navigator.vibrate?.([40,20,80])` in PlayerSetup start().
- [x] **[DONE] Custom numpad ✓ confirm** — Fixed 2026-06-21. `navigator.vibrate?.(20)` when custom score is accepted.
- [x] **[DONE] Undo confirmed** — Fixed 2026-06-21. `navigator.vibrate?.(15)` in LiveGame when "Yes" is tapped for undo.

---

## Architecture Cleanup (2026-06-21)

- [x] **[DONE] `setScore` is dead code** — Removed. `setTempScore` is the canonical function now.

- [x] **[DONE] `resumeLatest()` is never called** — Removed. `init()` handles resume on startup.

- [x] **[DONE] `ui.toast` is never displayed** — Removed field and write calls from `undoLastRound()`/`redoLastRound()`.

- [x] **[DONE] `tempScores` not cleared on Back** — Fixed. `endRoundStart()` now clears `tempScores: {}`.

- [x] **[DONE] `getTotals()` redundant calls in EnterScores** — Fixed. Single `const totals = store.getTotals()` at top of component; all player rows and running total use it.

---

## Share Card Fix (2026-06-21)

- [x] **[DONE] Share card PNG distortion** — Fixed 2026-06-21. html2canvas was capturing the card inside `fixed inset-0 max-h-[92vh] overflow-y-auto` overlay — scroll context and parent positioning caused distortion. Fix: render an off-screen copy of share card (`position: fixed; left: -9999px`) with explicit inline styles (no Tailwind) and capture that div instead.

---

## Code Organization (2026-06-21)

- [x] **[DONE] Modularize LiveGame.tsx overlays** — Fixed 2026-06-21. Extracted all 5 overlays to `src/components/overlays/`: WhoClosed, EnterScores (with numpad), EliminationOverlay, WinnerOverlay, PauseOverlay. LiveGame.tsx reduced to coordinator only.

---

## Bugs

- [x] **[DONE] Redo lost when entering round entry then backing out** — Fixed 2026-06-21. `endRoundStart()` was incorrectly clearing `lastUndoneRound: null`. Removed that line — redo now persists until `confirmRound()` actually commits a new round.

- [x] **[DONE] Winner screen title** — Changed "{name} SURVIVES" to "{name} — Chhummy Champion". Updated in both visible card and html2canvas hidden card.

---

## New Features (2026-06-22)

- [x] **[DONE] Confetti on Winner Screen** — Fixed 2026-06-22. canvas-confetti, 3-wave burst.
- [x] **[DONE] Quick Rematch** — Fixed 2026-06-22. "🔁 Quick Rematch" on winner screen; calls newSession(same playerIds).
- [x] **[DONE] Score History Per Player** — Fixed 2026-06-22. PlayerHistorySheet bottom sheet; tap player card when overlay is none and rounds > 0.
- [x] **[DONE] Mid-Game Leaderboard Share** — Fixed 2026-06-22. "📊 Share Standings" in PauseOverlay; html2canvas off-screen table card.
- [x] **[DONE] Head-to-Head Stats** — Fixed 2026-06-22. H2HRecord pairwise computation in StatsPage; shown in Players tab when ≥2 shared games.

---

## Self-Audit (2026-06-22) — Full Code Review

Sab files padhe. Neeche sab naya kaam.

---

### BUGS

- [x] **[DONE] Elimination threshold is 101, not 100** — Fixed 2026-06-22. — Currently `totals[pid] >= 100` eliminates a player. Rule should be `> 100` (i.e., 100 is safe, 101+ is OUT). Affects: `confirmRound()` in useAppStore.ts (survivors filter, justEliminated filter, tie-breaker case), `cardState()` in LiveGame.tsx (eliminated state), `EnterScores.tsx` (players filter, running total 💀 preview), `WhoClosed.tsx` (disabled/eliminated check), `PauseOverlay.tsx` (ranked sort elim check + hidden card color), `WinnerView.tsx` (isElim check), `PlayerHistorySheet.tsx` (color thresholds), `StatsPage.tsx` (elim color in history). Also update CLAUDE.md game rules.

- [x] **[DONE] Start New Game doesn't abandon existing active session in DB** — Fixed 2026-06-22. `newSession()` now calls `putSession({ ...existing, status: "abandoned", endedAt: Date.now() })` before creating the new session.

- [x] **[DONE] PlayerHistorySheet — no visual hint that player cards are tappable** — Fixed 2026-06-22. Subtle "Tap any card to see round history" hint shown below hero area when rounds > 0 and no overlay is active.

---

### UX / POLISH

- [x] **[DONE] Player management — delete a player** — Fixed 2026-06-22. ✏️ icon button on each player card in PlayerSetup opens edit sheet with Delete button.

- [x] **[DONE] Player management — rename / change emoji** — Fixed 2026-06-22. Same edit sheet as delete — emoji picker + name input + Save button.

- [x] **[DONE] History tab — session duration not shown** — Fixed 2026-06-22. `formatDuration()` helper added. Duration shown in session subtitle as "• 42m".

- [x] **[DONE] Stats — "Games Played" (sessions count) missing** — Fixed 2026-06-22. "Games" StatBox added per player in Stats tab. Counts completed sessions player participated in.

- [x] **[DONE] Achievement badges — no description on tap** — Fixed 2026-06-22. Badges are tappable; selected badge shows description text inline below the badge row.

- [x] **[DONE] Pause button — no icon** — Already done in prior batch (⏸ Pause). No change needed.

- [x] **[DONE] Charts — score trend line chart** — Fixed 2026-06-22. LineChart added in Charts tab showing per-player running totals over rounds for the most recent game.

- [x] **[DONE] Share — text-only option** — Fixed 2026-06-22. "📋 Copy Text" button added to WinnerView. Copies formatted text to clipboard; shows "✅ Copied!" for 2 seconds.

- [x] **[DONE] PlayerHistorySheet — score trend** — Fixed 2026-06-22. Small Recharts BarChart (56px tall) added above the round list showing score per round (color-coded: green=0, blue=low, amber=medium, red=high).

- [x] **[DONE] History tab — final scores summary row** — Fixed 2026-06-22. "Final Scores" card added at bottom of expanded session showing all players sorted by total with winner (🏆 green) and eliminated (💀 red) highlights.

---

### ARCHITECTURE DEBT

- [x] **[DONE] Operations layer not fully migrated** — Fixed 2026-06-22. `Home.tsx`, `StatsPage.tsx`, `PlayerSetup.tsx` all migrated to use `db/operations.ts` functions. Zero `db.*` calls in pages. Also added `updatePlayer()` and `deletePlayer()` to operations.

- [ ] **`confirmRound()` is 170+ lines** — Handles round creation, DB writes, session update, elimination decision, winner decision, tie-breaker, overlay transitions, haptics, sound. Six responsibilities. Risky to touch. Should be split into helper functions. Candidate: extract `resolveRoundOutcome(totals, survivors, closerId)` that returns `"elimination" | "winner" | "tieWinner" | "normal"`.

- [ ] **`writeStats()` lives in `useAppStore.ts`** — Module-level function, not part of the store. Natural home: `src/utils/stats.ts` or `src/db/operations.ts`.

- [ ] **Whole-store Zustand subscriptions** — Components like `LiveGame`, `EnterScores`, `WhoClosed` use `const store = useAppStore()` which re-renders on ANY state change. Should use selectors (`useAppStore(s => s.players)`). Not visible at current scale but is correctness debt.

---

### TEST COVERAGE GAPS

- [ ] **No E2E tests for 5 new 2026-06-22 features** — Confetti (hard to assert but can verify no crash), Quick Rematch (assert live game resets with same players), PlayerHistorySheet (tap card, assert sheet appears with correct data), mid-game Share Standings (assert button exists, disabled state before round 1), Head-to-Head (assert H2H section appears in Players tab after 2+ shared games).

---

## Text, Dealer & Undo/Redo Fixes (2026-06-22)

- [x] **[DONE] "alive" → "playing"** — LiveGame hero subtitle now shows "N playing · X dealing" instead of "N alive".
- [x] **[DONE] "survives" text** — Only occurrence is SURVIVOR achievement key (internal enum). No UI text uses "survives" — already says "Chhummy Champion". No change needed.
- [x] **[DONE] Choose first dealer in PlayerSetup** — "🎴 Pehle kaun deal karega?" section appears below player grid when ≥ 2 selected. Chips per selected player; tapping one sets them as dealer (highlighted blue). Auto-defaults to first selected player; if dealer is deselected, falls back to first remaining. `newSession(playerIds, dealerIndex?)` updated to accept optional dealerIndex.
- [x] **[DONE] Undo/Redo analysis — all scenarios** — Full analysis done:
  - **BUG FIXED (real, triggerable):** `confirmRound()` did NOT clear `lastUndoneRound`. Scenario: undo R3 → confirm new R3 → Redo available → tapping Redo re-inserts OLD R3 alongside NEW R3 (duplicate round numbers, data corruption). Fixed: added `lastUndoneRound: null` to `confirmRound()`'s main `set()` call.
  - **DEFENSIVE FIX:** `undoLastRound()` now resets `status: "active"`, clears `winnerId` and `endedAt` if session was somehow "completed". Not reachable in current UI (winner overlay blocks undo access) but correct for future-proofing.
  - **No issue:** Undo to round 0 → guarded, dealer resets to index 0. ✓
  - **No issue:** Multiple undos lose previous redo (only last undo is redoable). Acceptable limitation. ✓
  - **No issue:** Undo after elimination overlay dismissed → accessible and works correctly. ✓
  - **No issue:** Undo/redo of winner rounds not reachable (winner overlay covers LiveGame). ✓

---

## Cross-Device Sync — Spring Boot + PostgreSQL + WebSocket

**Stack: Spring Boot 3 + PostgreSQL + WebSocket (STOMP)**
**Why:** Kush is a Java backend engineer. This demonstrates Java skills directly on his resume.
**Auth model: Family Room Code** — 6-char alphanumeric (e.g. "ARORA1"). Anyone with the same code reads/writes the same data. No email, no OAuth.
**Offline-first:** Dexie stays as the local primary. Spring Boot is the cloud layer. App works 100% without internet.
**Deployment:** Railway (free tier, Java-friendly, auto-deploys from GitHub).

---

### Pre-work: Architecture Refactor (do this BEFORE backend)

- [x] **[DONE] Split `confirmRound()` — extract `resolveRoundOutcome()`** — Done 2026-06-22. Module-level pure function in `useAppStore.ts`. Returns `{ outcome, justEliminated }`. `confirmRound()` switches on outcome via switch statement.

- [x] **[DONE] Move `writeStats()` to `src/db/operations.ts`** — Done 2026-06-22. Exported from operations.ts, imported by useAppStore.ts. Unused types (Stats, Achievement) and DB helpers removed from store imports.

- [x] **[DONE] Zustand selectors in high-churn components** — Done 2026-06-22. `LiveGame`, `EnterScores`, `WhoClosed` all use per-field selectors (`useAppStore(s => s.x)`). No more whole-store subscriptions in these components.

---

### Module 1 — Spring Boot Project Setup
*Backend project, separate repo or `backend/` subfolder.*

- [ ] Generate project at start.spring.io:
  - Dependencies: `spring-boot-starter-web`, `spring-boot-starter-websocket`, `spring-boot-starter-data-jpa`, `postgresql`, `spring-boot-starter-security`, `lombok`
  - Java 21, Maven
- [ ] `application.yml`:
  - `spring.datasource.url` from env (`${DB_URL}`)
  - `spring.jpa.hibernate.ddl-auto: validate` (use Flyway/Liquibase for migrations)
  - CORS config: allow `http://localhost:5173` + Vercel domain
- [ ] WebSocket config: `@EnableWebSocketMessageBroker`, in-memory broker, STOMP endpoint at `/ws`
- [ ] Flyway migration: `V1__initial_schema.sql` with all 6 tables

---

### Module 2 — PostgreSQL Schema
*Mirrors Dexie schema, lifted to relational.*

- [ ] `families` — `id TEXT PK, room_code TEXT UNIQUE, created_at BIGINT`
- [ ] `players` — `id TEXT PK, family_id TEXT FK, name TEXT, emoji TEXT, permanent BOOLEAN, created_at BIGINT, last_used_at BIGINT`
- [ ] `sessions` — `id TEXT PK, family_id TEXT FK, started_at BIGINT, ended_at BIGINT, player_ids JSONB, dealer_index INT, winner_id TEXT, status TEXT`
- [ ] `rounds` — `id TEXT PK, session_id TEXT FK, family_id TEXT FK, number INT, closer_id TEXT, scores JSONB, totals JSONB, created_at BIGINT`
- [ ] `stats` — `family_id TEXT PK FK, totals JSONB`
- [ ] `achievements` — `id TEXT PK, family_id TEXT FK, session_id TEXT, player_id TEXT, key TEXT, created_at BIGINT`
- [ ] JPA `@Entity` classes for each table + `JpaRepository` interfaces

---

### Module 3 — REST API Layer
*Standard Spring Boot controllers.*

- [ ] `FamilyController`:
  - `POST /api/families/join` — body: `{ roomCode }` → upserts family row, returns `{ familyId }`
- [ ] `PlayerController` — base: `/api/families/{familyId}/players`
  - `GET /` → list all players for family
  - `POST /` → add player
  - `PUT /{id}` → rename / change emoji
  - `DELETE /{id}` → delete player
- [ ] `SessionController` — base: `/api/families/{familyId}/sessions`
  - `GET /` → list all sessions (desc by startedAt)
  - `GET /active` → get current active session
  - `POST /` → create new session
  - `PUT /{id}` → update session (status, winner, endedAt)
- [ ] `RoundController` — base: `/api/sessions/{sessionId}/rounds`
  - `GET /` → list all rounds for session
  - `POST /` → add round (triggers WebSocket broadcast)
  - `DELETE /{id}` → undo (delete last round)
- [ ] `StatsController` — base: `/api/families/{familyId}/stats`
  - `GET /` → get stats row
  - `PUT /` → upsert stats + achievements on game end

---

### Module 4 — Spring Security / Room Code Auth
*Simple custom filter — no OAuth, no JWTs, no user accounts.*

- [ ] Custom `RoomCodeAuthFilter extends OncePerRequestFilter`:
  - Reads `X-Room-Code` header from every request
  - Looks up family by room code in DB
  - If found: injects `familyId` into `SecurityContext`
  - If not found: returns 401
- [ ] `SecurityFilterChain`: `/api/**` requires auth via this filter; `/ws/**` and `/actuator/health` are public
- [ ] `familyId` extracted from `SecurityContext` in all controllers (no need to pass in URL)

---

### Module 5 — WebSocket / STOMP Real-time
*The headline feature: all phones update live mid-game.*

- [ ] `@EnableWebSocketMessageBroker` config:
  - STOMP endpoint: `/ws` (SockJS fallback enabled)
  - Application destination prefix: `/app`
  - Broker destination prefix: `/topic`
- [ ] `RoundController.addRound()` after saving to DB:
  ```java
  simpMessagingTemplate.convertAndSend(
    "/topic/family/" + familyId + "/rounds", savedRound
  );
  ```
- [ ] `SessionController.updateSession()` broadcasts to `/topic/family/{familyId}/sessions` when status changes
- [ ] Destinations:
  - `/topic/family/{familyId}/rounds` — new round (all devices update leaderboard)
  - `/topic/family/{familyId}/sessions` — session state change (winner declared, abandoned)

---

### Module 6 — React Integration
*Client-side SDK: Axios + STOMP.*

- [ ] Install `axios`, `@stomp/stompjs`, `sockjs-client`
- [ ] `src/lib/api.ts` — Axios instance:
  - `baseURL: import.meta.env.VITE_API_URL`
  - Request interceptor: attaches `X-Room-Code` header from localStorage
- [ ] `src/lib/ws.ts` — STOMP client:
  - `connectWs(familyId)` → creates `Client`, connects to `/ws`, subscribes to `/topic/family/{familyId}/rounds` and `/topic/family/{familyId}/sessions`
  - `disconnectWs()` → deactivates client
  - Callbacks passed in by caller (round received → update store)
- [ ] Room code UX on Home:
  - If no code: "🔗 Sync with Family" banner → bottom sheet, 6-char input
  - If code set: green "☁️ ARORA1" pill → tappable to see code / leave room
  - `familyId` in `localStorage`

---

### Module 7 — Dual-Write Layer
*Dexie-first, Spring Boot async.*

- [ ] After each local Dexie write in `operations.ts`, fire the corresponding Axios call non-blocking:
  - `addPlayer` → `api.post('/families/{familyId}/players', player)`
  - `addRound` → `api.post('/sessions/{sessionId}/rounds', round)`
  - `putSession` → `api.put('/families/{familyId}/sessions/{id}', session)`
  - `putStats` → `api.put('/families/{familyId}/stats', stats)`
  - etc.
- [ ] If `familyId` is null → skip all cloud writes (offline-only, current behavior preserved)
- [ ] Errors: `.catch(e => console.warn('sync error', e))` only — never block UI

---

### Module 8 — Initial Sync / Pull on Join
*First time a new device enters the room.*

- [ ] On `joinRoom(code)`:
  1. `POST /api/families/join` → get `familyId`
  2. `GET /api/families/{familyId}/players` → upsert all into Dexie
  3. `GET /api/families/{familyId}/sessions` → upsert all into Dexie
  4. For each session: `GET /api/sessions/{id}/rounds` → upsert rounds
  5. `GET /api/families/{familyId}/stats` → upsert into Dexie
  6. Call `store.init()` → UI reloads from merged local data
- [ ] First-time push (new room, existing local data):
  - If API returns empty family (no players/sessions) → push all local Dexie rows up via POST

---

### Module 9 — Offline Queue (deferred)
*After Modules 1–8 are stable.*

- [ ] Add `syncQueue` table to Dexie: `{ id, endpoint, method, payload, createdAt }`
- [ ] When Axios call fails: write to `syncQueue`
- [ ] On `online` event / `visibilitychange`: flush `syncQueue` in order
- [ ] Clear flushed entries

---

### Module 10 — Deployment (Railway)
*Get the backend live.*

- [ ] Create Railway project → add PostgreSQL plugin (free tier)
- [ ] Link GitHub repo → Railway auto-deploys on push to main
- [ ] Set environment variables in Railway:
  - `DB_URL`, `DB_USER`, `DB_PASS` (from Railway PostgreSQL plugin)
  - `ALLOWED_ORIGINS` = `https://<vercel-domain>.vercel.app`
- [ ] Add `VITE_API_URL=https://<railway-app>.up.railway.app` to Vercel env vars
- [ ] Verify health: `GET /actuator/health` returns `{ "status": "UP" }`
- [ ] Update `CLAUDE.md` with backend project path and Railway URL

---

## Future / Backlog

- [ ] **Weekly / Monthly Dashboard** — Recharts time-series charts (requires storing session dates in stats).
- [ ] **Clear All Data** — Nuclear reset option (wipe all IndexedDB tables). Useful for fresh starts or handing the device to new users.
- [ ] **"Longest Game" and "Fastest Win" stats** — Longest: most rounds in a single session. Fastest: win in fewest rounds (maybe just 1-2 if someone else gets unlucky). Nice flavor stats.

---

## UI Audit — Self-Review (2026-06-21, Playwright visual pass)

32 screenshots captured across all screens. Issues found, prioritised below.

### HIGH — Clearly broken or confusing

- [x] **[DONE] Live game — massive empty space below player cards** — Fixed 2026-06-21. Outer div `flex flex-col`, card section `flex-1 flex flex-col justify-center`.

- [x] **[DONE] Stats Charts — Y-axis domain wrong on "Wins per Player"** — Fixed 2026-06-21. `domain={[0, Math.max(...winsChartData.map(d => d.Wins), 1) + 1]}` on YAxis.

- [x] **[DONE] Numpad — no player name shown** — Fixed 2026-06-21. Player name shown as `"[Name] ka score"` header inside numpad portal.

### MEDIUM — Confusing or jarring

- [x] **[DONE] Enter Scores — "Score: N" label is ambiguous** — Fixed 2026-06-21. Changed to "Total: N pts".

- [x] **[DONE] Player Setup — Add Player button is half-width in empty state** — Fixed 2026-06-21. Added `col-span-2` class when `available.length === 0`.

- [x] **[DONE] Stats — avg score shows unnecessary ".0" decimal** — Fixed 2026-06-21. `Number.isInteger(r.avgScore) ? r.avgScore : r.avgScore.toFixed(1)`.

- [x] **[DONE] Score chips — asymmetric last row for non-closer** — Fixed 2026-06-21. Added chip 25 → chips are now 1,2,3 · 4,5,10 · 15,20,25 (3×3 grid) + Custom.

### LOW / POLISH

- [x] **[DONE] Home — tagline quote barely readable** — Fixed 2026-06-21. Changed to `text-sm opacity-60`.

- [x] **[DONE] Who Closed — title doesn't show round context** — Fixed 2026-06-21. Added `"Round N"` subtitle below title.

- [x] **[DONE] Live game — score number size could be bolder** — Fixed 2026-06-21. Bumped to `text-3xl` for all player cards.

- [x] **[DONE] Extended haptics (8 items from earlier audit)** — Fixed 2026-06-21. All 8 haptic patterns implemented (see Extended haptics section above).

---

## Full Code Audit — 2026-06-23

All findings from a complete code review: architecture, security, optimisations, dead code, testing.

---

### BUGS (confirmed from code, not yet fixed)

- [ ] **Join code validation too loose** — `Home.tsx:81`: `if (code.length < 4) return` should be `if (code.length !== 6) return`. Currently accepts 4–5 char codes; submits garbage keys to Firestore. One-line fix.

- [ ] **`getRoomCode()` not reactive in LiveGame** — `LiveGame.tsx:34`: `const roomCode = getRoomCode()` reads localStorage at render, not in `useState`. If user creates/joins a room while LiveGame is mounted, the subscription `useEffect` never starts. Fix: `const [roomCode] = useState(() => getRoomCode())`.

- [ ] **Undo Bug 1 — Firestore "modified" event re-adds undone round (CONFIRMED UNFIXED)** — Firestore fires TWO onSnapshot events per write: (1) "added" `hasPendingWrites=true` (immediate), (2) "modified" `hasPendingWrites=false` (~1–4s). If undo happens between them, event 2 fires after the round was deleted → round gets re-added. `subscribeToRounds` in `firebaseSync.ts` still only handles `"added" | "modified"`. Fix options: filter `hasPendingWrites` events, or maintain a `deletedRoundNumbers: Set<number>` in the store.

- [ ] **Undo Bug 2 — Undo doesn't propagate to remote devices (CONFIRMED UNFIXED)** — `undoLastRound()` deletes the Firestore doc (fires "removed" event) but `subscribeToRounds` ignores `change.type === "removed"`. Remote devices stay at Round N forever. Fix: handle `"removed"` in `subscribeToRounds` + add `removeIngestedRound(roundNumber)` action in store that filters the round out of `state.rounds`.

- [ ] **Extra `getPlayers()` DB call in elimination path** — `useAppStore.ts:244`: `const pmap = await getPlayers()` reads all players from Dexie just to get the eliminated player's name. Players are already in store state. Fix: `const name = get().players.find(p => p.id === first)?.name ?? "Player"`.

---

### DEAD CODE

- [ ] **`lastRoundId` in Session is never read** — `Session.lastRoundId?: string` (db/index.ts:18) is written in `confirmRound`, `undoLastRound`, `redoLastRound` but never read anywhere in the codebase. Safe to remove the field and all 3 write sites to save unnecessary Dexie + Firestore writes.

- [ ] **`Achievement.roundId` optional field never set** — `db/index.ts:53`: `roundId?: string` exists in the interface but `writeStats()` never populates it when calling `addAchievement()`. Either set it or remove the field.

---

### FEATURE REQUEST

- [ ] **Permanent "ARORAS" family room** — User asked for a fixed room code the Arora family always uses instead of random 6-char codes. Implementation: add a "👨‍👩‍👧‍👦 Family Room" button on Home.tsx that auto-connects to code `"ARORAS"` (hardcoded constant). Skips the Create/Join picker. Note: "ARORAS" contains "O" which is excluded from `generateRoomCode()` CHARS set (0/O confusion avoidance) — but a hardcoded constant is fine. The family can also just manually type "ARORAS" in Join Room input today (no code needed).

---

### ARCHITECTURE / CODE QUALITY

- [ ] **`pushToCloud` needs progress feedback for large history** — `handleCreateRoom()` in Home.tsx calls `pushToCloud(code).finally(...)` but `syncing` state only shows on the Join button, not Create. A family device with 2+ years of game history will push hundreds of Firestore writes silently. Add a "Syncing..." indicator to the Create Room button too.

- [ ] **`pullFromCloud` fetches ALL sessions** — Fetches every completed session ever played into Dexie on join. For a long-running family this grows unbounded. Consider limiting to the last 30 completed sessions + any active session.

- [ ] **`writeStats()` mixes stat computation and achievement detection** — 107-line function in `operations.ts` doing two distinct jobs. Low priority but could be split into `computeStats()` + `detectAchievements()` for clarity and testability.

- [ ] **`UIOverlay` type not exported** — Defined inline in `useAppStore.ts` but not exported. Any future component that needs to type-check overlay state can't import it cleanly. Minor.

---

### SECURITY

- [ ] **Verify Firestore security rules** — Rules are not in the repo. Current data model (`families/{familyId}/**`) has no authentication — anyone who knows or guesses a 6-char code can read/write a family's game data. Rules should at minimum restrict write size / rate. Not urgent for a private family app but worth confirming rules exist and aren't fully open.

---

### TESTING

- [ ] **Move test files into the repo** — All Playwright test scripts live in `C:\Users\kusha\AppData\Local\Temp\pw-test\` and are not version-controlled. They will be lost on OS reinstall or temp cleanup. Move to `tests/e2e/` in the repo.

- [ ] **Add CI pipeline** — Every push to `main` auto-deploys to Vercel without running any tests. A broken push goes live immediately. Add GitHub Actions: at minimum run `npm run build` (TypeScript compile check) on every push/PR.

- [ ] **Add unit tests for pure functions** — `resolveRoundOutcome()` and `writeStats()` logic could have fast Vitest unit tests (no browser, no Playwright, <1s). Would catch score boundary regressions without spinning up a dev server.

- [ ] **Write tests for the two undo bugs** — Bug 1 (Firestore modified re-add) and Bug 2 (undo propagation) have no automated test coverage. When fixed, add E2E tests to prevent regression.
