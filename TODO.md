# Chhummy Tracker — Todo

Brainstormed on 2026-06-20. Do karo ek ek karke.

---

## Bugs (Fix These First)

- [ ] **[CRITICAL] New Player Name + Who Closed Broken** — Confirmed via Playwright test (2026-06-20). Root cause: `PlayerSetup` writes new players to IndexedDB but only updates local React state. `newSession()` saves session but never reloads `store.players` from DB. Consequence 1: all player cards show "Player". Consequence 2: "Who Closed?" modal renders ZERO buttons (it filters `store.players` which is empty) — round flow completely broken for new players. Fix: one line in `newSession()` — add `const players = await db.players.toArray()` and include in `set({})` call.

- [ ] **Pull-to-Refresh Block Karo** — Browser mein upar se pull karne pe page refresh ho jaata hai, game state ud jaati hai. `overscroll-behavior: none` CSS se block karna hai.

- [ ] **App Phone Lock/Background pe Survive Kare** — Phone band ya lock pe app active session lose kar sakti hai. `visibilitychange` + Page Lifecycle API se handle karna hai — session IndexedDB mein safe hai, bas resume flow trigger karna hai wapas aane pe.

---

## Live Game Improvements

- [ ] **Splash Screen** — Increase display time. "Always Agitated Aroras" prominently dikhao. Abhi blink-and-miss hai.

- [ ] **Numeric Keypad Modal** — `window.prompt()` hatao custom score entry se. Bottom slide-up sheet banao — bada numpad (0–9), top pe running total, confirm button. Swiggy OTP screen vibes.

- [ ] **Autopause on App Backgrounding** — `visibilitychange` event se auto-pause. Wapas aao toh "Wapas aa gaye! Resume karein?" confirmation lo.

- [ ] **Vibration on Elimination** — `navigator.vibrate([200, 100, 200])` — ek line ka kaam, bada dramatic impact. Android Chrome pe supported hai.

- [ ] **Score Entry — "0" chip prominent banana** — Multiple players ek hi round mein 0 score kar sakte hain (Chhummy rule). "0" chip sabse pehle aur bada hona chahiye.

---

## Stats System (Abhi Kuch Bhi Nahi Bana)

Stats ka koi role nahi hai abhi — schema bani hai DB mein, koi likhta nahi, koi padhta nahi. Poora system zero se banana hai. Ye foundational kaam pehle karo, baaki sab depend karta hai isi pe.

- [ ] **Stats — Game End pe DB mein Write Karo** — Har session complete hone pe `stats` table update karo: wins, closes, eliminations, survival rounds, average score per player. Ye poore stats system ki neenv hai. Iske bina Hall of Fame, dashboards, achievements sab bekar hain.

- [ ] **Hall of Fame (Real Data)** — `Home.tsx` mein Mom/Pops/Hanz/Nanz hardcoded hain. `stats` DB se real data padhke replace karo. Pehle "Stats Write" wala kaam khatam hona chahiye.

- [ ] **Real Stats Page** — Dedicated stats page banao. Per-player: total wins, closes, eliminations, average score. `stats` aur `achievements` DB tables se data aayega.

- [ ] **Session History Browser** — Past sessions browse karo — date, players, round-by-round breakdown, who got eliminated when. `sessions` + `rounds` tables mein data already hai.

- [ ] **Achievements — Write + Display** — Schema bana hua hai, kabhi use nahi hua. Game end pe check karo aur write karo: ICE_COLD (3 closes in a row), UNTOUCHABLE (win below 25), SURVIVOR (20+ rounds), CLUTCH_MASTER (close above 90), PATSY (most eliminations). Stats Page aur Winner screen pe display karo.

- [ ] **Weekly / Monthly Dashboard** — Recharts already imported hai (unused). Weekly wins/closes bar chart, monthly trend lines. Stats write kaam hone ke baad implement karo.

---

## Share & Social

- [ ] **Share Result Card (PNG + WhatsApp)** — Winner screen pe kaam karne wala share button banana hai. Styled card: winner (crown, bada naam), full leaderboard, elimination order, "Poo Poo 💩" roast for worst performer. `html2canvas` se PNG, Web Share API se native WhatsApp/Instagram sheet. Desktop pe download fallback.

---

## Cleanup

- [ ] **Dead Files Hatao** — `sadasdasd.js`, duplicate `tailwind.config.js`, unused `src/App.tsx` (Vite template). Recharts bhi hatao agar stats page mein use nahi karna.

---

## Future / Backlog

- [ ] **Security Audit** — Full security review of the app. To be done once core features are stable. Flag: PWA local storage, IndexedDB data exposure, Web Share API content, XSS surface in player names.

---

## Decided / Won't Do

- Scroll wheel for score entry — Numpad modal better hai. Revisit sirf agar user requests kare.
- External backend (Supabase/Firebase) — Overkill. IndexedDB kaafi hai jab tak cross-device sync explicitly nahi manga.
- Deployment — Already done. GitHub → Vercel linked hai.
