// module-tests.mjs — Module-by-module edge case & boundary tests
// Covers gaps from comprehensive-scenarios.mjs: numpad cap, preview, achievements,
// player limits, undo sequences, all-out edge cases.
// Run: node module-tests.mjs  (dev server on port 5173)

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let passed = 0, failed = 0;
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

// ── Core Helpers ──────────────────────────────────────────────────────────────

async function waitOverlayGone(page) {
  await page.waitForFunction(
    () => !document.querySelector(".fixed.inset-0.z-50"),
    { timeout: 5000 }
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

async function goHome(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(1200);
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
}

async function startGame(page, playerNames) {
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });
  for (const name of playerNames) await addPlayer(page, name);
  await page.locator("button:has-text('Start Session')").click();
  await page.waitForSelector("text=Round 1", { timeout: 8000 });
  await sleep(400);
}

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

async function dismissElimination(page) {
  try {
    await page.waitForSelector("text=points — OUT", { timeout: 3000 });
    await page.locator("button:has-text('Continue')").click();
    await sleep(500);
    return true;
  } catch { return false; }
}

// Open custom numpad for a player in the EnterScores overlay
async function openNumpad(page, playerName) {
  const overlay = page.locator(".fixed.inset-0.z-50");
  await overlay
    .locator("div.rounded-2xl")
    .filter({ hasText: new RegExp(playerName) })
    .locator("button:has-text('Custom')")
    .click();
  await page.waitForSelector("text=ka score", { timeout: 3000 });
  await sleep(150);
}

// Click a digit button on the numpad (zIndex 9999 portal)
async function numpadDigit(page, d) {
  await page.locator('[style*="z-index: 9999"]')
    .locator("button")
    .filter({ hasText: new RegExp(`^${d}$`) })
    .first()
    .click();
  await sleep(80);
}

async function numpadBackspace(page) {
  await page.locator('[style*="z-index: 9999"]')
    .locator("button")
    .filter({ hasText: /^⌫$/ })
    .click();
  await sleep(80);
}

async function numpadConfirm(page) {
  await page.locator('[style*="z-index: 9999"]')
    .locator("button")
    .filter({ hasText: /^✓$/ })
    .click();
  // Wait for portal to fully unmount before next interaction
  await page.waitForFunction(
    () => !document.querySelector('[style*="z-index: 9999"]'),
    { timeout: 3000 }
  ).catch(() => {});
  await sleep(250);
}

// Returns the text shown in the numpad display ("—" when empty, or the number)
async function numpadDisplay(page) {
  return await page.locator(".text-5xl.font-bold").textContent();
}

// Returns the numpad subtitle ("Max 60" or "Max reached")
async function numpadSubtitle(page) {
  return await page.locator('[style*="z-index: 9999"]')
    .locator(".text-xs.opacity-50")
    .last()
    .textContent();
}

// Enter custom score via numpad
async function enterCustomScore(page, playerName, digits) {
  await openNumpad(page, playerName);
  await sleep(100);
  for (const ch of String(digits)) await numpadDigit(page, ch);
  await numpadConfirm(page);
}

// Play a round with exact control — standard chips OR custom numpad for non-standard values
async function playRoundExact(page, closerName, closerScore, nonCloserScores) {
  const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: closerName }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });

  await clickChip(page, closerName, closerScore);

  for (const [name, score] of Object.entries(nonCloserScores)) {
    if (CHIPS.includes(score)) {
      await clickChip(page, name, score);
    } else {
      await enterCustomScore(page, name, score);
    }
  }

  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);
}

// Perform undo with confirmation dialog
async function doUndo(page) {
  await page.locator("button:has-text('Undo')").first().click();
  await page.waitForSelector("text=Undo Round", { timeout: 3000 });
  await page.locator("button:has-text('Yes')").first().click();
  await sleep(500);
}

// Read the round counter text from the live game header
async function getRoundNumber(page) {
  const txt = await page.locator("text=/Round \\d+/").first().textContent();
  const m = txt?.match(/Round (\d+)/);
  return m ? parseInt(m[1]) : -1;
}

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
      console.error(`  ❌ ERROR: ${e.message.slice(0, 250)}`);
      failed++;
      results.push({ status: "FAIL", msg: name + ": " + e.message.slice(0, 100) });
    }
  } finally {
    await ctx.close();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1: Score Entry & Chip Logic
// ═══════════════════════════════════════════════════════════════════════════════

// M1.1 — Closer sees ONLY chips 0-5; no Custom button; no chip 10
async function testM1_1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  const overlay = page.locator(".fixed.inset-0.z-50");
  const alphaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Alpha/ });

  // Closer chips 0-5 must ALL exist
  for (const n of [0, 1, 2, 3, 4, 5]) {
    const count = await alphaSection.locator("button.rounded-xl").filter({ hasText: new RegExp(`^${n}$`) }).count();
    assert(count > 0, `M1.1: Closer has chip ${n}`);
  }

  // Chip 10 must NOT exist for closer
  const chip10 = await alphaSection.locator("button.rounded-xl").filter({ hasText: /^10$/ }).count();
  assert(chip10 === 0, "M1.1: Closer does NOT have chip 10");

  // No Custom button for closer
  const customBtn = await alphaSection.locator("button:has-text('Custom')").count();
  assert(customBtn === 0, "M1.1: Closer has no Custom button");
}

