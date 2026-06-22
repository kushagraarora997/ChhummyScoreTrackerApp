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
| Charts | Recharts — BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer |
| Share Card | html2canvas — captures DOM node to PNG |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  app/App.tsx              # Route manager — splash | home | setup | live | stats
  pages/
    Splash.tsx             # Intro animation screen (900ms)
    Home.tsx               # Main menu + real Hall of Fame from DB
    PlayerSetup.tsx        # Player selection (2–6 players, maxLength=20 on name input)
    LiveGame.tsx           # Core game screen + 4 overlays (whoClosed, enterScores/numpad, eliminated, pause)
    StatsPage.tsx          # 3-tab stats: Players | History | Charts
  components/
    FullOverlay.tsx        # Reusable bottom-sheet overlay (tone: success | danger)
    WinnerView.tsx         # Winner celebration + html2canvas share card
  store/
    useAppStore.ts         # All game state via Zustand + module-level writeStats()
  db/
    index.ts               # Dexie schema: players, sessions, rounds, stats, achievements
  utils/
    nanoid.ts              # Simple ID generator
  styles/
    index.css              # Tailwind + global styles
```

Real entry point: `src/app/App.tsx`. Ignore `src/App.tsx` — dead Vite template file.

---

## State Flow

```
Splash (900ms)
  → Home
      → PlayerSetup → LiveGame
      → Resume → LiveGame
           → End Round → Who Closed → Enter Scores → Confirm
                → Elimination modal → Continue
                → Winner modal → Back to Home
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

Stats are written by `writeStats()` in `useAppStore.ts` on every game completion. Called from `confirmRound()` winner block.

---

## What Is Built ✅

- Player management (add, reuse, emoji auto-assign, maxLength=20)
- Live game screen with player card states (normal / warning 70+ / critical 85+ / eliminated)
  - Warning: amber card bg + amber total text
  - Critical: red card bg + pulsing danger total text
  - Eliminated: dark red bg, 60% opacity, 💀 OUT badge
- Full round flow (end round → who closed → enter scores → confirm)
  - Closer sees only chips 0–5, no Custom button
  - Score entry shows each player's current total under their name
  - Running total preview after chip selection (colored by threshold, 💀 at 100)
  - Custom Numeric Keypad modal (no window.prompt)
  - Numpad: leading-zero safe, opens empty, backspace works
- Who Closed buttons show current pts (colored amber/red if in danger)
- Elimination full-screen modal (dark red, vibration)
- Winner celebration screen with share card (html2canvas + Web Share API / download fallback)
- Undo last round
- Pause screen (bottom-sheet, blur behind)
- End Game / Abandon session
- Autosave to IndexedDB every action
- Resume session on app reload
- Offline PWA
- Dark premium theme with Framer Motion animations
- Stats system (writeStats on game end)
- Hall of Fame with real data (wins, closes, most eliminated)
- Stats page — 3 tabs:
  - Players: per-player stat cards + achievement badges, sorted by wins
  - History: sessions desc, expandable round-by-round with per-player rows
  - Charts: Wins per Player (green winner bar) + Closes vs Eliminations (legend included)
- Home empty state: "How to Close" quick rules card shown when no games played
- Pull-to-refresh blocked (overscroll-behavior: none)
- visibilitychange handled — resume flow triggers on return from lock screen

## What Is NOT Built ❌

- Weekly / Monthly dashboard (time-series Recharts — backlog, not in TODO)
- Deployment push — Vercel is configured and linked to GitHub. Build works. Push to main is pending explicit user go-ahead.

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

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| batch-05 | 17 | ✅ All pass |
| batch-06b | 6 | ✅ All pass |

Test scripts in `C:\Users\kusha\AppData\Local\Temp\pw-test\`. Run with `node batch05.mjs` from that directory (dev server must be on port 5174).

---

## Deployment Context

Vercel project linked to GitHub repo. `npm run build` produces a valid PWA. Git push to `main` → auto-deploys to Vercel. **Push has not been done yet** — pending explicit user go-ahead.

---

## What NOT to Do

- No backend / no server. IndexedDB is the database. Unless cross-device sync is explicitly asked for.
- No `window.prompt()` or `window.alert()` — custom modals only.
- Don't add comments explaining what code does. Only add a comment if the WHY is non-obvious.
- Don't refactor while fixing a bug unless specifically asked.
- Don't create new files unless necessary.
- Don't implement without user approval — note in `TODO.md` first.
- Don't make the app feel corporate, complicated, or mentally tiring. Family uses this.
