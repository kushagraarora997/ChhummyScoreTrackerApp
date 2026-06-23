// comprehensive-scenarios.mjs — All gameplay scenarios for Chhummy Tracker
// Tests: player count variants, score boundaries, undo/redo, achievements, Firebase multi-device
// Run: node comprehensive-scenarios.mjs  (dev server on port 5173)

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0, skipped = 0;
const results = [];

function log(msg) { console.log(msg); }

function assert(cond, msg) {
  if (!cond) {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
    results.push({ status: "FAIL", msg });
    throw new Error(msg);
  }
  console.log(`  ✓ ${msg}`);
  passed++;
  results.push({ status: "PASS", msg });
}

function softAssert(cond, msg) {
  if (!cond) {
    console.warn(`  ⚠ SOFT-FAIL (known limitation): ${msg}`);
    results.push({ status: "SOFT", msg });
  } else {
    console.log(`  ✓ ${msg}`);
    passed++;
    results.push({ status: "PASS", msg });
  }
}

// ── Core Helpers ──────────────────────────────────────────────────────────────

async function waitOverlayGone(page) {
  await page.waitForFunction(
    () => !document.querySelector(".fixed.inset-0.z-50"),
    { timeout: 4000 }
  ).catch(() => {});
}

async function addPlayer(page, name) {
  await page.locator("button:has-text('+ Add Player')").click();
  await page.locator("input[placeholder='Naam likhna yahan...']").fill(name);
  await page.locator("button").filter({ hasText: /^Add$/ }).click();
  await sleep(300);
}

async function clickChip(page, playerName, score) {
  const overlay = page.locator(".fixed.inset-0.z-50");
  await overlay
    .locator("div.rounded-2xl")
    .filter({ hasText: new RegExp(playerName) })
    .locator("button.rounded-xl")
    .filter({ hasText: new RegExp(`^${score}$`) })
    .first()
    .click();
  await sleep(100);
}

// Play a round: closerName closes (auto chip 0), nonCloserScores = { Name: score }
async function playRound(page, closerName, nonCloserScores) {
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: closerName }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, closerName, 0);
  for (const [name, score] of Object.entries(nonCloserScores)) {
    await clickChip(page, name, score);
  }
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);
}

// Navigate to home screen on a fresh context
async function goHome(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
}

// Start a new game with given player names
async function startGame(page, playerNames) {
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });
  for (const name of playerNames) await addPlayer(page, name);
  await page.locator("button:has-text('Start Session')").click();
  await page.waitForSelector("text=Round 1", { timeout: 8000 });
  await sleep(400);
}

// Dismiss elimination overlay if present (returns true if it was present)
async function dismissElimination(page) {
  try {
    await page.waitForSelector("text=points — OUT", { timeout: 3000 });
    await page.locator("button:has-text('Continue')").click();
    await sleep(500);
    return true;
  } catch { return false; }
}

// Run a test with fresh browser context
let browser;
async function runTest(name, fn) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  log(`\n[TEST] ${name}`);
  try {
    await fn(page, ctx);
    log(`  → PASSED`);
  } catch (e) {
    if (!e.message.includes("FAIL:")) {
      console.error(`  ❌ ERROR: ${e.message.slice(0, 200)}`);
      failed++;
      results.push({ status: "FAIL", msg: name + ": " + e.message.slice(0, 100) });
    }
  } finally {
    await ctx.close();
  }
}

// ── GROUP A: Player Count Variants ────────────────────────────────────────────

// A1: 2-player game — elimination goes DIRECTLY to winner (no elimination overlay)
async function testA1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Get Beta to 100 (safe) then 101 (out)
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  // Beta = 100 (safe), Alpha = 0
  await playRound(page, "Alpha", { Beta: 1 });
  // Beta = 101 → eliminated. Since 2 players, goes DIRECTLY to winner (no elimination overlay)
  const elim = await dismissElimination(page);
  assert(!elim, "2-player: no elimination overlay shown (goes directly to winner)");
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const winnerText = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerText?.includes("Alpha"), "2-player: Alpha is the winner");
}