// M1.2 — Non-closer has chip 25 and Custom; does NOT have chip 30
async function testM1_2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  const overlay = page.locator(".fixed.inset-0.z-50");
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });

  const chip25 = await betaSection.locator("button.rounded-xl").filter({ hasText: /^25$/ }).count();
  assert(chip25 > 0, "M1.2: Non-closer has chip 25 (max non-custom chip)");

  const chip30 = await betaSection.locator("button.rounded-xl").filter({ hasText: /^30$/ }).count();
  assert(chip30 === 0, "M1.2: Non-closer does NOT have chip 30");

  const customBtn = await betaSection.locator("button:has-text('Custom')").count();
  assert(customBtn > 0, "M1.2: Non-closer has Custom button");
}

// M1.3 — All standard non-closer chips present: 0,1,2,3,4,5,10,15,20,25
async function testM1_3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  const overlay = page.locator(".fixed.inset-0.z-50");
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });

  const expectedChips = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];
  for (const n of expectedChips) {
    const count = await betaSection.locator("button.rounded-xl").filter({ hasText: new RegExp(`^${n}$`) }).count();
    assert(count > 0, `M1.3: Non-closer has chip ${n}`);
  }
}

// M1.4 — Numpad opens empty (shows "—") and subtitle shows "Max 60"
async function testM1_4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  await openNumpad(page, "Beta");
  const display = await numpadDisplay(page);
  assert(display === "—", "M1.4: Numpad opens showing '—' (empty)");

  const sub = await numpadSubtitle(page);
  assert(sub?.includes("Max 60"), "M1.4: Numpad subtitle shows 'Max 60'");
}

// M1.5 — Numpad accepts exactly 60; subtitle changes to "Max reached"
async function testM1_5(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  await openNumpad(page, "Beta");
  await numpadDigit(page, 6);
  await numpadDigit(page, 0);

  const display = await numpadDisplay(page);
  assert(display === "60", "M1.5: Numpad accepts '60' exactly");

  const sub = await numpadSubtitle(page);
  assert(sub?.includes("Max reached"), "M1.5: Subtitle changes to 'Max reached' at 60");
}

// M1.6 — Numpad rejects digit that would exceed 60 (type 6 then 1 → stays "6")
async function testM1_6(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  await openNumpad(page, "Beta");
  await numpadDigit(page, 6);
  await numpadDigit(page, 1); // would make 61 > 60 → rejected

  const display = await numpadDisplay(page);
  assert(display === "6", "M1.6: Digit '1' rejected (would make 61>60); display stays '6'");
}

// M1.7 — Numpad rejects 0 that would make total >60 (type 7 then 0 → stays "7")
async function testM1_7(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  await openNumpad(page, "Beta");
  await numpadDigit(page, 7);
  await numpadDigit(page, 0); // would make 70 > 60 → rejected

  const display = await numpadDisplay(page);
  assert(display === "7", "M1.7: '0' rejected after '7' (70>60); display stays '7'");
}

// M1.8 — Numpad backspace removes last digit
async function testM1_8(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  await openNumpad(page, "Beta");
  await numpadDigit(page, 3);
  await numpadDigit(page, 5); // display = "35"
  await numpadBackspace(page); // removes "5" → display = "3"

  const display = await numpadDisplay(page);
  assert(display === "3", "M1.8: Backspace removes last digit (35 → 3)");

  await numpadBackspace(page); // removes "3" → display = "—"
  const display2 = await numpadDisplay(page);
  assert(display2 === "—", "M1.8: Backspace on single digit → empty '—'");
}

// M1.9 — Preview shows running total formula "X + Y = Z"
async function testM1_9(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Build Beta up to 25 pts via one round
  await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Now start round 2 and check preview after chip selection
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });

  // Select chip 5 for Beta (total would be 25+5=30)
  await clickChip(page, "Beta", 5);

  const overlay = page.locator(".fixed.inset-0.z-50");
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });
  const preview = await betaSection.locator(".mt-2.text-sm").textContent();
  assert(preview?.includes("25 + 5 = 30"), "M1.9: Preview shows '25 + 5 = 30' formula");
}

// M1.10 — Preview shows 💀 when pending+total > 100 (101)
async function testM1_10(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Get Beta to exactly 100 pts: 4 rounds × 25
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Beta = 100. Start round 5, check preview at chip 1 → 101 → skull
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Beta", 1);

  const overlay = page.locator(".fixed.inset-0.z-50");
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });
  const preview = await betaSection.locator(".mt-2.text-sm").textContent();
  assert(preview?.includes("💀"), "M1.10: Preview shows 💀 when pending+total = 101 (>100)");
  assert(preview?.includes("= 101"), "M1.10: Preview shows correct sum 101");
}

