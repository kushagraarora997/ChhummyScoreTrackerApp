# CLAUDE.md — Chhummy Tracker

This file is for Claude. Read this before touching anything.

---

## What This App Is — The Soul

**Chhummy Tracker** is the official companion app for family Chhummy nights.
Built specifically for the **Arora family**. Tagline: **"Always Agitated Aroras"**.

This is NOT a generic score calculator. It is a lovingly crafted, emotionally aware, family game companion. The emotional goal matters as much as the code:

> The app should feel effortless, warm, fast, premium, and emotionally memorable.
> Nobody should feel like they are "operating software."
> It should feel like "the game night just became easier."

Target users: Parents, siblings, relatives — passing one phone around a table during a card game. Android Chrome primary.

---

## Golden Rule

**Todo.md pehle, kaam baad mein.**

Every task — bug fix, feature, cleanup — goes into `TODO.md` first. Whether to actually do it is decided after. Never start implementing without explicit user go-ahead.

---

## Actual Game Rules (Read Carefully)

**6-card variation of Rummy. 2–6 players.**

### To Close a Round:
- Player MUST have at least **one mandatory pure sequence of 3 cards**
- Remaining 3 cards can be:
  - Another pure sequence
  - A trail (three of a kind)
  - Deadwood sum ≤ 5

### After Someone Closes:
- ALL players reveal their cards
- Each player's remaining hand sum is entered as their round score
- **Multiple players can score 0** — this is normal and valid

### Scores:
- Accumulate across rounds
- **101 or more = eliminated** from the session (100 is still safe)
- **Max 60 points per round** for any non-closer player — nobody can enter more than 60 in a single round
- Last surviving player at 100 or below = **wins**
- **Edge case:** If all players cross 100 in the same round, the player with the lowest total wins. Tie broken by whoever closed that round. (Implemented in `confirmRound()`.)

### Dealer Rotation:
- The player who closes **becomes dealer for the next round**
- In app = "closer" and "dealer" are the same role

### Closer Constraint (implemented):
- The closer cannot score more than 5 in their own round (their deadwood was ≤ 5 to close)
- UI: closer sees only chips 0–5, no Custom button

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 18 + TypeScript (strict) |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (custom dark theme) |
| State | Zustand 4 (with devtools middleware) |
| Database | Dexie 4 (IndexedDB wrapper) |
| Animation | Framer Motion 11 |
| Icons | Lucide React |
| Charts | Recharts — BarChart, LineChart, Bar, Line, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer |
| Share Card | html2canvas — captures DOM node to PNG (off-screen div at `position: fixed; left: -9999px`) |
| Confetti | canvas-confetti — 3-wave burst on winner screen |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  app/App.tsx              # Route manager — splash | home | setup | live | stats
  pages/
    Splash.tsx             # Intro animation screen (900ms)
    Home.tsx               # Main menu + real Hall of Fame from DB
    PlayerSetup.tsx        # Player selection (2–6 players, maxLength=20) + dealer picker
    LiveGame.tsx           # Core game screen; renders overlay components by ui.overlay.type
    StatsPage.tsx          # 3-tab stats: Players | History | Charts
  components/
    FullOverlay.tsx        # Reusable bottom-sheet overlay (tone: success | danger)
    WinnerView.tsx         # Winner celebration + html2canvas share card + confetti
    overlays/
      WhoClosed.tsx        # "Kaun Jeeta Be?" overlay — closer selection
      EnterScores.tsx      # Score chip entry + custom numpad portal
      EliminationOverlay.tsx  # Full-screen dark red elimination hero
      WinnerOverlay.tsx    # Winner celebration (wraps WinnerView)
      PauseOverlay.tsx     # Pause bottom-sheet + mid-game share
      PlayerHistorySheet.tsx  # Bottom-sheet: tap player card → round-by-round breakdown
  store/
    useAppStore.ts         # All game state via Zustand; resolveRoundOutcome() module-level pure fn
  db/
    index.ts               # Dexie schema: players, sessions, rounds, stats, achievements
    operations.ts          # 16 named DB wrapper functions; writeStats() lives here
  utils/
    nanoid.ts              # Simple ID generator
    sound.ts               # soundWinner(), soundElimination(), soundConfirm() via Web Audio API
  styles/
    index.css              # Tailwind + global styles