// A2: 3-player game — 1 elimination overlay, then winner
async function testA2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 25 });
  // Beta=100, Gamma=100
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 }); // Beta=101(OUT), Gamma=100(safe)
  const elim1 = await dismissElimination(page);
  assert(elim1, "3-player: elimination overlay shown after Beta crosses 100");
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "Alpha", { Gamma: 1 }); // Gamma=101(OUT) → 1 survivor=winner
  const elim2 = await dismissElimination(page);
  assert(!elim2, "3-player: no elimination overlay when last player goes out (winner path)");
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const txt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(txt?.includes("Alpha"), "3-player: Alpha wins");
}

// A3: 4-player game — 2 eliminations, then winner
async function testA3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma", "Delta"]);
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 25, Delta: 25 });
  // All at 100
  // Eliminate Beta + Gamma same round
  await playRound(page, "Alpha", { Beta: 1, Gamma: 1, Delta: 0 }); // Beta+Gamma=101(OUT)
  const elim1 = await dismissElimination(page);
  assert(elim1, "4-player: elimination overlay shown (2 eliminated in same round, overlay for first)");
  // Now 2 survivors: Alpha + Delta
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "Alpha", { Delta: 1 }); // Delta=101 → winner
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const txt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(txt?.includes("Alpha"), "4-player: Alpha wins");
}

// A4: 5-player game — sequential eliminations
async function testA4(page) {
  await goHome(page);
  await startGame(page, ["P1", "P2", "P3", "P4", "P5"]);
  for (let i = 0; i < 4; i++) await playRound(page, "P1", { P2: 25, P3: 25, P4: 25, P5: 25 });
  // All non-P1 at 100
  await playRound(page, "P1", { P2: 1, P3: 1, P4: 0, P5: 0 }); // P2+P3=101(OUT)
  await dismissElimination(page);
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "P1", { P4: 1, P5: 0 }); // P4=101(OUT)
  await dismissElimination(page);
  await page.waitForSelector("text=Round 7", { timeout: 6000 });
  await playRound(page, "P1", { P5: 1 }); // P5=101(OUT) → 1 survivor
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const txt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(txt?.includes("P1"), "5-player: P1 wins after sequential eliminations");
}

// A5: 6-player game (max players) — 4 eliminations
async function testA5(page) {
  await goHome(page);
  await startGame(page, ["P1", "P2", "P3", "P4", "P5", "P6"]);
  for (let i = 0; i < 4; i++) await playRound(page, "P1", { P2: 25, P3: 25, P4: 25, P5: 25, P6: 25 });
  // All non-P1 at 100
  await playRound(page, "P1", { P2: 1, P3: 1, P4: 0, P5: 0, P6: 0 }); // P2+P3=OUT
  await dismissElimination(page);
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "P1", { P4: 1, P5: 1, P6: 0 }); // P4+P5=OUT
  await dismissElimination(page);
  await page.waitForSelector("text=Round 7", { timeout: 6000 });
  await playRound(page, "P1", { P6: 1 }); // P6=OUT → winner
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const txt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(txt?.includes("P1"), "6-player: P1 wins");
}

// ── GROUP B: Score Boundaries ─────────────────────────────────────────────────

// B1: Closer sees only chips 0-5, no Custom button
async function testB1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  // Check closer section — no Custom button
  const overlay = page.locator(".fixed.inset-0.z-50");
  const alphaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Alpha/ });
  const customBtn = alphaSection.locator("button:has-text('Custom')");
  const customVisible = await customBtn.isVisible().catch(() => false);
  assert(!customVisible, "Closer: no Custom button shown");
  // Check chip 6 doesn't exist for closer
  const chip6 = alphaSection.locator("button.rounded-xl").filter({ hasText: /^6$/ });
  const chip6Visible = await chip6.isVisible().catch(() => false);
  assert(!chip6Visible, "Closer: no chip > 5 shown");
  // Beta (non-closer) should have Custom
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });
  const betaCustom = betaSection.locator("button:has-text('Custom')");
  assert(await betaCustom.isVisible(), "Non-closer: Custom button shown");
}

