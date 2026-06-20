# Chhummy Tracker — Todo

Brainstormed on 2026-06-20. Do karo ek ek karke.

---

## Bugs (Fix These First)

- [x] **[DONE] New Player Name + Who Closed Broken** — Fixed 2026-06-20. `newSession()` now reloads players from DB.

- [x] **[DONE] Pull-to-Refresh Block** — Fixed 2026-06-20. `overscroll-behavior: none` in CSS.

- [x] **[DONE] App Phone Lock/Background** — Fixed 2026-06-20. `visibilitychange` + Pause overlay with Resume/Exit.

- [x] **[DONE] Winner Not Shown When Last Player Eliminated** — Fixed 2026-06-20. `confirmRound()` skips elimination modal when only 1 survivor remains, goes straight to winner overlay.

- [x] **[DONE] alert() Calls in Score Entry** — Fixed 2026-06-20. Replaced with inline `validErr` state message above Confirm button.

---

## Live Game Improvements

- [x] **[DONE] End Game / Abandon Session** — Fixed 2026-06-20. Pause overlay has "End Game" → inline confirm → `abandonSession()` → Home.

- [x] **[DONE] Splash Screen** — Fixed 2026-06-20. Logo 8xl, amber uppercase tagline, longer animation.

- [x] **[DONE] Score Entry — "0" chip full width + closer only sees 0–5** — Fixed 2026-06-20.

- [x] **[DONE] Numeric Keypad Modal** — Fixed 2026-06-20. Bottom sheet numpad replaces `window.prompt()` in both PlayerSetup and LiveGame.

- [x] **[DONE] Vibration on Elimination** — Fixed 2026-06-20. `navigator.vibrate?.([200, 100, 200])`.

- [ ] **Score Entry — Running Total Preview** — While entering scores, dikhao current total + new score = potential new total.

- [ ] **Live Game — Visual Tension** — Warning (70+) aur critical (85+) cards ka visual differentiation zyada dramatic chahiye.

---

## Code Structure

- [x] **[DONE] Dead Files Delete Karo** — Fixed 2026-06-20. `sadasdasd.js`, duplicate `tailwind.config.js`, unused `src/App.tsx` deleted.

- [x] **[DONE] LiveGame.tsx Split Karo** — Fixed 2026-06-20. `WinnerView` → `src/components/WinnerView.tsx`, `FullOverlay` → `src/components/FullOverlay.tsx`.

---

## Stats System

- [x] **[DONE] Stats — Game End pe DB mein Write Karo** — Fixed 2026-06-20. `writeStats()` in `useAppStore.ts` called from winner block. Writes wins, closes, eliminations, avg score, survival rounds, close streaks.

- [x] **[DONE] Hall of Fame (Real Data)** — Fixed 2026-06-20. `Home.tsx` loads from `stats` + `players` DB. Shows top winner, top closer, most eliminated, total games.

- [x] **[DONE] Real Stats Page** — Fixed 2026-06-20. `src/pages/StatsPage.tsx` — per-player card: wins, closes, eliminations, avg score, rounds, best streak. Accessible via "Stats & History" button on Home.

- [x] **[DONE] Share Result Card (PNG + WhatsApp)** — Fixed 2026-06-20. html2canvas captures result card. Web Share API on Android, fallback download on desktop.

- [ ] **Session History Browser** — Past sessions, round-by-round breakdown.

- [ ] **Achievements — Write + Display** — ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY.

- [ ] **Weekly / Monthly Dashboard** — Recharts charts.

---

## Future / Backlog

- [ ] **Security Audit** — PWA local storage, IndexedDB, Web Share API, XSS in player names.