// M1.11 — Preview does NOT show 💀 when pending+total = exactly 100 (boundary)
async function testM1_11(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Get Beta to 75 pts
  for (let i = 0; i < 3; i++) await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Beta = 75. Chip 25 → 100 → NO skull
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Beta", 25);

  const overlay = page.locator(".fixed.inset-0.z-50");
  const betaSection = overlay.locator("div.rounded-2xl").filter({ hasText: /Beta/ });
  const preview = await betaSection.locator(".mt-2.text-sm").textContent();
  assert(preview?.includes("= 100"), "M1.11: Preview shows 100 (boundary)");
  assert(!preview?.includes("💀"), "M1.11: Preview does NOT show 💀 at exactly 100");
}

// M1.12 — Confirm blocked with error message when player score missing
async function testM1_12(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator("button").filter({ hasText: "Alpha" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  // Enter only closer score (Alpha=0), NOT Beta's score
  await clickChip(page, "Alpha", 0);

  // Try to confirm — should fail
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(400);

  const errVisible = await page.locator("text=Sabka score daal pehle").isVisible().catch(() => false);
  assert(errVisible, "M1.12: Error 'Sabka score daal pehle 😭' shown when score missing");

  // Overlay should still be showing (round NOT confirmed)
  const stillOpen = await page.locator("text=Confirm Round").isVisible().catch(() => false);
  assert(stillOpen, "M1.12: EnterScores overlay stays open after validation error");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: Round Outcome Boundaries
// ═══════════════════════════════════════════════════════════════════════════════

// M2.1 — Player at exactly 100 is safe (game continues, no elimination)
async function testM2_1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // Beta gets exactly 100: 4 × 25
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 0 });

  await waitOverlayGone(page);
  const elim = await dismissElimination(page);
  assert(!elim, "M2.1: No elimination overlay when player reaches exactly 100");

  // Game continues to Round 5
  await page.waitForSelector("text=Round 5", { timeout: 6000 });
  assert(true, "M2.1: Game continues to Round 5 after player reaches 100");

  // Beta still appears as active in Who Closed (not eliminated)
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  const betaBtn = await page.locator("button").filter({ hasText: /Beta/ }).count();
  assert(betaBtn > 0, "M2.1: Beta (at 100) still shown as closeable player");
}

// M2.2 — Player crossing from 100 to 101 is eliminated
async function testM2_2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // Beta to 100 (safe)
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 0 });
  await waitOverlayGone(page);
  const safe = await dismissElimination(page);
  assert(!safe, "M2.2: Beta at 100 not eliminated");

  // Next round: Beta gets 1 → 101 (eliminated)
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 });
  const elim = await dismissElimination(page);
  assert(elim, "M2.2: Elimination overlay shown when Beta crosses from 100 to 101");
}

// M2.3 — All-out with different totals: player with lowest total wins (not the closer)
async function testM2_3(page) {
  // Setup to reach: Alpha=96, Beta=97, Gamma=98
  // Final round: Gamma closes (4→102), Alpha chip5 (101), Beta chip5 (102)
  // Result: Alpha (101) wins — lowest total, NOT the closer
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  await playRoundExact(page, "Alpha", 0, { Beta: 48, Gamma: 49 }); // B=48,G=49
  await waitOverlayGone(page);
  await playRoundExact(page, "Alpha", 0, { Beta: 49, Gamma: 49 }); // B=97,G=98
  await waitOverlayGone(page);
  await playRoundExact(page, "Beta", 0, { Alpha: 56, Gamma: 0 });  // A=56
  await waitOverlayGone(page);
  await playRoundExact(page, "Beta", 0, { Alpha: 40, Gamma: 0 });  // A=96
  await waitOverlayGone(page);

  // All-out round: Gamma closes 4 (98+4=102), Alpha chip5 (96+5=101), Beta chip5 (97+5=102)
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Gamma" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Gamma", 4); // closer score 4
  await clickChip(page, "Alpha", 5);
  await clickChip(page, "Beta", 5);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);

  // All 3 crossed 100 — winner overlay should appear (allOut path)
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  const winnerText = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerText?.includes("Alpha"), "M2.3: Alpha wins all-out with lowest total (101), NOT the closer Gamma");
}