// B2: 100 is still SAFE (player not eliminated at exactly 100)
async function testB2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  // Beta = 100 — should still be in game
  const betaScore = await page.locator(".text-2xl.font-black, .text-3xl").filter({ hasText: /100/ }).count();
  // Alpha plays another round
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  // Beta is still alive (able to appear as closer option)
  const betaBtn = page.locator("button").filter({ hasText: "Beta" }).first();
  assert(await betaBtn.isVisible(), "100 pts: player at 100 is still alive and can close");
}

// B3: Multiple players can score 0 in same round
async function testB3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  // All 3 score 0 in round 1 (closer + 2 non-closers each get 0)
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Alpha", 0);
  await clickChip(page, "Beta", 0);
  await clickChip(page, "Gamma", 0);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);
  // All should still be at 0 with no elimination/winner
  await page.waitForSelector("text=Round 2", { timeout: 6000 });
  assert(true, "Multiple zeros in same round: all players can score 0 simultaneously");
}

// B4: All-out edge case — all players cross 100 in same round → lowest total wins
async function testB4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Get both to 95
  for (let i = 0; i < 3; i++) await playRound(page, "Alpha", { Beta: 25 });
  // Alpha = 0, Beta = 75
  await playRound(page, "Alpha", { Beta: 20 }); // Alpha=0, Beta=95
  // Now: Alpha=0, Beta=95. This round: Alpha scores 5 (as closer), Beta scores 10
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Alpha", 5);  // Alpha: 0+5=5... wait this isnt allout
  // Actually to trigger allOut, both need to go over 100. Let me recalculate.
  // Let's have Alpha close with 5 (total=5) and Beta score 25+some...
  // Actually let me just play more rounds to get both near 100
  // This test needs: both players over 100 in same round
  // Let me abort and recalculate by cancelling this overlay
  // Actually, let me just confirm with whatever and note this test needs a different setup
  await clickChip(page, "Beta", 5); // just confirm for now
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);
  assert(true, "All-out setup in progress (simplified)");
}

// B4 proper: All-out with careful setup
async function testB4Proper(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Alpha always closes, gets some points each round. Beta gets many points.
  // Need both to cross 100 in same round.
  // Strategy: each closes alternately to build both up
  // Round 1: Beta closes(0), Alpha gets 25 → Alpha=25, Beta=0
  // Round 2: Alpha closes(0), Beta gets 25 → Alpha=25, Beta=25
  // ... this takes forever. Let me use custom numpad approach.
  // Actually, for simplicity, let's play via chip 25 each round alternating closer
  // After 4 rounds each: Alpha ≈ 75, Beta ≈ 75
  // Then one round where Alpha(closer)=5, Beta=30→ Alpha=80, Beta=105? No, 30 chip not available.
  // Let me use: after 3 rounds at 25 for both, then both at ~75
  // Round 1: Alpha closes(0), Beta=25 → [Alpha=0, Beta=25]
  // Round 2: Beta closes(0), Alpha=25 → [Alpha=25, Beta=25]
  // Round 3: Alpha closes(0), Beta=25 → [Alpha=25, Beta=50]
  // Round 4: Beta closes(0), Alpha=25 → [Alpha=50, Beta=50]
  // Round 5: Alpha closes(0), Beta=25 → [Alpha=50, Beta=75]
  // Round 6: Beta closes(0), Alpha=25 → [Alpha=75, Beta=75]
  // Round 7: Alpha closes(5), Beta=25 → [Alpha=80, Beta=100]
  // Round 8: Beta closes(5), Alpha=25 → [Alpha=105, Beta=105] → ALLOUT!
  await waitOverlayGone(page);
  // Rounds 1-6 alternating, 25 pts
  await playRound(page, "Alpha", { Beta: 25 }); // A=0, B=25
  await playRound(page, "Beta",  { Alpha: 25 }); // A=25, B=25
  await playRound(page, "Alpha", { Beta: 25 }); // A=25, B=50
  await playRound(page, "Beta",  { Alpha: 25 }); // A=50, B=50
  await playRound(page, "Alpha", { Beta: 25 }); // A=50, B=75
  await playRound(page, "Beta",  { Alpha: 25 }); // A=75, B=75
  // Round 7: Alpha closes with 5, Beta gets 25
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Alpha", 5);
  await clickChip(page, "Beta", 25);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600); // A=80, B=100
  // Round 8: Beta closes with 5, Alpha gets 25
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Beta" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Beta", 5);
  await clickChip(page, "Alpha", 25);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(800); // A=105, B=105 → ALLOUT! Alpha wins (closed round 8)
  // Should go to winner (not elimination)
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  // Alpha wins because Beta was the closer (tiebreaker = closer wins)
  const txt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(txt?.includes("Beta"), "All-out: closer (Beta) wins tiebreaker when totals equal");
}

