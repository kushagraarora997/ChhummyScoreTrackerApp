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
- **100 or more = eliminated** from the session
- Last surviving player below 100 = **wins**

### Dealer Rotation:
- The player who closes **becomes dealer for the next round**
- In app = "closer" and "dealer" are the same role

### Closer Constraint (already implemented):
- The closer cannot score more than 5 in their own round (their deadwood was ≤ 5 to close)

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
| Charts | Recharts (imported, not yet used — reserved for stats page) |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
src/
  app/App.tsx          # Route manager — splash | home | setup | live
  pages/
    Splash.tsx         # Intro animation screen
    Home.tsx           # Main menu + Hall of Fame (currently hardcoded)
    PlayerSetup.tsx    # Player selection (2–6 players)
    LiveGame.tsx       # Core game screen (~670 lines — main beast)
  store/
    useAppStore.ts     # All game state via Zustand
  db/
    index.ts           # Dexie schema: players, sessions, rounds, stats, achievements
  utils/
    nanoid.ts          # Simple ID generator
  styles/
    index.css          # Tailwind + global styles
```

Real entry point: `src/app/App.tsx`. Ignore `src/App.tsx` — dead Vite template code.

---

## State Flow

```
Splash (900ms)
  → Home
      → PlayerSetup → LiveGame
      → Resume → LiveGame
           → End Round → Choose Closer → Enter Scores → Confirm
                → Elimination modal → Continue
                → Winner modal → End session → Home
```

Routing is manual (`type Route = "splash" | "home" | "setup" | "live"`). No React Router.

---

## Database Schema (Dexie / IndexedDB)

DB name: `chhummy-db`

| Table | Status | Notes |
|-------|--------|-------|
| **players** | ✅ In use | id, name, emoji, createdAt, lastUsedAt |
| **sessions** | ✅ In use | id, startedAt, endedAt, playerIds[], dealerIndex, winnerId, status |
| **rounds** | ✅ In use | id, sessionId, number, closerId, scores{}, totals{}, createdAt |
| **stats** | ❌ Schema only | Never written to or read. Needs implementation. |
| **achievements** | ❌ Schema only | Never written to or read. Needs implementation. |

Achievement keys: `ICE_COLD | UNTOUCHABLE | SURVIVOR | CLUTCH_MASTER | PATSY`

---

## What Is Built vs What Is Not

### Built ✅
- Player management (add, reuse, emoji auto-assign)
- Live game screen with player card states (normal / warning 70+ / critical 85+ / eliminated)
- Full round flow (end round → choose closer → enter scores → confirm)
- Elimination full-screen alert
- Winner celebration screen
- Undo last round
- Autosave to IndexedDB every action
- Offline PWA
- Dark premium theme with Framer Motion animations

### Not Built ❌
- Stats/History UI — schema exists, zero UI
- Achievements — schema exists, never written or displayed
- Hall of Fame with real data (hardcoded right now)
- Weekly / Monthly dashboard
- Session history browser (round-by-round)
- Vibration on elimination (`navigator.vibrate()`)
- Share Result Card (PNG + WhatsApp)
- Deployment — family cannot access the app yet (only runs locally on dev machine)
- Numeric Keypad Modal (custom score uses `window.prompt()` — unacceptable)
- Autopause on phone lock/background

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

1. **New player name shows "Player"** — `newSession()` uses stale Zustand state, not fresh DB read
2. **Share Result Card broken** — button exists in Winner screen, `onClick` is empty
3. **Pull-to-refresh kills game** — block with `overscroll-behavior: none`
4. **App should survive phone lock** — `visibilitychange` not handled; session is in DB so safe, resume flow needs to trigger

---

## Deployment Context

The family (parents, sister) need to access this app. Options in order of preference:
1. **Vercel or Netlify** — free, one `npm run build` + deploy, accessible from any device anywhere. Best choice.
2. Local network server — only works on same WiFi, fragile.

Deployment is a pending TODO. Until deployed, only the developer can use the app.

---

## What NOT to Do

- No backend / no server. IndexedDB is the database. Unless cross-device sync is explicitly asked for.
- No `window.prompt()` or `window.alert()` — custom modals only.
- Don't add comments explaining what code does. Only add a comment if the WHY is non-obvious.
- Don't refactor while fixing a bug unless specifically asked.
- Don't create new files unless necessary.
- Don't implement without user approval — note in `TODO.md` first.
- Don't make the app feel corporate, complicated, or mentally tiring. Family uses this.