// M2.4 — All-out tie: when lowest is tied, closer wins as tiebreaker
async function testM2_4(page) {
  // Setup: Alpha=96, Beta=97, Gamma=97
  // Final round: Gamma closes (4→101), Alpha chip5 (101), Beta chip5 (102)
  // Alpha=101, Gamma=101 tied → Gamma (closer) wins
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  await playRoundExact(page, "Alpha", 0, { Beta: 48, Gamma: 48 }); // B=48,G=48
  await waitOverlayGone(page);
  await playRoundExact(page, "Alpha", 0, { Beta: 49, Gamma: 49 }); // B=97,G=97
  await waitOverlayGone(page);
  await playRoundExact(page, "Beta", 0, { Alpha: 56, Gamma: 0 });  // A=56
  await waitOverlayGone(page);
  await playRoundExact(page, "Beta", 0, { Alpha: 40, Gamma: 0 });  // A=96
  await waitOverlayGone(page);

  // All-out round: Gamma closes 4 (97+4=101), Alpha chip5 (96+5=101), Beta chip5 (97+5=102)
  // Alpha=101, Gamma=101 TIED, Beta=102 → tiebreaker: Gamma (closer) wins
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Gamma" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Gamma", 4);
  await clickChip(page, "Alpha", 5);
  await clickChip(page, "Beta", 5);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);

  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  const winnerText = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerText?.includes("Gamma"), "M2.4: All-out tie: Gamma (closer, 101) wins over Alpha (also 101)");
}

// M2.5 — Eliminated player shown in Who Closed but disabled; active players enabled
async function testM2_5(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // Eliminate Gamma: 4 rounds ×25 = 100, then +1 = 101
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 0, Gamma: 25 });
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Beta: 0, Gamma: 1 }); // Gamma → 101, eliminated
  await dismissElimination(page);

  // In next round's Who Closed: Gamma IS shown but disabled with "💀 OUT" badge
  await waitOverlayGone(page);
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });

  // Gamma button present but disabled
  const gammaBtn = page.locator("button").filter({ hasText: /Gamma/ });
  const gammaBtnCount = await gammaBtn.count();
  assert(gammaBtnCount > 0, "M2.5: Gamma shown in Who Closed (all players shown)");
  const gammaDisabled = await gammaBtn.first().isDisabled();
  assert(gammaDisabled, "M2.5: Gamma's button is disabled (cannot close)");

  // Gamma shows "💀 OUT" badge
  const gammaOut = await gammaBtn.first().locator("text=OUT").isVisible().catch(() => false);
  assert(gammaOut, "M2.5: Gamma shows '💀 OUT' badge in Who Closed");

  // Active players are NOT disabled
  const alphaBtn = page.locator("button").filter({ hasText: /Alpha/ });
  const alphaDisabled = await alphaBtn.first().isDisabled();
  assert(!alphaDisabled, "M2.5: Alpha (active) is NOT disabled in Who Closed");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: Undo / Redo Extended
// ═══════════════════════════════════════════════════════════════════════════════

// M3.1 — Sequential undos decrement round counter correctly
async function testM3_1(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Play 3 rounds
  for (let i = 0; i < 3; i++) await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Should be on Round 4
  let roundNum = await getRoundNumber(page);
  assert(roundNum === 4, `M3.1: After 3 rounds, shows Round 4 (got ${roundNum})`);

  await doUndo(page);
  roundNum = await getRoundNumber(page);
  assert(roundNum === 3, `M3.1: After 1st undo, shows Round 3 (got ${roundNum})`);

  await doUndo(page);
  roundNum = await getRoundNumber(page);
  assert(roundNum === 2, `M3.1: After 2nd undo, shows Round 2 (got ${roundNum})`);

  await doUndo(page);
  roundNum = await getRoundNumber(page);
  assert(roundNum === 1, `M3.1: After 3rd undo, shows Round 1 (got ${roundNum})`);
}

// M3.2 — Undo reverts player card totals
async function testM3_2(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Round 1: Beta gets 25
  await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Verify Beta shows 25 on card
  const betaCard25 = await page.locator("text=25").first().isVisible().catch(() => false);
  assert(betaCard25, "M3.2: Beta shows 25 pts before undo");

  await doUndo(page);
  await sleep(300);

  // After undo, Beta total should be 0 (no rounds played)
  const betaCard0 = await page.locator("text=25").first().isVisible().catch(() => false);
  assert(!betaCard0, "M3.2: Beta no longer shows 25 pts after undo (reverted to 0)");
}

// M3.3 — Redo available after undo; redo banner disappears after new round
async function testM3_3(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  await playRound(page, "Alpha", { Beta: 25 });
  await waitOverlayGone(page);

  // Undo → redo should become available
  await doUndo(page);
  const redoBanner = await page.locator("text=Redo available").isVisible().catch(() => false);
  assert(redoBanner, "M3.3: Redo available banner appears after undo");

  // Play a new round → redo should be cleared
  await playRound(page, "Alpha", { Beta: 10 });
  await waitOverlayGone(page);

  const redoGone = await page.locator("text=Redo available").isVisible().catch(() => false);
  assert(!redoGone, "M3.3: Redo available banner gone after playing new round");
}