// ── GROUP C: Undo / Redo ──────────────────────────────────────────────────────

// C1: Undo after 2 rounds → round count goes from 2 to 1
async function testC1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await playRound(page, "Alpha", { Beta: 25 });
  await playRound(page, "Alpha", { Beta: 25 });
  await page.waitForSelector("text=Round 3", { timeout: 6000 });
  // Undo
  await page.locator("button:has-text('Undo')").click();
  await page.waitForSelector("text=Undo Round", { timeout: 5000 });
  await page.locator("button:has-text('Yes')").click();
  await sleep(500);
  await page.waitForSelector("text=Round 2", { timeout: 6000 });
  assert(true, "Undo: round counter goes from 3→2 after undo");
  // Redo should now be available
  const redoAvailable = await page.locator("text=Redo available").isVisible().catch(() => false);
  assert(redoAvailable, "Undo: Redo available shown after undo");
}

// C2: Undo at round 0 is safe no-op
async function testC2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // No rounds played yet (Round 1 = about to play, but 0 rounds confirmed)
  const undoBtn = page.locator("button:has-text('Undo')");
  // Undo button might be disabled or absent
  // If it exists, clicking it should show "nothing to undo" or be no-op
  const exists = await undoBtn.isVisible().catch(() => false);
  if (exists) {
    // If disabled, that's fine; if enabled, click should be safe
    const disabled = await undoBtn.isDisabled().catch(() => false);
    if (!disabled) {
      await undoBtn.click();
      // Should not crash or cause issues
      await sleep(400);
      // If a dialog appeared, dismiss it
      const yesBtn = page.locator("button:has-text('Yes')");
      if (await yesBtn.isVisible().catch(() => false)) {
        await yesBtn.click();
      }
    }
    assert(true, "Undo at round 0: no crash");
  } else {
    assert(true, "Undo at round 0: button absent (safe)");
  }
  // Game should still be on Round 1
  assert(await page.locator("text=Round 1").first().isVisible(), "Undo at round 0: still on Round 1");
}

// C3: Redo after undo restores the round
async function testC3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await playRound(page, "Alpha", { Beta: 25 });
  await page.waitForSelector("text=Round 2", { timeout: 6000 });
  // Undo
  await page.locator("button:has-text('Undo')").click();
  await page.waitForSelector("text=Undo Round", { timeout: 5000 });
  await page.locator("button:has-text('Yes')").click();
  await sleep(500);
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  assert(true, "Undo: round goes from 2→1");
  // Redo — click "Redo" banner button, then confirm "Yes"
  await page.locator("button").filter({ hasText: /^Redo$/ }).first().click();
  await sleep(300);
  await page.locator("button:has-text('Yes')").click();
  await sleep(500);
  await page.waitForSelector("text=Round 2", { timeout: 6000 });
  assert(true, "Redo: round goes back to 2 after redo");
}

// C4: Redo cleared after confirming new round
async function testC4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await playRound(page, "Alpha", { Beta: 25 });
  // Undo
  await page.locator("button:has-text('Undo')").click();
  await page.waitForSelector("text=Undo Round", { timeout: 5000 });
  await page.locator("button:has-text('Yes')").click();
  await sleep(500);
  // Redo is available
  assert(
    await page.locator("text=Redo available").isVisible().catch(() => false),
    "Redo available after undo"
  );
  // Now play a NEW round (without redoing)
  await playRound(page, "Alpha", { Beta: 20 });
  await sleep(400);
  // Redo should no longer be available
  const redoAfter = await page.locator("text=Redo available").isVisible().catch(() => false);
  assert(!redoAfter, "Redo cleared after confirming new round post-undo");
}

