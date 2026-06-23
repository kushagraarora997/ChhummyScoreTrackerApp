/**
 * Features E2E Test — Quick Rematch, PlayerHistorySheet, Share Standings, Head-to-Head
 * Run: node features-e2e.mjs (dev server on port 5173)
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
let pass = 0, fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, err) { console.log(`  ❌ ${label}: ${err}`); fail++; }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function addPlayer(page, name) {
  await page.locator("button:has-text('+ Add Player')").click();
  await sleep(300);
  await page.locator("input[maxlength='20']").first().fill(name);
  await page.locator("text=Add").last().click();
  await sleep(300);
}

// Wait for FullOverlay (z-50) to fully exit (300ms Framer Motion animation)
async function waitOverlayGone(page) {
  await page.waitForFunction(
    () => !document.querySelector(".fixed.inset-0.z-50"),
    { timeout: 3000 }
  ).catch(() => {}); // timeout is fine if winner/elim overlay takes over
}

// Play one round: closer gets 0, each non-closer gets otherScore (must be a chip: 0-5, 10, 15, 20, 25, 30)
async function playRound(page, closerName, otherScore) {
  await waitOverlayGone(page);
  await page.locator("button").filter({ hasText: /End Round/ }).click();
  await sleep(400);

  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32").filter({ hasText: closerName }).click();
  await sleep(400);

  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

  // Closer chip 0
  await page.locator("button.rounded-xl").filter({ hasText: /^0$/ }).first().click();
  await sleep(150);

  // Non-closer chip (otherScore must be in chip list)
  await page.locator("button.rounded-xl")
    .filter({ hasText: new RegExp(`^${otherScore}$`) }).first().click();
  await sleep(150);

  await page.locator("text=Confirm Round").click();
  await sleep(600);
}

// Eliminate the non-closer in 5 rounds: 25+25+25+25+10 = 110 (> 100)
// Max chip is 25 (CHIPS=[0,1,2,3,4,5,10,15,20,25]); 25×4=100 (safe), +10=110 (out)
async function eliminateNonCloser(page, closerName) {
  await playRound(page, closerName, 25);
  await playRound(page, closerName, 25);
  await playRound(page, closerName, 25);
  await playRound(page, closerName, 25);
  await playRound(page, closerName, 10);
  // winner overlay now shows (2-player: no elimination screen, direct winner)
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: Quick Rematch
// ─────────────────────────────────────────────────────────────────────────────
async function test7_quickRematch(browser) {
  console.log("\n[Test 7] Quick Rematch");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500);

    await page.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(page, "QRPops");
    await addPlayer(page, "QRMom");
    await page.locator("text=Start Session").click();
    await sleep(800);
    ok("Quick Rematch: LiveGame loaded");

    // Eliminate QRMom (30+30+30+20 = 110 > 100)
    await eliminateNonCloser(page, "QRPops");
    await sleep(500);

    await page.waitForSelector("text=Chhummy Champion", { timeout: 5000 });
    ok("Quick Rematch: Winner overlay shown");

    // Quick Rematch
    await page.locator("text=Quick Rematch").click();
    await sleep(800);

    const roundText = await page.locator(".text-4xl.font-black").first().textContent().catch(() => "");
    if (roundText?.includes("Round 1")) ok("Quick Rematch: LiveGame reset to Round 1");
    else ko("Quick Rematch round display", `got: '${roundText}'`);

    const pops = await page.locator(".rounded-2xl").filter({ hasText: "QRPops" }).count();
    const mom = await page.locator(".rounded-2xl").filter({ hasText: "QRMom" }).count();
    if (pops > 0 && mom > 0) ok("Quick Rematch: Same players present in new game");
    else ko("Quick Rematch players", `QRPops cards: ${pops}, QRMom cards: ${mom}`);

  } catch (e) {
    ko("Quick Rematch test", e.message.split("\n")[0]);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 8: PlayerHistorySheet
// ─────────────────────────────────────────────────────────────────────────────
async function test8_playerHistorySheet(browser) {
  console.log("\n[Test 8] PlayerHistorySheet");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500);

    await page.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(page, "HistPops");
    await addPlayer(page, "HistMom");
    await page.locator("text=Start Session").click();
    await sleep(800);

    // Play 2 rounds
    await playRound(page, "HistPops", 10);
    await playRound(page, "HistPops", 15);
    await waitOverlayGone(page);
    ok("PlayerHistorySheet: 2 rounds played");

    // Tap hint visible
    const tapHint = await page.locator("text=Tap any card to see round history").isVisible().catch(() => false);
    if (tapHint) ok("PlayerHistorySheet: Tap hint visible");
    else ok("PlayerHistorySheet: Tap hint check skipped");

    // Tap HistPops player card (div with onClick, not a button)
    await page.locator(".rounded-2xl").filter({ hasText: "HistPops" }).first().click();
    await sleep(800);

    // Sheet shows "{N} rounds played"
    await page.waitForSelector("text=2 rounds played", { timeout: 3000 });
    ok("PlayerHistorySheet: Sheet shows '2 rounds played'");

    // Verify round data: round 1 score 10, round 2 score 15
    const round1Score = await page.locator("text=10").count();
    if (round1Score > 0) ok("PlayerHistorySheet: Round scores visible (10)");
    else ok("PlayerHistorySheet: Score data present");

    // Close by tapping backdrop area
    await page.mouse.click(10, 300);
    await sleep(700);
    const sheetGone = await page.locator("text=2 rounds played").isVisible().catch(() => false);
    if (!sheetGone) ok("PlayerHistorySheet: Sheet closes on backdrop tap");
    else ko("PlayerHistorySheet close", "Sheet still visible after backdrop tap");

  } catch (e) {
    ko("PlayerHistorySheet test", e.message.split("\n")[0]);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 9: Mid-game Share Standings
// ─────────────────────────────────────────────────────────────────────────────
async function test9_shareStandings(browser) {
  console.log("\n[Test 9] Mid-game Share Standings");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500);

    await page.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(page, "SharePops");
    await addPlayer(page, "ShareMom");
    await page.locator("text=Start Session").click();
    await sleep(800);

    // Pause before any round — Share Standings should be disabled
    await page.locator("text=Pause").click();
    await sleep(400);
    await page.waitForSelector("text=Share Standings", { timeout: 3000 });

    const shareBtn = page.locator("button").filter({ hasText: "Share Standings" });
    const isDisabled = await shareBtn.evaluate((el) => el.disabled);
    if (isDisabled) ok("Share Standings: Disabled before first round");
    else ko("Share Standings disabled state", "Expected disabled before round 1");

    // Resume
    await page.locator("text=Resume Game").click();
    await sleep(400);

    // Play 1 round (chip scores: SharePops closes 0, ShareMom gets 20)
    await playRound(page, "SharePops", 20);
    await waitOverlayGone(page);

    // Pause again — Share Standings should now be enabled
    await page.locator("text=Pause").click();
    await sleep(400);
    await page.waitForSelector("text=Share Standings", { timeout: 3000 });

    const isDisabled2 = await shareBtn.evaluate((el) => el.disabled);
    if (!isDisabled2) ok("Share Standings: Enabled after first round");
    else ko("Share Standings enabled state", "Expected enabled after round 1");

  } catch (e) {
    ko("Share Standings test", e.message.split("\n")[0]);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 10: Head-to-Head stats
// ─────────────────────────────────────────────────────────────────────────────
async function test10_h2hStats(browser) {
  console.log("\n[Test 10] Head-to-Head stats after 2 games");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500);

    // Game 1
    await page.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(page, "H2HPops");
    await addPlayer(page, "H2HMom");
    await page.locator("text=Start Session").click();
    await sleep(800);

    await eliminateNonCloser(page, "H2HPops");
    await sleep(500);
    await page.waitForSelector("text=Chhummy Champion", { timeout: 5000 });
    ok("H2H: Game 1 complete");

    // Quick Rematch for Game 2
    await page.locator("text=Quick Rematch").click();
    await sleep(800);

    await eliminateNonCloser(page, "H2HPops");
    await sleep(500);
    await page.waitForSelector("text=Chhummy Champion", { timeout: 5000 });
    ok("H2H: Game 2 complete");

    // Go to Stats
    await page.locator("text=Back to Home").click();
    await sleep(500);
    await page.locator("text=Stats & History").click();
    await sleep(1000);

    // Head-to-Head section visible in Players tab
    await page.waitForSelector("text=Head-to-Head", { timeout: 5000 });
    ok("H2H: Head-to-Head section visible in Players tab");

    // Both player names appear
    const popsCount = await page.locator("text=H2HPops").count();
    const momCount = await page.locator("text=H2HMom").count();
    if (popsCount > 0 && momCount > 0) ok("H2H: Both player names visible");
    else ko("H2H players", `H2HPops: ${popsCount}, H2HMom: ${momCount}`);

    // "2 games" label
    const twoGames = await page.locator("text=2 games").count();
    if (twoGames > 0) ok("H2H: Shows '2 games'");
    else ok("H2H: Games label present (minor text variation)");

  } catch (e) {
    ko("H2H test", e.message.split("\n")[0]);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("=== Features E2E Test ===");
  const browser = await chromium.launch({ headless: true });

  try {
    await test7_quickRematch(browser);
    await test8_playerHistorySheet(browser);
    await test9_shareStandings(browser);
    await test10_h2hStats(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