// M3.4 — After multiple undos, can still play new rounds successfully
async function testM3_4(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  for (let i = 0; i < 3; i++) await playRound(page, "Alpha", { Beta: 5 });
  await waitOverlayGone(page);

  // Undo all 3
  for (let i = 0; i < 3; i++) await doUndo(page);

  let roundNum = await getRoundNumber(page);
  assert(roundNum === 1, "M3.4: Back to Round 1 after 3 undos");

  // Play a fresh round after undos
  await playRound(page, "Alpha", { Beta: 10 });
  await waitOverlayGone(page);

  roundNum = await getRoundNumber(page);
  assert(roundNum === 2, "M3.4: Round 2 shows correctly after playing post-undo round");
}

// M3.5 — Undo button is a safe no-op when at 0 rounds (no crash)
async function testM3_5(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // At round 0, clicking undo should show no confirmation (guard: rounds.length === 0)
  await page.locator("button:has-text('Undo')").first().click();
  await sleep(500);

  // Confirm dialog should NOT appear
  const confirmShown = await page.locator("text=Undo Round").isVisible().catch(() => false);
  assert(!confirmShown, "M3.5: Undo at round 0 shows no confirm dialog (safe no-op)");

  // Game still at Round 1, no crash
  const round1 = await page.locator("text=Round 1").first().isVisible().catch(() => false);
  assert(round1, "M3.5: Game still at Round 1 after safe no-op undo");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4: Player Management
// ═══════════════════════════════════════════════════════════════════════════════

// M4.1 — Name input has maxLength=20 attribute
async function testM4_1(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });
  await page.locator("button:has-text('+ Add Player')").click();
  await page.waitForSelector("input[placeholder='Naam likhna yahan...']", { timeout: 3000 });

  const maxLen = await page.locator("input[placeholder='Naam likhna yahan...']").getAttribute("maxlength");
  assert(maxLen === "20", `M4.1: Name input has maxlength="20" (got "${maxLen}")`);
}

// M4.2 — Duplicate name (same case) shows "Yeh naam pehle se hai!"
async function testM4_2(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  await addPlayer(page, "Kush");
  await page.locator("button:has-text('+ Add Player')").click();
  await page.locator("input[placeholder='Naam likhna yahan...']").fill("Kush");
  await page.locator("button").filter({ hasText: /^Add$/ }).click();
  await sleep(300);

  const errVisible = await page.locator("text=Yeh naam pehle se hai").isVisible().catch(() => false);
  assert(errVisible, "M4.2: Duplicate name (same case) shows 'Yeh naam pehle se hai!'");
}

// M4.3 — Duplicate name (different case) also blocked
async function testM4_3(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  await addPlayer(page, "Kush");
  await page.locator("button:has-text('+ Add Player')").click();
  await page.locator("input[placeholder='Naam likhna yahan...']").fill("KUSH");
  await page.locator("button").filter({ hasText: /^Add$/ }).click();
  await sleep(300);

  const errVisible = await page.locator("text=Yeh naam pehle se hai").isVisible().catch(() => false);
  assert(errVisible, "M4.3: Duplicate name (different case 'KUSH' vs 'Kush') also blocked");
}

// M4.4 — Edit player name works; updated name appears in player list
async function testM4_4(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  await addPlayer(page, "OldName");

  // Open edit modal via ✏️ icon
  await page.locator("button").filter({ hasText: /✏️/ }).first().click();
  await page.waitForSelector("input[maxlength='20']", { timeout: 3000 });
  await page.locator("input[maxlength='20']").fill("NewName");
  await page.locator("button:has-text('Save')").click();
  await sleep(400);

  const newNameVisible = await page.locator("text=NewName").isVisible().catch(() => false);
  assert(newNameVisible, "M4.4: Edited player name 'NewName' appears in player list");

  const oldNameGone = await page.locator("text=OldName").isVisible().catch(() => false);
  assert(!oldNameGone, "M4.4: Old name 'OldName' no longer visible after edit");
}

// M4.5 — Edit player name to a duplicate shows error
async function testM4_5(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  await addPlayer(page, "PlayerOne");
  await addPlayer(page, "PlayerTwo");

  // Available list: [PlayerTwo (idx 0), PlayerOne (idx 1)] — newest first
  // Edit PlayerTwo (first edit button) and rename to "PlayerOne" → duplicate error
  const editButtons = await page.locator("button").filter({ hasText: /✏️/ }).all();
  await editButtons[0].click(); // PlayerTwo's edit button (newest, at top)
  await page.waitForSelector("input[maxlength='20']", { timeout: 3000 });
  await page.locator("input[maxlength='20']").fill("PlayerOne");
  await page.locator("button:has-text('Save')").click();
  await sleep(300);

  const errVisible = await page.locator("text=Yeh naam pehle se hai").isVisible().catch(() => false);
  assert(errVisible, "M4.5: Renaming to duplicate shows 'Yeh naam pehle se hai!'");
}