// ── GROUP D: Stats & Achievements ─────────────────────────────────────────────

// D1: Stats page shows data after a complete game
async function testD1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Quick game: Beta loses fast
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  await playRound(page, "Alpha", { Beta: 1 }); // Beta=101, Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Back to Home").click();
  await sleep(600);
  await page.locator("button:has-text('Stats')").click();
  await sleep(800);
  // Players tab should show Alpha with 1 win
  assert(
    await page.locator("text=Alpha").isVisible(),
    "Stats: Alpha appears in Players tab"
  );
  // History tab should have 1 session
  await page.locator("button:has-text('History')").click();
  await sleep(500);
  const sessionRow = page.locator("text=Alpha won").first();
  assert(await sessionRow.isVisible(), "History: session shows 'Alpha won'");
}

// D2: ICE_COLD achievement — winner with 0 total pts
async function testD2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Alpha always closes at 0; Beta accumulates and gets eliminated
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  await playRound(page, "Alpha", { Beta: 1 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Back to Home").click();
  await sleep(400);
  await page.locator("button:has-text('Stats')").click();
  await sleep(800);
  // Look for ICE_COLD badge on Alpha
  const iceCold = await page.locator("text=Ice Cold").isVisible().catch(() => false);
  assert(iceCold, "ICE_COLD achievement shown when winner had 0 total pts");
}

// D3: PATSY achievement — first eliminated player
async function testD3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  // Beta gets eliminated first (crosses 100 before Gamma)
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 15 });
  // Beta=100, Gamma=60
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 }); // Beta=101 (PATSY!)
  await dismissElimination(page);
  // Now finish game (Gamma wins — Alpha already has 0, Gamma gets over 100)
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "Alpha", { Gamma: 25 }); // Gamma=85
  await playRound(page, "Alpha", { Gamma: 25 }); // Gamma=110, OUT → Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Back to Home").click();
  await sleep(400);
  await page.locator("button:has-text('Stats')").click();
  await sleep(800);
  // PATSY badge should appear (Beta was first eliminated)
  const patsy = await page.locator("text=Patsy").isVisible().catch(() => false);
  assert(patsy, "PATSY achievement shown for first-eliminated player");
}

// D4: History tab expand shows round-by-round breakdown
async function testD4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await playRound(page, "Alpha", { Beta: 25 });
  await playRound(page, "Alpha", { Beta: 25 });
  for (let i = 0; i < 2; i++) await playRound(page, "Alpha", { Beta: 25 }); // 4 rounds
  await playRound(page, "Alpha", { Beta: 1 }); // Beta=101, Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Back to Home").click();
  await sleep(400);
  await page.locator("button:has-text('Stats')").click();
  await sleep(500);
  await page.locator("button:has-text('History')").click();
  await sleep(500);
  // Click the session row
  await page.locator("text=Alpha won").first().click();
  await sleep(600);
  // Should show round breakdown
  const round1 = await page.locator("text=Round 1").first().isVisible().catch(() => false);
  assert(round1, "History expand: round 1 details visible");
}

// ── GROUP E: Firebase Multi-Device ────────────────────────────────────────────

async function deviceJoin(page, roomCode) {
  await page.locator("button").filter({ hasText: "Join Room" }).click();
  await sleep(300);
  await page.locator("input[maxlength='6']").fill(roomCode);
  await sleep(200);
  await page.locator("button.bg-green-600").click();
  await sleep(3500);
}

// E1: 2-device sync — A confirms round, B sees Round 2
async function testE1(page, ctx) {
  const ctxB = await ctx.browser().newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await ctxB.newPage();
  try {
    // Device A: create room + start game
    await goHome(page);
    await page.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const code = await page.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = code.trim();
    await startGame(page, ["Alpha", "Beta"]);

    // Device B: join
    await pageB.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);
    await pageB.waitForSelector("text=Start New Game", { timeout: 8000 });
    await deviceJoin(pageB, roomCode);
    await pageB.waitForSelector("text=Continue Battle", { timeout: 10000 });
    await pageB.locator("text=Continue Battle").click();
    await pageB.waitForSelector("text=Round 1", { timeout: 8000 });
    assert(true, "E1: Device B sees Round 1 after joining");

    // A plays round
    await playRound(page, "Alpha", { Beta: 25 });
    await page.waitForSelector("text=Round 2", { timeout: 6000 });

    // B should see Round 2 via onSnapshot
    await pageB.waitForSelector("text=Round 2", { timeout: 12000 });
    assert(true, "E1: Device B sees Round 2 after A confirms round");
  } finally {
    await ctxB.close();
  }
}

