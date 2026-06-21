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

## Future / Backlog

- [ ] **Weekly / Monthly Dashboard** — Recharts time-series charts (requires storing session dates in stats).
- [ ] **Deployment** — Already on Vercel. Push to main done 2026-06-21.