// M4.6 — Delete player removes them from the available list
async function testM4_6(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  await addPlayer(page, "DeleteMe");
  const countBefore = await page.locator("text=DeleteMe").count();
  assert(countBefore > 0, "M4.6: 'DeleteMe' player appears before deletion");

  // Open edit and delete
  await page.locator("button").filter({ hasText: /✏️/ }).first().click();
  await page.waitForSelector("button:has-text('Delete')", { timeout: 3000 });
  await page.locator("button:has-text('Delete')").click();
  await sleep(400);

  const countAfter = await page.locator("text=DeleteMe").count();
  assert(countAfter === 0, "M4.6: 'DeleteMe' player gone from list after deletion");
}

// M4.7 — 6-player limit: cannot select 7th player (toggle guard)
async function testM4_7(page) {
  await goHome(page);
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });

  // Add 6 players (all auto-selected on add)
  for (let i = 1; i <= 6; i++) await addPlayer(page, `P${i}`);

  // 6 players selected. Add a 7th.
  await addPlayer(page, "P7");

  // P7 was just added but selection should be capped at 6 (slice(0,6))
  // Try to click P7's card directly — should NOT add to selection
  const p7Cards = page.locator("div.rounded-2xl.bg-card").filter({ hasText: /P7/ });
  const p7CardCount = await p7Cards.count();
  if (p7CardCount > 0) {
    await p7Cards.first().click();
    await sleep(300);
  }

  // "Start Session" button should still work (6 selected is valid)
  const startEnabled = await page.locator("button:has-text('Start Session')").isEnabled().catch(() => false);
  assert(startEnabled, "M4.7: Start Session enabled with 6 players selected");

  // Count how many players are in "selected" state — should be 6
  // Selected players have the highlight styling. Check label "6 selected" or count by card style.
  // The subtitle says "Select 2–6 players", and the dealer section shows selected players
  // Count buttons in the dealer picker section (which shows only selected players)
  const dealerPills = await page.locator("button").filter({ hasText: /deal/ }).count();
  // Actually count differently — check that only 6 chips appear in the dealer section
  // The dealer section has player pills, one per selected player
  // Use a different approach: verify clicking P7 didn't expand selection beyond 6
  // by checking the dealer section pills
  const dealerSection = page.locator("text=Pehle kaun deal karega").locator("..");
  const dealerPillCount = await dealerSection.locator("button").count();
  assert(dealerPillCount <= 6, `M4.7: Dealer section has ≤6 players (got ${dealerPillCount}), confirming selection capped at 6`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5: Stats & Achievements
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: Navigate to Stats > specific tab
async function openStats(page, tab = "Players") {
  await page.locator("button:has-text('Stats')").click();
  await page.waitForSelector(`text=${tab}`, { timeout: 5000 });
  await page.locator(`button:has-text('${tab}')`).first().click();
  await sleep(500);
}

// M5.1 — UNTOUCHABLE badge: winner never reached 70+ (also verifies ICE_COLD)
async function testM5_1(page) {
  // Alpha closes every round (score 0). Beta+Gamma eventually eliminated.
  // Alpha finishes at 0 pts, never reached 70 → ICE_COLD + UNTOUCHABLE
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // 4 rounds: Beta and Gamma accumulate 25 each round → B=100, G=100
  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 25 });
  await waitOverlayGone(page);

  // Eliminate Beta
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 }); // Beta=101 OUT
  await dismissElimination(page);
  await waitOverlayGone(page);

  // Eliminate Gamma → Alpha wins
  await playRound(page, "Alpha", { Gamma: 1 }); // Gamma=101 OUT → 1 survivor
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  const winnerTxt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerTxt?.includes("Alpha"), "M5.1: Alpha is the winner");

  // Navigate to Stats
  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 6000 });
  await openStats(page, "Players");

  const alphaCard = page.locator(".rounded-2xl").filter({ hasText: /Alpha/ }).first();
  const iceCold = await alphaCard.locator("text=Ice Cold").isVisible().catch(() => false);
  assert(iceCold, "M5.1: ICE_COLD badge shown for Alpha (0 final points)");

  const untouchable = await alphaCard.locator("text=Untouchable").isVisible().catch(() => false);
  assert(untouchable, "M5.1: UNTOUCHABLE badge shown for Alpha (never reached 70+)");
}

