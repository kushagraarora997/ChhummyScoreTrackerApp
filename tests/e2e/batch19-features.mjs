/**
 * batch-19 — E2E tests for 5 features not covered by prior suites
 *   1. Quick Rematch
 *   2. Player History Sheet
 *   3. Head-to-Head stats
 *   4. Mid-game Share Standings (PauseOverlay)
 *   5. Confetti / Winner screen no-crash
 *
 * Run: node batch19-features.mjs  (dev server on http://localhost:5173)
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
let pass = 0, fail = 0;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    pass++;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message?.split("\n")[0]}`);
    fail++;
  }
}

async function fresh(page) {
  await page.goto(BASE);
  await page.evaluate(() =>
    new Promise((res) => {
      const req = indexedDB.deleteDatabase("chhummy-db");
      req.onsuccess = req.onerror = () => res();
    })
  );
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
}

async function addPlayer(page, name) {
  await page.click('button:has-text("+ Add Player")');
  await page.waitForSelector("text=Player ka naam?", { timeout: 4000 });
  await page.locator('input[type="text"]').last().fill(name);
  await page.locator('button:text-is("Add")').click();
  await page.waitForTimeout(400);
}

async function startGame(page, names) {
  await page.click("text=Start New Game");
  await page.waitForSelector('button:has-text("+ Add Player")', { timeout: 5000 });
  for (const n of names) await addPlayer(page, n);
  await page.click('button:has-text("Start Session")');
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  await page.waitForTimeout(300);
}

async function enterChipScore(page, playerName, score) {
  const section = page.locator(".fixed.inset-0.z-50")
    .locator("div.rounded-2xl.bg-elevated")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: new RegExp(`^${playerName}$`) }) });
  if ([0, 1, 2, 3, 4, 5, 10, 15, 20, 25].includes(score)) {
    const re = score === 0 ? /^0$/ : new RegExp(`^${score}$`);
    await section.locator("button").filter({ hasText: re }).first().click().catch(() => {});
  } else {
    await section.locator("button", { hasText: "Custom" }).click();
    await page.waitForTimeout(350);
    for (const d of String(score).split("")) {
      await page.evaluate((lbl) => {
        const btn = [...document.querySelectorAll("button")]
          .find(b => b.textContent?.trim() === lbl && b.closest('[style*="9999"]'));
        btn?.click();
      }, d);
      await page.waitForTimeout(80);
    }
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent?.trim() === "✓" && b.closest('[style*="9999"]'));
      btn?.click();
    });
    await page.waitForTimeout(250);
  }
}

async function playRound(page, closerName, scores) {
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 5000 }).catch(() => {});
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: new RegExp(`^${closerName}$`) }) })
    .first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  for (const [name, score] of Object.entries(scores)) {
    await enterChipScore(page, name, score);
  }
  await page.locator("button:has-text('Confirm Round')").click();
  await page.waitForTimeout(700);
}

// Complete a 2-player game: Alpha wins in 2 rounds, Beta is eliminated
// Round 1: Alpha closes (0), Beta=60 → Beta:60
// Round 2: Alpha closes (0), Beta=55 → Beta:115 → eliminated → Alpha wins
async function completeFastGame(page, alphaName = "Alpha", betaName = "Beta") {
  await startGame(page, [alphaName, betaName]);
  await playRound(page, alphaName, { [alphaName]: 0, [betaName]: 60 });
  // After round 1 no elimination yet; play round 2
  await playRound(page, alphaName, { [alphaName]: 0, [betaName]: 55 });
  // Beta hits 115 → eliminated → with 2 players goes straight to winner (no elim modal)
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
}

const ctx = await chromium.launch({ headless: true });
const mkPage = async () => {
  const c = await ctx.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  return p;
};

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 1: Quick Rematch ──");

await test("Quick Rematch button visible on winner screen", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  const rematchBtn = page.locator("button:has-text('Quick Rematch')");
  if (!(await rematchBtn.isVisible())) throw new Error("Quick Rematch button not visible on winner screen");
  await page.close();
});

await test("Quick Rematch returns to live game with same players", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  await page.locator("button:has-text('Quick Rematch')").click();
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  const body = await page.locator("body").textContent();
  if (!body.includes("Kush")) throw new Error("Kush not present after rematch");
  if (!body.includes("Pops")) throw new Error("Pops not present after rematch");
  await page.close();
});

await test("Quick Rematch: game resets to Round 1 (previous rounds gone)", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  await page.locator("button:has-text('Quick Rematch')").click();
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  await page.waitForTimeout(400);
  // Confirm we're at Round 1 hero
  const heroText = await page.locator(".text-4xl.font-black").first().textContent().catch(() => "");
  if (!heroText.includes("Round 1")) throw new Error(`Expected Round 1 after rematch, got: "${heroText}"`);
  await page.close();
});

await test("Quick Rematch: scores reset to 0 for all players", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  await page.locator("button:has-text('Quick Rematch')").click();
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  await page.waitForTimeout(400);
  // No player should show any accumulated score from previous game
  const body = await page.locator("body").textContent();
  if (body.includes("115")) throw new Error("Old score 115 persists after rematch");
  if (body.includes("💀 OUT")) throw new Error("Elimination badge persists after rematch");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 2: Player History Sheet ──");

await test("Player History Sheet: tap player card → sheet opens", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Meena", "Rohan"]);
  await playRound(page, "Meena", { Meena: 0, Rohan: 20 });
  // Tap a player card (overlay is none, rounds > 0)
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator(".rounded-2xl").filter({ hasText: "Meena" }).first().click();
  await page.waitForTimeout(800);
  const sheetVisible = await page.locator("text=rounds played").isVisible().catch(() => false);
  if (!sheetVisible) throw new Error("Player history sheet did not open");
  await page.close();
});

await test("Player History Sheet: shows correct round scores", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Meena", "Rohan"]);
  await playRound(page, "Meena", { Meena: 0, Rohan: 25 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  // Tap Rohan (non-closer) to see their score
  await page.locator(".rounded-2xl").filter({ hasText: "Rohan" }).first().click();
  await page.waitForTimeout(800);
  const body = await page.locator("body").textContent();
  if (!body.includes("25")) throw new Error("Score 25 not visible in history sheet");
  await page.close();
});

await test("Player History Sheet: tap hint visible after first round", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Meena", "Rohan"]);
  // Before any round, no hint
  const hintBefore = await page.locator("text=round history").isVisible().catch(() => false);
  await playRound(page, "Meena", { Meena: 0, Rohan: 20 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  const hintAfter = await page.locator("text=round history").isVisible().catch(() => false);
  if (hintBefore) throw new Error("Tap hint shown before any round");
  if (!hintAfter) throw new Error("Tap hint not shown after first round");
  await page.close();
});

await test("Player History Sheet: backdrop tap closes sheet", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Meena", "Rohan"]);
  await playRound(page, "Meena", { Meena: 0, Rohan: 20 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator(".rounded-2xl").filter({ hasText: "Meena" }).first().click();
  await page.waitForTimeout(800);
  // Click the backdrop (top left — outside the sheet)
  await page.mouse.click(195, 100);
  await page.waitForTimeout(700);
  const sheetVisible = await page.locator("text=rounds played").isVisible().catch(() => false);
  if (sheetVisible) throw new Error("History sheet still visible after backdrop tap");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 3: Head-to-Head Stats ──");

await test("H2H section appears after 2+ games between same players", async () => {
  const page = await mkPage();
  await fresh(page);
  // Game 1
  await completeFastGame(page, "Anu", "Dev");
  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 5000 });
  // Game 2 (same players — reuse from DB, they'll appear in Setup)
  await page.click("text=Start New Game");
  await page.waitForSelector('button:has-text("+ Add Player")', { timeout: 5000 });
  // Players from DB should be selectable — click the existing player chips
  const anu = page.locator(".rounded-2xl").filter({ hasText: "Anu" }).first();
  const dev = page.locator(".rounded-2xl").filter({ hasText: "Dev" }).first();
  await anu.click(); await page.waitForTimeout(200);
  await dev.click(); await page.waitForTimeout(200);
  await page.click('button:has-text("Start Session")');
  await page.waitForSelector("text=Round 1", { timeout: 6000 });
  await page.waitForTimeout(300);
  // Game 2: same pattern
  await playRound(page, "Anu", { Anu: 0, Dev: 60 });
  await playRound(page, "Anu", { Anu: 0, Dev: 55 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Stats", { timeout: 5000 });
  await page.locator("text=Stats").first().click();
  await page.waitForSelector("text=Players", { timeout: 5000 });
  // Already on Players tab (default)
  await page.waitForTimeout(1000);
  const body = await page.locator("body").textContent();
  // H2H section shows "Head-to-Head" or "vs" between player names
  const hasH2H = body.includes("Head") || body.includes(" vs ");
  if (!hasH2H) throw new Error("Head-to-Head section not visible after 2 games");
  await page.close();
});

await test("H2H not shown with only 1 game", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Anu", "Dev");
  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Stats", { timeout: 5000 });
  await page.locator("text=Stats").first().click();
  await page.waitForTimeout(800);
  const body = await page.locator("body").textContent();
  // With only 1 game, no H2H section (needs ≥2 games between a pair)
  if (body.includes("Head-to-Head")) throw new Error("H2H shown with only 1 game (should need ≥2)");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 4: Mid-game Share Standings ──");

await test("Share Standings button in Pause overlay is disabled before round 1", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Nanz", "Hanz"]);
  // No rounds yet — open pause
  await page.locator("button:has-text('Pause')").click();
  await page.waitForSelector("text=Share Standings", { timeout: 4000 });
  const shareBtn = page.locator("button:has-text('Share Standings')");
  const isDisabled = await shareBtn.getAttribute("disabled");
  const opacity = await shareBtn.getAttribute("class");
  if (isDisabled === null && !opacity?.includes("opacity")) {
    throw new Error("Share Standings button should be disabled before any rounds");
  }
  // Close pause
  await page.locator("button:has-text('Resume')").click();
  await page.waitForTimeout(400);
  await page.close();
});

await test("Share Standings button enabled after first round", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Nanz", "Hanz"]);
  await playRound(page, "Nanz", { Nanz: 0, Hanz: 15 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator("button:has-text('Pause')").click();
  await page.waitForSelector("text=Share Standings", { timeout: 4000 });
  const shareBtn = page.locator("button:has-text('Share Standings')");
  const isDisabled = await shareBtn.getAttribute("disabled");
  if (isDisabled !== null) throw new Error("Share Standings button still disabled after first round");
  await page.locator("button:has-text('Resume')").click();
  await page.waitForTimeout(400);
  await page.close();
});

await test("Share Standings visible in Pause overlay", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Nanz", "Hanz"]);
  await playRound(page, "Nanz", { Nanz: 0, Hanz: 20 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator("button:has-text('Pause')").click();
  await page.waitForSelector("text=Share Standings", { timeout: 4000 });
  const visible = await page.locator("text=Share Standings").isVisible();
  if (!visible) throw new Error("Share Standings not visible in Pause overlay");
  await page.locator("button:has-text('Resume')").click();
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 5: Winner Screen & Confetti ──");

await test("Winner screen renders without JS error", async () => {
  const page = await mkPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  await page.waitForTimeout(1500); // let confetti fire all 3 waves
  if (errors.length > 0) throw new Error(`JS error on winner screen: ${errors[0]}`);
  await page.close();
});

await test("Winner screen shows player name + Chhummy Champion", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  const body = await page.locator("body").textContent();
  if (!body.includes("Chhummy Champion")) throw new Error("'Chhummy Champion' not on winner screen");
  if (!body.includes("Kush")) throw new Error("Winner name 'Kush' not on winner screen");
  await page.close();
});

await test("Winner screen shows leaderboard with both players", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  const body = await page.locator("body").textContent();
  if (!body.includes("Kush")) throw new Error("Kush missing from winner leaderboard");
  if (!body.includes("Pops")) throw new Error("Pops missing from winner leaderboard");
  await page.close();
});

await test("Winner screen: Copy Text button visible", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  const copyBtn = await page.locator("button:has-text('Copy Text')").isVisible().catch(() => false);
  if (!copyBtn) throw new Error("'Copy Text' button not visible on winner screen");
  await page.close();
});

await test("Winner screen: Back to Home returns to home", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, "Kush", "Pops");
  await page.locator("button:has-text('Back to Home')").click();
  await page.waitForSelector("text=Start New Game", { timeout: 5000 });
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
await ctx.close();

const total = pass + fail;
console.log(`\n══════════════════════════════════════════════`);
console.log(`batch-19 Results — ${new Date().toISOString()}`);
console.log(`Total: ${total} | ✓ ${pass} passed | ✗ ${fail} failed`);
console.log(`══════════════════════════════════════════════\n`);
process.exit(fail > 0 ? 1 : 0);
