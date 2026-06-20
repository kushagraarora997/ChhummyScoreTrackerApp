# Chhummy Tracker — Todo

Brainstormed on 2026-06-20. Do karo ek ek karke.

---

## Bugs (Fix These First)

- [x] **[DONE] New Player Name + Who Closed Broken** — Fixed 2026-06-20. `newSession()` now reloads players from DB.

- [x] **[DONE] Pull-to-Refresh Block** — Fixed 2026-06-20. `overscroll-behavior: none` in CSS.

- [x] **[DONE] App Phone Lock/Background** — Fixed 2026-06-20. `visibilitychange` + Pause overlay with Resume/Exit.

- [ ] **[BUG] Winner Not Shown When Last Player Eliminated** — `confirmRound()` does early `return` after showing elimination overlay. `survivors.length === 1` check never runs. Fix: when last elimination happens, skip elimination modal and go straight to winner overlay.

- [ ] **[BUG] alert() Calls in Score Entry** — Two `window.alert()` calls in "Confirm Round" validation: (1) "Bhai sabka score daal" (2) "Closer 5 se upar score nahi". Replace with inline red error message above Confirm button.

---

## Live Game Improvements

- [ ] **End Game / Abandon Session** — Pause overlay mein "End Game" button chahiye. Click karo → inline confirmation → `abandonSession()` → DB mein session "abandoned" mark hota hai → Home pe navigate. Home screen pe stale session nahi dikhega.

- [ ] **Splash Screen** — Logo chhota hai, tagline barely visible. Logo bada karo (8xl), "Always Agitated Aroras" amber color mein uppercase large font. Family ka naam hero treatment deserve karta hai.

- [ ] **Score Entry — "0" chip full width + closer only sees 0–5** — Two changes: (1) "0" chip col-span-3 (full row), amber highlight jab unselected. (2) Closer ke liye sirf 0–5 chips dikhao, 10/15/20 nahi (closer ki max deadwood 5 hai per game rules).

- [ ] **Numeric Keypad Modal** — `window.prompt()` hatao Add Player se. Bottom slide-up sheet: bada numpad (0–9), confirm button. Custom score entry ke liye bhi same modal.

- [ ] **Vibration on Elimination** — `navigator.vibrate([200, 100, 200])` — ek line, bada dramatic moment.

- [ ] **Score Entry — Running Total Preview** — While entering scores, dikhao current total + new score = potential new total. Helps track who's close to 100.

- [ ] **Live Game — Visual Tension** — Warning (70+) aur critical (85+) cards ka visual differentiation zyada dramatic chahiye. Abhi sirf ek chhota badge hai. Card background + glow zyada punch chahiye.

---

## Code Structure

- [ ] **Dead Files Delete Karo** — `sadasdasd.js`, duplicate `tailwind.config.js`, unused `src/App.tsx` (Vite template).

- [ ] **LiveGame.tsx Split Karo** — ~700 lines mein `WinnerView`, `FullOverlay`, `Overlays` sab ek file mein hain. `WinnerView` aur `FullOverlay` ko `src/components/` mein alag files mein nikalo.

---

## Stats System (Abhi Kuch Bhi Nahi Bana)

- [ ] **Stats — Game End pe DB mein Write Karo** — Har session complete hone pe `stats` table update karo: wins, closes, eliminations, survival rounds, average score per player.

- [ ] **Hall of Fame (Real Data)** — `Home.tsx` mein Mom/Pops/Hanz/Nanz hardcoded hain. `stats` DB se real data.

- [ ] **Real Stats Page** — Per-player: wins, closes, eliminations, average score.

- [ ] **Session History Browser** — Past sessions, round-by-round breakdown.

- [ ] **Achievements — Write + Display** — ICE_COLD, UNTOUCHABLE, SURVIVOR, CLUTCH_MASTER, PATSY.

- [ ] **Weekly / Monthly Dashboard** — Recharts charts.

---

## Share & Social

- [ ] **Share Result Card (PNG + WhatsApp)** — Winner screen pe. Styled card: winner, leaderboard, "Poo Poo 💩" roast. `html2canvas` + Web Share API.

---

## Future / Backlog

- [ ] **Security Audit** — PWA local storage, IndexedDB, Web Share API, XSS in player names.

---

## Decided / Won't Do

- Scroll wheel for score entry — Numpad modal better hai.
- External backend — IndexedDB kaafi hai.
- Deployment — Already on Vercel.
