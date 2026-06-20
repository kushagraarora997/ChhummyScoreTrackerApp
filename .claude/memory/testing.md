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
- Players auto-select when added via `addQuick()` — do NOT click them again or they deselect
- "Who Closed?" player buttons are inside a Framer Motion animated bottom sheet — use `page.evaluate()` + `querySelector` to JS-click, not Playwright locators (animation timing causes timeouts)
- `window.prompt()` in PlayerSetup (Add Player) can be handled with `page.once('dialog', d => d.accept('Name'))`
- Screenshots save to `C:/Users/kusha/AppData/Local/Temp/chhummy-{name}.png`
- Dev server now on **port 5174** (not 5173) — confirmed 2026-06-21

**Learnings from batch-09 (2026-06-21):**
- `page.click("text=Redo")` matches BOTH the amber span "↩ Redo available" AND the "Redo" button — always use `page.locator("button").filter({ hasText: /^Redo$/ }).first().click()`
- `page.locator("text=X").isVisible()` can cause strict mode violation if X matches multiple elements — add `.first()` defensively
- `text=Continue` is specific to the **elimination overlay**. The winner overlay has "Back to Home" instead. Do not use `text=Continue` to wait for winner screen.
- Elimination overlay only shows when `survivors.length > 1`. With 2 players, eliminating one goes directly to winner. **Tests for the elimination modal must use 3+ players.**
- `writeStats()` is only called on game completion (winner declared), NOT on abandon. Stats page Players tab shows empty state ("Khelke aao pehle!") after an abandoned session. Tests for Stats must complete the game.
- Framer Motion `initial={{ opacity: 0 }}` overlays: Playwright's `isVisible()` waits correctly with a timeout, so 2000ms is sufficient for animations.
- CSS class selectors like `.text-7xl.font-black.text-danger` work in Playwright but are brittle — prefer text-based assertions for content checks.

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