```

Real entry point: `src/app/App.tsx`. Ignore `src/App.tsx` — dead Vite template file.

**Key architectural invariant:** `useAppStore.ts` has zero `db.*` direct calls. All IndexedDB access goes through `src/db/operations.ts`. `writeStats()` is in `operations.ts`, not the store.

---

## State Flow

```
Splash (900ms)
  → Home
      → PlayerSetup → LiveGame
      → Resume → LiveGame
           → End Round → Who Closed → Enter Scores → Confirm
                → Elimination modal → Continue
                → Winner modal → Quick Rematch | Back to Home
      → Stats → Players tab | History tab | Charts tab
```

Routing is manual (`type Route = "splash" | "home" | "setup" | "live" | "stats"`). No React Router.

---

## Database Schema (Dexie / IndexedDB)

DB name: `chhummy-db`

| Table | Status | Notes |
|-------|--------|-------|
| **players** | ✅ In use | id, name, emoji, createdAt, lastUsedAt |
| **sessions** | ✅ In use | id, startedAt, endedAt, playerIds[], dealerIndex, winnerId, status ("active"/"completed"/"abandoned") |
| **rounds** | ✅ In use | id, sessionId, number, closerId, scores{}, totals{}, createdAt |
| **stats** | ✅ In use | Single "global" row. totals: { wins, closes, eliminations, averageScore, survivalRounds, streaks } |
| **achievements** | ✅ In use | Per-game rows written on completion. Keys: ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY |

Achievement definitions:
- `ICE_COLD` — winner finished with 0 total points
- `UNTOUCHABLE` — winner never reached 70+ at any point
- `SURVIVOR` — winner was at 85+ at some point but still won
- `CLUTCH_MASTER` — player who closed the most rounds (unique leader only)
- `PATSY` — first player to be eliminated

Stats are written by `writeStats()` in `src/db/operations.ts` on every game completion. Called from `confirmRound()` winner block in `useAppStore.ts`.

---

## What Is Built ✅

### Core Game Flow
- Player management: add, reuse, emoji auto-assign, maxLength=20
- Player edit/delete: ✏️ icon on each PlayerSetup card opens edit sheet with emoji picker + rename + Delete button
- Duplicate player name prevention: case-insensitive check in `commitAdd()` and `commitEdit()`; shows "Yeh naam pehle se hai!" inline red error
- Dealer picker in PlayerSetup: "🎴 Pehle kaun deal karega?" section when ≥2 selected; `newSession(playerIds, dealerIndex?)` accepts optional param
- Live game screen with player card states (normal / warning 70+ / critical 85+ / eliminated)
  - Warning: amber card bg + amber total text
  - Critical: red card bg + pulsing danger total text
  - Eliminated: dark red bg, 60% opacity, 💀 OUT badge
  - Trophy badge: 🏆 N closes shown on player card
  - Dealer pill: 🎴 Dealer shown on current dealer's card
- Full round flow (end round → who closed → enter scores → confirm)
  - Closer sees only chips 0–5, no Custom button (deadwood ≤ 5 constraint)
  - Non-closer chips: 0, 1, 2, 3, 4, 5, 10, 15, 20, 25, 30 + Custom
  - **Max 60 per round** for non-closers: numpad rejects digits exceeding 60; "Max 60" subtitle; confirm clamps with Math.min(v, 60)
  - Running total preview after chip selection (colored by threshold: green/amber/red; 💀 emoji at 101+)
  - Score entry shows each player's current total under their name
  - Custom Numeric Keypad modal (renders via createPortal into document.body; no window.prompt)
  - Numpad: leading-zero safe, opens empty, backspace works, shows "[Name] ka score" header
- Who Closed buttons show current pts (colored amber/red if in danger); "Round N" subtitle

### Round Outcome Handling
- Elimination full-screen modal: dark red, vibration `[200, 100, 200]`, giant score hero + "points — OUT" label
  - Only shows when ≥2 survivors remain; 2-player game goes directly to winner
- Winner celebration screen + confetti (canvas-confetti, 3-wave burst at 300/600/700ms, green/amber/red/white)
- Winner share card: html2canvas off-screen div at `position: fixed; left: -9999px` → Web Share API / download fallback
- Copy Text share: "📋 Copy Text" button in WinnerView; copies formatted standings; shows "✅ Copied!" for 2s
- Quick Rematch: "🔁 Quick Rematch" button on winner screen — calls `store.newSession(playerIds)` with same players
- All-out edge case: all players cross 100 same round → lowest total wins; closer is tiebreaker

### Undo / Redo
- Undo last round with confirmation dialog
- Redo last undo (`lastUndoneRound` in store) — cleared on new `confirmRound()` to prevent stale redo after re-play
- Undo defensive fix: resets `status: "active"`, clears `winnerId`/`endedAt` if session was somehow "completed"

### Navigation & Controls
- Cancel button on Who Closed overlay (← Cancel)
- Back button on Enter Scores (← Back → reopens Who Closed)
- End Game button (amber gradient) when only 1 survivor left; calls `declareWinner()`
- Pause screen: bottom-sheet with blurred live game behind, End Game → confirm flow
- Mid-game share: "📊 Share Standings" button in PauseOverlay (disabled before first round); same html2canvas pattern
- Tap hint: "Tap any card to see round history" shown in LiveGame when rounds > 0 and no overlay active
- Player History Sheet: tap any player card (when overlay.type === "none" and rounds > 0) → spring-animated bottom sheet with round-by-round breakdown + mini BarChart (56px, color-coded)
- Back navigation: backdrop tap closes Player History Sheet; backdrop tap closes Pause screen

### Stats & History
- Stats system: `writeStats()` in `src/db/operations.ts` writes stats + achievements on every game end
- Hall of Fame: coloured pill rows — gold/Champion, amber/Closer, red/Patsy
- Stats page — 3 tabs:
  - Players: per-player stat cards (wins, closes, games played, avg score) + achievement badges; achievement badges tappable → shows description inline; sorted by wins
  - History: sessions desc, expandable round-by-round with per-player rows; session duration `formatDuration()`; Final Scores summary card after round list (sorted by total, 🏆/💀 highlights)
  - Charts: Score Trend line chart (per-player running totals, most recent game) + Wins per Player bar (0-win players filtered) + Closes vs Eliminations grouped bar (legend included)
- Head-to-Head stats: `H2HRecord` interface + h2h state in StatsPage; shown in Players tab when pairs with ≥2 games exist; win bar visualizes lead

### Sound & Haptics
- `src/utils/sound.ts` — `soundWinner()` (C→E→G fanfare), `soundElimination()` (A→E sawtooth), `soundConfirm()` (30ms tick)
- Called from `confirmRound()` and `declareWinner()` in `useAppStore.ts`
- Vibration: `[100, 50, 100, 50, 300]` on winner; `[200, 100, 200]` on elimination
- Chip tap: `navigator.vibrate?.(8)` on each chip in EnterScores
- Who Closed player tap: `navigator.vibrate?.(20)` in WhoClosed
- Confirm Round: `navigator.vibrate?.(30)` in EnterScores handleConfirm
- Warning threshold (70+): `navigator.vibrate?.([30,20,30])` in confirmRound() normal-round path
- Critical threshold (85+): `navigator.vibrate?.([50,30,50,30,50])` — takes priority over warning
- Start Session: `navigator.vibrate?.([40,20,80])` in PlayerSetup start()
- Custom numpad confirm: `navigator.vibrate?.(20)` in numpad ✓ handler
- Undo confirmed: `navigator.vibrate?.(15)` on "Yes" tap

### Infrastructure
- Autosave to IndexedDB every action
- Resume session on app reload
- Offline PWA
- `src/db/operations.ts`: 16 named DB wrapper functions; `Home.tsx`, `StatsPage.tsx`, `PlayerSetup.tsx`, `useAppStore.ts` all off `db.*` direct calls
- `resolveRoundOutcome()`: module-level pure function in `useAppStore.ts` (NOT in operations.ts) — determines "normal" | "elimination" | "winner" | "allOut" outcome
- Per-field Zustand selectors in LiveGame, EnterScores, WhoClosed (no whole-store subscriptions)
- Dark premium theme with Framer Motion animations
- Pull-to-refresh blocked (overscroll-behavior: none)
- visibilitychange handled — resume flow triggers on return from lock screen
- PlayerSetup: players sorted by lastUsedAt desc
- Emoji circular backdrop (bg-white/10) behind all emoji instances for dark emoji visibility
- `newSession()` abandons existing active session in DB before creating a new one

---

## What Is NOT Built ❌

- Cross-device sync — planned (Firebase Firestore or Spring Boot + WebSocket + PostgreSQL; see TODO.md for detailed plan and pending decisions)
- Weekly / Monthly dashboard (time-series Recharts — backlog)

---

## Design System

Dark, premium, mobile-first. Feels like a poker app or fantasy sports app. NOT a spreadsheet.

Custom Tailwind theme:
- Background: `#050505` | Card: `#111111` | Elevated: `#171717`
- Text: `#F5F5F5`
- Success: `#22C55E` | Warning: `#F59E0B` | Danger: `#EF4444`
- Border radius: xl = 20px, 2xl = 28px
- Glows: `shadow-glow`, `shadow-amber`, `shadow-red`, `shadow-green`