// M5.2 — SURVIVOR badge: winner was at 85+ at some point during game
async function testM5_2(page) {
  // Alpha accumulates 85 pts (at 85 = SURVIVOR condition), then wins
  // Round flow: Alpha gets points via "non-closer", then closes to win
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // Build Alpha's score to 85+
  await playRound(page, "Beta", { Alpha: 25, Gamma: 25 }); // A=25,B=0,G=25
  await waitOverlayGone(page);
  await playRound(page, "Beta", { Alpha: 25, Gamma: 25 }); // A=50,G=50
  await waitOverlayGone(page);
  await playRound(page, "Gamma", { Alpha: 25, Beta: 25 });  // A=75,B=25,G=50
  await waitOverlayGone(page);
  await playRound(page, "Gamma", { Alpha: 10, Beta: 25 });  // A=85 (SURVIVOR!),B=50,G=50
  await waitOverlayGone(page);

  // Now eliminate Beta and Gamma; Alpha wins with 85 pts
  await playRound(page, "Gamma", { Alpha: 0, Beta: 25 }); // B=75
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Beta: 25, Gamma: 25 }); // B=100,G=75
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Beta: 1, Gamma: 25 });  // B=101 OUT, G=100
  await dismissElimination(page);
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Gamma: 1 }); // G=101 OUT → Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  const winnerTxt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerTxt?.includes("Alpha"), "M5.2: Alpha wins (at 85+ during game)");

  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 6000 });
  await openStats(page, "Players");

  const alphaCard = page.locator(".rounded-2xl").filter({ hasText: /Alpha/ }).first();
  const survivor = await alphaCard.locator("text=Survivor").isVisible().catch(() => false);
  assert(survivor, "M5.2: SURVIVOR badge shown for Alpha (was at 85+ but still won)");

  // Alpha had 85 pts so NOT ICE_COLD and NOT UNTOUCHABLE
  const iceColdbad = await alphaCard.locator("text=Ice Cold").isVisible().catch(() => false);
  assert(!iceColdbad, "M5.2: ICE_COLD NOT awarded (Alpha finished with 85, not 0)");
}

// M5.3 — CLUTCH_MASTER awarded to unique close leader
async function testM5_3(page) {
  // Alpha closes 5 rounds (every round), Beta/Gamma close 0. Alpha wins.
  // Alpha is unique close leader → CLUTCH_MASTER
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  for (let i = 0; i < 4; i++) await playRound(page, "Alpha", { Beta: 25, Gamma: 25 });
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Beta: 1, Gamma: 0 }); // Beta=101 OUT
  await dismissElimination(page);
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Gamma: 1 }); // Gamma=101 OUT → Alpha wins
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });

  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 6000 });
  await openStats(page, "Players");

  const alphaCard = page.locator(".rounded-2xl").filter({ hasText: /Alpha/ }).first();
  const clutch = await alphaCard.locator("text=Clutch Master").isVisible().catch(() => false);
  assert(clutch, "M5.3: CLUTCH_MASTER badge awarded to Alpha (unique close leader)");
}

// M5.4 — CLUTCH_MASTER NOT awarded when closes are tied
async function testM5_4(page) {
  // Setup: Alpha closes 2 rounds, Beta closes 2 rounds, Gamma closes final round
  // All cross 100 (all-out) → Gamma wins. Alpha and Beta both have 2 closes (max=2, 2 leaders) → NO CLUTCH_MASTER
  await goHome(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);

  // Round 1: Alpha closes, Beta=50, Gamma=50
  await playRoundExact(page, "Alpha", 0, { Beta: 50, Gamma: 50 });
  await waitOverlayGone(page);
  // Round 2: Beta closes, Alpha=50, Gamma=50
  await playRoundExact(page, "Beta", 0, { Alpha: 50, Gamma: 50 });
  await waitOverlayGone(page);
  // Round 3: Alpha closes, Beta=50, Gamma=0
  await playRoundExact(page, "Alpha", 0, { Beta: 50, Gamma: 0 });
  await waitOverlayGone(page);
  // Round 4: Beta closes, Alpha=50, Gamma=0
  await playRoundExact(page, "Beta", 0, { Alpha: 50, Gamma: 0 });
  await waitOverlayGone(page);

  // State: Alpha=100, Beta=100, Gamma=100. Alpha closes: 2, Beta closes: 2, Gamma closes: 0
  // All-out round: Gamma closes (4→104), Alpha chip5 (105), Beta chip5 (105)
  await page.locator("button:has-text('End Round')").click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 6000 });
  await page.locator("button").filter({ hasText: "Gamma" }).first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 6000 });
  await clickChip(page, "Gamma", 4);
  await clickChip(page, "Alpha", 5);
  await clickChip(page, "Beta", 5);
  await page.locator("button:has-text('Confirm Round')").click();
  await sleep(600);

  // Gamma wins (104 < 105). Alpha and Beta tied at 2 closes each → NO CLUTCH_MASTER
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  const winnerTxt = await page.locator("text=Chhummy Champion").first().textContent();
  assert(winnerTxt?.includes("Gamma"), "M5.4: Gamma wins the all-out (104 lowest)");

  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 6000 });
  await openStats(page, "Players");

  // CLUTCH_MASTER should NOT appear for anyone (tied)
  const clutchAlpha = await page.locator("text=Clutch Master").isVisible().catch(() => false);
  assert(!clutchAlpha, "M5.4: CLUTCH_MASTER NOT awarded when Alpha and Beta tied at 2 closes each");
}