// E2: History on joined device — B joins AFTER game is complete, sees history
async function testE2(page, ctx) {
  const ctxB = await ctx.browser().newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await ctxB.newPage();
  try {
    // Device A: create room, play complete game
    await goHome(page);
    await page.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const code = await page.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = code.trim();
    await startGame(page, ["Alpha", "Beta"]);
    // Quick game: 4 rounds at 25, 1 round at 1
    for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
    await playRound(page, "Alpha", { Beta: 1 }); // Alpha wins
    await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
    await page.locator("text=Back to Home").click();
    await sleep(4000); // give Firestore fire-and-forget writes time to land

    // Device B: join AFTER game is complete
    await pageB.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);
    await pageB.waitForSelector("text=Start New Game", { timeout: 8000 });
    // Capture B's console for debugging
    const bLogs = [];
    pageB.on("console", (msg) => {
      if (msg.type() === "warn" || msg.type() === "error") bLogs.push(`[B] ${msg.type()}: ${msg.text()}`);
    });

    await deviceJoin(pageB, roomCode);
    // deviceJoin sleeps 3.5s; pullFromCloud runs async during that time
    // Wait for join modal to fully close (setShowJoin(false) fires after pullFromCloud)
    await pageB.waitForFunction(() => !document.querySelector("input[maxlength='6']"), { timeout: 8000 });
    await sleep(2000); // extra buffer for Dexie writes to settle

    // Go to Stats → History
    await pageB.locator("button:has-text('Stats')").click();
    await sleep(800);
    await pageB.locator("button:has-text('History')").click();

    // Wait up to 8s for the session to appear (async Dexie read + React render)
    const historySession = await pageB.waitForSelector("text=Alpha won", { timeout: 8000 })
      .then(() => true)
      .catch(() => {
        if (bLogs.length > 0) log("  [E2 console] " + bLogs.join("; ").slice(0, 300));
        return false;
      });
    assert(historySession, "E2: Joined device sees completed game in History (pullFromCloud fixed)");

    // Expand the session to see rounds (lazy-loaded from Firestore)
    await pageB.locator("text=Alpha won").first().click();
    // Wait up to 8s for Firestore round fetch + render
    const round1visible = await pageB.waitForSelector("text=Round 1", { timeout: 8000 })
      .then(() => true).catch(() => false);
    assert(round1visible, "E2: History expand shows rounds (lazy-loaded from Firestore)");
  } finally {
    await ctxB.close();
  }
}

// E3: Winner overlay shown on joined device when host ends game
async function testE3(page, ctx) {
  const ctxB = await ctx.browser().newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await ctxB.newPage();
  try {
    // Device A: create room + start game
    await goHome(page);
    await page.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const code = await page.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = code.trim();
    await startGame(page, ["Alpha", "Beta"]);

    // Device B: join and navigate to live game
    await pageB.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);
    await pageB.waitForSelector("text=Start New Game", { timeout: 8000 });
    await deviceJoin(pageB, roomCode);
    await pageB.waitForSelector("text=Continue Battle", { timeout: 10000 });
    await pageB.locator("text=Continue Battle").click();
    await sleep(800);
    // Let B's subscriptions settle
    await pageB.waitForSelector("text=Round 1", { timeout: 8000 });
    await sleep(2000);

    // A plays until Alpha wins (4 rounds at 25, 1 round at 1)
    for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
    await playRound(page, "Alpha", { Beta: 1 }); // Beta=101 → Alpha wins
    await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
    assert(true, "E3: Host (A) sees winner screen");

    // B should also see winner overlay via ingestCloudSession fix
    await pageB.waitForSelector("text=Chhummy Champion", { timeout: 12000 });
    assert(true, "E3: Joined device (B) also sees winner overlay via ingestCloudSession");
  } finally {
    await ctxB.close();
  }
}

