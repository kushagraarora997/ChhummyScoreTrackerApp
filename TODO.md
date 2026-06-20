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

## Future / Backlog

- [ ] **Weekly / Monthly Dashboard** — Recharts time-series charts (requires storing session dates in stats).
- [ ] **Deployment** — Already on Vercel. Push pending (awaiting user approval for production push).