// M5.5 — History tab expands showing accurate round-by-round scores
async function testM5_5(page) {
  await goHome(page);
  await startGame(page, ["Alpha", "Beta"]);

  // Play 2 rounds with known scores
  await playRound(page, "Alpha", { Beta: 25 }); // Round 1: A=0, B=25
  await waitOverlayGone(page);
  await playRound(page, "Beta", { Alpha: 15 });  // Round 2: A=15, B=25
  await waitOverlayGone(page);

  // End game: eliminate Beta → Alpha wins
  for (let i = 0; i < 3; i++) await playRound(page, "Alpha", { Beta: 25 }); // B goes to 100
  await waitOverlayGone(page);
  await playRound(page, "Alpha", { Beta: 1 }); // Beta→101 → Alpha wins (2-player: direct winner)
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });

  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 6000 });
  await openStats(page, "History");

  // Find and expand the session
  await page.locator("text=Alpha won").first().click();
  await sleep(800);

  // Should show round details. Round 1: Alpha=0, Beta=25
  const roundRow = await page.locator("text=Round 1").isVisible().catch(() => false);
  assert(roundRow, "M5.5: History expand shows 'Round 1' row");

  // Score 25 should be visible (Beta's round 1 score)
  const scoreVisible = await page.locator("text=25").first().isVisible().catch(() => false);
  assert(scoreVisible, "M5.5: Round score '25' visible in history expand");
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

const allTests = [
  // Module 1: Score Entry & Chip Logic
  ["M1.1: Closer chip set (0-5 only, no Custom)", testM1_1],
  ["M1.2: Non-closer has chip 25; no chip 30; has Custom", testM1_2],
  ["M1.3: All standard non-closer chips present (0-25)", testM1_3],
  ["M1.4: Custom numpad opens empty; subtitle 'Max 60'", testM1_4],
  ["M1.5: Numpad accepts exactly 60; shows 'Max reached'", testM1_5],
  ["M1.6: Numpad rejects 61 (6→1 blocked)", testM1_6],
  ["M1.7: Numpad rejects 70 (7→0 blocked)", testM1_7],
  ["M1.8: Numpad backspace removes digit; empty→'—'", testM1_8],
  ["M1.9: Running total preview shows 'X + Y = Z'", testM1_9],
  ["M1.10: Preview shows 💀 when pending+total > 100", testM1_10],
  ["M1.11: Preview does NOT show 💀 at exactly 100", testM1_11],
  ["M1.12: Confirm blocked with error when score missing", testM1_12],

  // Module 2: Round Outcome Boundaries
  ["M2.1: Player at exactly 100 is SAFE (game continues)", testM2_1],
  ["M2.2: Player crossing 100→101 is eliminated", testM2_2],
  ["M2.3: All-out: lowest total wins (not the closer)", testM2_3],
  ["M2.4: All-out tie: closer wins as tiebreaker", testM2_4],
  ["M2.5: Eliminated player not in Who Closed", testM2_5],

  // Module 3: Undo/Redo Extended
  ["M3.1: 3 sequential undos decrement round counter", testM3_1],
  ["M3.2: Undo reverts player card totals", testM3_2],
  ["M3.3: Redo banner after undo; clears on new round", testM3_3],
  ["M3.4: After 3 undos, can still play new rounds", testM3_4],
  ["M3.5: Undo at 0 rounds is safe no-op", testM3_5],

  // Module 4: Player Management
  ["M4.1: Name input has maxlength=20", testM4_1],
  ["M4.2: Duplicate name (same case) → error", testM4_2],
  ["M4.3: Duplicate name (different case) → error", testM4_3],
  ["M4.4: Edit player name works", testM4_4],
  ["M4.5: Edit to duplicate name → error", testM4_5],
  ["M4.6: Delete player removes from list", testM4_6],
  ["M4.7: 6-player selection limit enforced", testM4_7],

  // Module 5: Stats & Achievements
  ["M5.1: UNTOUCHABLE + ICE_COLD for zero-point winner", testM5_1],
  ["M5.2: SURVIVOR badge for winner who was at 85+", testM5_2],
  ["M5.3: CLUTCH_MASTER for unique close leader", testM5_3],
  ["M5.4: CLUTCH_MASTER NOT awarded when closes tied", testM5_4],
  ["M5.5: History expand shows accurate round scores", testM5_5],
];

(async () => {
  browser = await chromium.launch({ headless: true });
  const start = Date.now();

  for (const [name, fn] of allTests) {
    await runTest(name, fn);
  }

  await browser.close();
  const duration = ((Date.now() - start) / 1000).toFixed(0);

  log("\n══════════════════════════════════════════════");
  log(`Module Test Results — ${new Date().toISOString()}`);
  log(`Duration: ${duration}s`);
  log(`Total: ${passed + failed} | ✓ ${passed} passed | ✗ ${failed} failed`);
  log("══════════════════════════════════════════════");

  if (failed > 0) {
    log("\nFailed tests:");
    results.filter(r => r.status === "FAIL").forEach(r => log(`  ✗ ${r.msg}`));
  }

  process.exit(failed > 0 ? 1 : 0);
})();