// E4: Room isolation — two different rooms get different codes
async function testE4(page, ctx) {
  const ctxB = await ctx.browser().newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await ctxB.newPage();
  try {
    await goHome(page);
    await page.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const codeA = (await page.locator(".font-mono.text-xl.font-black").first().textContent()).trim();

    await goHome(pageB);
    await pageB.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const codeB = (await pageB.locator(".font-mono.text-xl.font-black").first().textContent()).trim();

    assert(codeA !== codeB, `E4: Two rooms have unique codes (${codeA} vs ${codeB})`);
    assert(codeA.length === 6, `E4: Room code is 6 characters: "${codeA}"`);
    assert(/^[A-Z0-9]+$/i.test(codeA), `E4: Room code is alphanumeric: "${codeA}"`);
  } finally {
    await ctxB.close();
  }
}

// E5: Bidirectional sync — B plays a round, A sees the update
async function testE5(page, ctx) {
  const ctxB = await ctx.browser().newContext({ viewport: { width: 390, height: 844 } });
  const pageB = await ctxB.newPage();
  try {
    // A creates room
    await goHome(page);
    await page.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(1800);
    const code = (await page.locator(".font-mono.text-xl.font-black").first().textContent()).trim();
    await startGame(page, ["Alpha", "Beta"]);

    // B joins
    await pageB.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);
    await deviceJoin(pageB, code);
    await pageB.waitForSelector("text=Continue Battle", { timeout: 10000 });
    await pageB.locator("text=Continue Battle").click();
    await sleep(1500);
    await pageB.waitForSelector("text=Round 1", { timeout: 8000 });
    await sleep(2000);

    // B plays a round
    await playRound(pageB, "Alpha", { Beta: 25 });
    await pageB.waitForSelector("text=Round 2", { timeout: 8000 });
    assert(true, "E5: Device B played a round");

    // A should see Round 2
    await page.waitForSelector("text=Round 2", { timeout: 12000 });
    assert(true, "E5: Device A sees Round 2 after B played (bidirectional sync)");
  } finally {
    await ctxB.close();
  }
}

// ── GROUP F: UI Features ──────────────────────────────────────────────────────

// F1: Quick Rematch — winner screen → rematch → same players, Round 1
async function testF1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  await playRound(page, "Alpha", { Beta: 1 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("button:has-text('Quick Rematch')").click();
  await sleep(800);
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  assert(true, "Quick Rematch: game resets to Round 1 with same players");
  // Both players should still be there
  assert(
    await page.locator("text=Alpha").first().isVisible(),
    "Quick Rematch: Alpha still in game"
  );
}

// F2: Player history sheet — tap player card during game
async function testF2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);
  await sleep(300);
  // Tap Alpha's card (player card, not button)
  await page.locator(".rounded-2xl").filter({ hasText: /Alpha/ }).first().click();
  await sleep(600);
  const historySheet = await page.locator("text=rounds played").isVisible().catch(() => false);
  assert(historySheet, "Player history sheet: shows 'N rounds played' after tapping player card");
  // Close by tapping backdrop
  await page.locator(".fixed.inset-0.z-40").first().click({ position: { x: 195, y: 100 } }).catch(() => {});
  await sleep(400);
}

// F3: Pause → resume game
async function testF3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await page.locator("button:has-text('Pause')").click();
  await sleep(400);
  assert(await page.locator("text=Game Paused").isVisible().catch(() => false), "Pause: overlay shows");
  await page.locator("button:has-text('Resume')").click();
  await sleep(400);
  assert(await page.locator("text=Round 1").first().isVisible(), "Pause → Resume: back to game");
}

// F4: Tap hint — visible when rounds > 0
async function testF4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  // Before any round — hint should NOT be visible
  const hintBefore = await page.locator("text=round history").isVisible().catch(() => false);
  assert(!hintBefore, "Tap hint: not shown before any rounds");
  await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);
  await sleep(500);
  const hintAfter = await page.locator("text=round history").isVisible().catch(() => false);
  assert(hintAfter, "Tap hint: shown after first round");
}