### UX Principles (non-negotiable)
- **Tap-first** — giant tap targets, one-handed use, phone passed around a table
- **No typing for common actions** — chips for scores, never a keyboard
- **Max 3 taps away** from any gameplay action
- **No `window.prompt()` or `window.alert()`** — ever. Custom modals only.
- **Never clutter the live game screen**

---

## Known Bugs

None currently known. All original bugs fixed. Edge cases covered:
- Both players hitting 100 same round → handled (lowest total wins, closer as tiebreaker)
- Undo at round 0 → safe no-op
- Long player names → input capped at 20 chars, no horizontal scroll
- Undo/Redo data corruption → fixed: `confirmRound()` clears `lastUndoneRound` so stale redo is not available after re-play

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| batch-05 | 17 | ✅ All pass |
| batch-06b | 6 | ✅ All pass |
| batch-14 | 67 | ✅ All pass (67/67) |

Test scripts in `C:\Users\kusha\AppData\Local\Temp\pw-test\`. Run with `node batch14.mjs` from that directory (dev server must be running on port 5173).

batch-14 covers: core flow, score boundaries (0–5 closer, max 60 non-closer), 100/101 boundary, undo/redo (10 tests), player management & names, dealer picker, UI features (history sheet, tap hint, pause, share), visual tension (amber/red/pulse states), all-out edge case, 3-player elimination, stats & history.

**Playwright selector gotcha:** `text=` is case-insensitive partial match. `text=Round History` matches LiveGame's tap hint "Tap any card to see **round history**". PlayerHistorySheet's unique text is `"{N} rounds played"` (line: `{rows.length} rounds played`). Always use the most specific unique text when writing selectors.

---

## Deployment Context

Vercel project linked to GitHub repo (`kushagraarora997/ChhummyScoreTrackerApp`). `npm run build` produces a valid PWA. Git push to `main` → auto-deploys to Vercel. Deployed and live. Latest pushed commit: `0f0ee63` (batch-12 features).

---

## What NOT to Do

- No backend / no server. IndexedDB is the database. Unless cross-device sync is explicitly asked for.
- No `window.prompt()` or `window.alert()` — custom modals only.
- Don't add comments explaining what code does. Only add a comment if the WHY is non-obvious.
- Don't refactor while fixing a bug unless specifically asked.
- Don't create new files unless necessary.
- Don't implement without user approval — note in `TODO.md` first.
- Don't make the app feel corporate, complicated, or mentally tiring. Family uses this.
