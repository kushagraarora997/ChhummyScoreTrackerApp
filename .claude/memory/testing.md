---
name: testing
description: "Testing setup, methodology, Playwright config, and what has been verified"
metadata: 
  node_type: memory
  type: project
  originSessionId: 03a24291-4589-4a87-9cd3-a3a1b0099e16
---

## Testing Setup

**Tool:** Playwright 1.61.0 (available via `npx playwright`)
**Browser:** Chromium (headless)
**Viewport:** 390×844 (iPhone 14 Pro size — matches target Android mobile)
**Dev server:** `npm run dev` → http://localhost:5173

**Playwright install location:** Not in project dependencies. Install in a temp dir when needed:
```bash
cd /tmp && mkdir -p pw-test && cd pw-test && npm init -y && npm install playwright
```
Then write test script as `.mjs` and run with `node test.mjs`.

**Important learnings from test setup:**
- Players auto-select when added via `commitAdd()` — do NOT click them again or they deselect (toggle deselects)
- "Who Closed?" player buttons are inside the WhoClosed overlay — use `button:has-text('PlayerName')` AFTER waiting for `text=Kaun Jeeta Be`
- `window.prompt()` is gone — custom modal used everywhere now
- Screenshots save to `C:/Users/kusha/AppData/Local/Temp/chhummy-{name}.png`
- Dev server on **port 5173** (confirmed 2026-06-23)
- Score chip buttons use class `rounded-xl` (NOT `rounded-2xl`) — use `button.rounded-xl` to target chips
- `text=Add Player` matches BOTH heading "Add Players" AND button "+ Add Player" — use `button:has-text('+ Add Player')` for the button
- `button:has-text('Join')` matches BOTH "Join Room" and "Join" confirm — use `button.bg-green-600` for the green confirm button
- For Firestore verification in tests, use REST API: `GET https://firestore.googleapis.com/v1/projects/chummyscoretracker/databases/(default)/documents/families/{code}/sessions?key={API_KEY}`

**Learnings from batch-09 (2026-06-21):**
- `page.click("text=Redo")` matches BOTH the amber span "↩ Redo available" AND the "Redo" button — always use `page.locator("button").filter({ hasText: /^Redo$/ }).first().click()`
- `page.locator("text=X").isVisible()` can cause strict mode violation if X matches multiple elements — add `.first()` defensively
- `text=Continue` is specific to the **elimination overlay**. The winner overlay has "Back to Home" instead. Do not use `text=Continue` to wait for winner screen.
- Elimination overlay only shows when `survivors.length > 1`. With 2 players, eliminating one goes directly to winner. **Tests for the elimination modal must use 3+ players.**
- `writeStats()` is only called on game completion (winner declared), NOT on abandon. Stats page Players tab shows empty state ("Khelke aao pehle!") after an abandoned session. Tests for Stats must complete the game.
- Framer Motion `initial={{ opacity: 0 }}` overlays: Playwright's `isVisible()` waits correctly with a timeout, so 2000ms is sufficient for animations.
- CSS class selectors like `.text-7xl.font-black.text-danger` work in Playwright but are brittle — prefer text-based assertions for content checks.

## Firebase E2E Tests (2026-06-23)

**Phase 1 file:** `C:\Users\kusha\AppData\Local\Temp\pw-test\firebase-e2e.mjs`
**Phase 1 result:** 16/16 passed ✅
**Coverage:**
- Room code UI (Create/Join buttons visible) ✅
- Create Room generates valid 6-char code and persists in localStorage ✅
- Full game round → session, round, players all written to Firestore (dual-write confirmed) ✅
- Join Room pulls players + session from Firestore onto fresh device (pull-on-join confirmed) ✅

**Phase 2 file:** `C:\Users\kusha\AppData\Local\Temp\pw-test\firebase-phase2-e2e.mjs`
**Phase 2 result:** 12/12 passed ✅
**Coverage:**
- Device A creates room + starts game; Device B joins + navigates to LiveGame via "Continue Battle" button ✅
- Both devices show "Round 1" before any round confirmed ✅
- "● Live" indicator visible on both devices (hidden when no room code) ✅
- Device A confirms round → Device B shows "Round 2" via onSnapshot (≤4s propagation) ✅
- No "● Live" indicator for local-only games (no room code) ✅

**Selector gotcha — Resume/Continue Battle:**
- Home.tsx "resume" button text is "🎯 Continue Battle" NOT "Resume"
- Use `page.locator("text=Continue Battle")` after join + init

## Known Test Gaps (as of 2026-06-22 review)

| Gap | Risk |
|---|---|
| All-players-hit-100 same round (tie-breaker path in `confirmRound()`) | Medium — untested code path |
| Achievements written correctly after game end | Medium — zero coverage |
| Stats accumulation across multiple sessions | Medium |
| Score cap at 60 via numpad (type 61, verify rejected) | Low |
| PlayerSetup: max 6 players enforcement | Low |
| Player name maxLength=20 | Low |
| Share card captures correct player data | Low |

## Test Report Files

Stored in `.claude/TEST_REPORTS/` in the project repo.
Format: `batch-{N}-{date}.md`
Scoring: 1 batch = 1 score entry. Claude self-scores; Kush judges.

## What Has Been Verified (Batch 1 — 2026-06-20)

See `.claude/TEST_REPORTS/batch-01-2026-06-20.md` for full report.

Summary:
- Splash ✅, Home ✅, Player Setup ✅
- Live Game ⚠️ (loads but player names broken)
- Round flow ❌ (Who Closed modal has zero buttons — critical bug)

**Key confirmed bug:** `newSession()` never reloads `store.players` from DB. Newly added players exist in IndexedDB but not in Zustand state. Causes both display failure AND functional failure of the round flow.