// F5: Home Hall of Fame shows Champion/Closer/Patsy after game
async function testF5(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 15 });
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 }); // Beta eliminated (PATSY)
  await dismissElimination(page);
  await page.waitForSelector("text=Round 6", { timeout: 6000 });
  await playRound(page, "Alpha", { Gamma: 25 });
  await playRound(page, "Alpha", { Gamma: 25 }); // Gamma=110 → Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Back to Home").click();
  await sleep(800);
  assert(
    await page.locator("text=CHAMPION").isVisible().catch(() => false),
    "Hall of Fame: CHAMPION shown"
  );
  assert(
    await page.locator("text=PATSY").isVisible().catch(() => false),
    "Hall of Fame: PATSY shown"
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

(async () => {
  browser = await chromium.launch({ headless: true });
  const start = Date.now();

  log("\n════════════════════════════════════════");
  log("     CHHUMMY TRACKER — COMPREHENSIVE E2E");
  log("════════════════════════════════════════");

  // Group A: Player count variants
  log("\n── GROUP A: Player Count Variants ──");
  await runTest("A1: 2-player game (no elimination overlay)", testA1);
  await runTest("A2: 3-player game (1 elimination → winner)", testA2);
  await runTest("A3: 4-player game (2 in same round eliminated)", testA3);
  await runTest("A4: 5-player game (sequential eliminations)", testA4);
  await runTest("A5: 6-player game (max players)", testA5);

  // Group B: Score boundaries
  log("\n── GROUP B: Score Boundaries ──");
  await runTest("B1: Closer constraint (only 0-5 chips, no Custom)", testB1);
  await runTest("B2: 100 pts is still SAFE (not eliminated)", testB2);
  await runTest("B3: Multiple players can score 0 same round", testB3);
  await runTest("B4: All-out — all cross 100 same round (closer wins)", testB4Proper);

  // Group C: Undo/Redo
  log("\n── GROUP C: Undo / Redo ──");
  await runTest("C1: Undo after 2 rounds", testC1);
  await runTest("C2: Undo at round 0 (safe no-op)", testC2);
  await runTest("C3: Redo after undo", testC3);
  await runTest("C4: Redo cleared after new round post-undo", testC4);

  // Group D: Stats & Achievements
  log("\n── GROUP D: Stats & Achievements ──");
  await runTest("D1: Stats + History shows data after game", testD1);
  await runTest("D2: ICE_COLD achievement (0 total pts winner)", testD2);
  await runTest("D3: PATSY achievement (first eliminated)", testD3);
  await runTest("D4: History expand shows round breakdown", testD4);

  // Group E: Firebase multi-device (each test creates 2 fresh contexts internally)
  log("\n── GROUP E: Firebase Multi-Device ──");
  await runTest("E1: 2-device sync (A plays, B sees Round 2)", (p, c) => testE1(p, c));
  await runTest("E2: History on joined device (new fix)", (p, c) => testE2(p, c));
  await runTest("E3: Winner overlay on joined device (new fix)", (p, c) => testE3(p, c));
  await runTest("E4: Room isolation (two rooms, different codes)", (p, c) => testE4(p, c));
  await runTest("E5: Bidirectional sync (B plays, A sees)", (p, c) => testE5(p, c));

  // Group F: UI Features
  log("\n── GROUP F: UI Features ──");
  await runTest("F1: Quick Rematch resets to Round 1", testF1);
  await runTest("F2: Player history sheet (tap card mid-game)", testF2);
  await runTest("F3: Pause → Resume", testF3);
  await runTest("F4: Tap hint visibility", testF4);
  await runTest("F5: Hall of Fame shows Champion + Patsy", testF5);

  await browser.close();

  const duration = ((Date.now() - start) / 1000).toFixed(1);
  log("\n════════════════════════════════════════");
  log(`  Results: ${passed} passed, ${failed} failed (${duration}s)`);
  log("════════════════════════════════════════");

  if (results.filter(r => r.status === "FAIL").length > 0) {
    log("\nFailed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => log(`  ❌ ${r.msg}`));
  }

  process.exit(failed > 0 ? 1 : 0);
})();
