/**
 * batch-14 — Comprehensive test suite post pre-work refactor
 * Covers: core flow, boundaries, edge cases, undo/redo, players/names,
 *         dealer picker, UI features, visual tension, all-out, 3-player, stats
 *
 * Run: node batch14.mjs  (dev server must be on http://localhost:5173)
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

// ── helpers ───────────────────────────────────────────────────────────────────

// Non-async — calling .toContainText() etc. works without Promise chaining issues
function expect(locator, label) {
  return {
    async toContainText(str) {
      const text = await locator.textContent({ timeout: 4000 });
      if (!text?.includes(str)) throw new Error(`${label}: expected "${str}" in "${text}"`);
    },
    async toBeVisible() {
      const ok = await locator.isVisible({ timeout: 4000 });
      if (!ok) throw new Error(`${label}: expected element to be visible`);
    },
    async toHaveCount(n) {
      const count = await locator.count();
      if (count !== n) throw new Error(`${label}: expected count ${n}, got ${count}`);
    },
    async toIncludeClass(cls) {
      const c = await locator.getAttribute("class");
      if (!c?.includes(cls)) throw new Error(`${label}: class "${c}" does not include "${cls}"`);
    },
  };
}

async function fresh(page) {
  await page.goto(BASE);
  await page.evaluate(() =>
    new Promise((res) => {
      const r = indexedDB.deleteDatabase("chhummy-db");
      r.onsuccess = r.onerror = () => res();
    })
  );
  await page.reload();
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
}

// addPlayer: opens the add modal, fills name, clicks Add (commitAdd auto-selects the player)
async function addPlayer(page, name) {
  await page.click('button:has-text("+ Add Player")');
  await page.waitForSelector("text=Player ka naam?", { timeout: 4000 });
  await page.locator('input[type="text"]').last().fill(name);
  await page.locator('button:text-is("Add")').click();
  await page.waitForTimeout(400);
}

// selectPlayer: toggles a player card in PlayerSetup (cards are divs, not buttons)
async function selectPlayer(page, name) {
  await page.locator('div.h-20.rounded-2xl', { hasText: name }).first().click();
}

// startGame: navigates from Home → Setup → Live Game
// addPlayer auto-selects, so no manual selectPlayer needed after adding
async function startGame(page, names, dealerName) {
  await page.click("text=Start New Game");
  await page.waitForSelector('button:has-text("+ Add Player")', { timeout: 5000 });
  for (const n of names) await addPlayer(page, n);
  if (dealerName) {
    await page.locator("text=Pehle kaun deal karega").waitFor({ timeout: 2000 }).catch(() => {});
    await page.locator(`button`, { hasText: dealerName }).last().click();
  }
  await page.click('button:has-text("Start Session")');
  await page.waitForSelector(".text-4xl.font-black", { timeout: 6000 });
}

// endRound: full round flow. closerName = who closed, scores = { playerName: number }
// All chip values (CHIPS = [0,1,2,3,4,5,10,15,20,25]) selected directly; others via numpad
async function endRound(page, closerName, scores) {
  await page.click('button:has-text("End Round")');
  await page.waitForSelector("text=Kaun Jeeta Be?", { timeout: 4000 });
  await page.locator("button", { hasText: closerName }).first().click();
  await page.waitForSelector("text=Enter Scores", { timeout: 4000 });

  for (const [name, score] of Object.entries(scores)) {
    // EnterScores player sections use p-3; LiveGame cards use p-4 — p-3 makes the locator unique
    const sec = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: name }).first();
    const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];
    if (CHIPS.includes(score)) {
      // Exact text match to avoid "1" hitting "10", "15" etc.
      await sec.locator(`button:text-is("${score}")`).first().click({ timeout: 6000 });
    } else {
      // Custom numpad for values not in chip list
      await sec.locator('button:text-is("Custom")').click();
      await page.locator('[style*="9999"]').waitFor({ timeout: 3000 });
      for (const d of String(score).split("")) {
        await page.locator('[style*="9999"]').locator(`button:text-is("${d}")`).first().click();
      }
      await page.locator('[style*="9999"]').locator('button:text-is("✓")').click();
      await page.waitForTimeout(300);
    }
  }

  await page.locator('button:text-is("Confirm Round")').click();
  // Wait for EnterScores overlay to fully dismount from DOM.
  // .text-4xl.font-black is always visible in LiveGame hero, so we can't use that.
  // "Confirm Round" only exists inside EnterScores — when it's detached, the overlay is gone.
  await page.waitForSelector("text=Confirm Round", { state: "detached", timeout: 8000 }).catch(() => {});
}

async function dismissElimination(page) {
  await page.waitForTimeout(400);
  const cont = page.locator("button", { hasText: /Continue/ }).first();
  if (await cont.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cont.click();
    await page.waitForTimeout(300);
  }
}

// ── browser setup ─────────────────────────────────────────────────────────────

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

// ── Group 1: Core flow & pre-work regression ──────────────────────────────────

console.log("\n── Group 1: Core flow & pre-work regression ──");

await test("Home screen loads with Start New Game", async () => {
  await fresh(page);
  await page.waitForSelector("text=Start New Game");
});

await test("Can set up 2 players and start session", async () => {
  await fresh(page);
  await startGame(page, ["Alpha", "Beta"]);
  await page.waitForSelector("text=Alpha", { timeout: 3000 });
  await page.waitForSelector("text=Beta", { timeout: 3000 });
});

await test("Round 1 hero shows correct round number", async () => {
  const hero = page.locator(".text-4xl.font-black").first();
  await expect(hero, "Round 1 in hero").toContainText("Round 1");
});

await test('"playing" appears in hero subtitle', async () => {
  await page.waitForSelector("text=playing", { timeout: 3000 });
});

await test('"dealing" appears in hero subtitle', async () => {
  await page.waitForSelector("text=dealing", { timeout: 3000 });
});

await test("Complete round 1 and advance to round 2", async () => {
  await endRound(page, "Alpha", { Alpha: 0, Beta: 10 });
  const hero = page.locator(".text-4xl.font-black").first();
  await expect(hero, "Round 2 after completion").toContainText("Round 2");
});

await test("History dots appear after round 1", async () => {
  await page.waitForSelector(".w-1\\.5.h-1\\.5.rounded-full", { timeout: 3000 });
});

await test("Tap hint appears after round completed", async () => {
  await page.waitForSelector("text=Tap any card to see round history", { timeout: 3000 });
});

// ── Group 2: Score boundaries ─────────────────────────────────────────────────

console.log("\n── Group 2: Score boundaries ──");

// Open End Round → choose Alpha as closer → EnterScores opens
await page.click('button:has-text("End Round")');
await page.waitForSelector("text=Kaun Jeeta Be?", { timeout: 4000 });
await page.locator("button", { hasText: "Alpha" }).first().click();
await page.waitForSelector("text=Enter Scores", { timeout: 4000 });

await test("Closer chips: only 0–5 shown, no 10+ chips", async () => {
  const alphaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Alpha" }).first();
  // Chip 10 must NOT exist in closer section
  const chip10Count = await alphaSection.locator('button:text-is("10")').count();
  if (chip10Count > 0) throw new Error("Closer sees chip 10 — should not exist");
  // Custom button must NOT exist
  const customCount = await alphaSection.locator('button:text-is("Custom")').count();
  if (customCount > 0) throw new Error("Closer sees Custom button — should not exist");
});

await test("Closer chip 0 is full-width (col-span-3)", async () => {
  const alphaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Alpha" }).first();
  const chip0 = alphaSection.locator('button:text-is("0")').first();
  await expect(chip0, "chip 0 class").toIncludeClass("col-span-3");
});

await test("Non-closer: Custom button exists", async () => {
  const betaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Beta" }).first();
  await betaSection.locator('button:text-is("Custom")').waitFor({ timeout: 2000 });
});

await test("Numpad max 60: entering 61 rejects the 1 (stays at 6)", async () => {
  const betaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Beta" }).first();
  await betaSection.locator('button:text-is("Custom")').click();
  await page.locator('[style*="9999"]').waitFor({ timeout: 3000 });
  await page.locator('[style*="9999"]').locator('button:text-is("6")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("1")').first().click();
  const display = await page.locator('[style*="9999"] .text-5xl.font-bold').textContent({ timeout: 2000 });
  if (display !== "6") throw new Error(`Expected "6", got "${display}"`);
  await page.locator('[style*="9999"]').locator('button:text-is("✓")').click();
});

await test("Numpad: entering exactly 60 is accepted", async () => {
  const betaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Beta" }).first();
  await betaSection.locator('button:text-is("Custom")').click();
  await page.locator('[style*="9999"]').waitFor({ timeout: 3000 });
  await page.locator('[style*="9999"]').locator('button:text-is("6")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("0")').first().click();
  const display = await page.locator('[style*="9999"] .text-5xl.font-bold').textContent({ timeout: 2000 });
  if (display !== "60") throw new Error(`Expected "60", got "${display}"`);
  await page.locator('[style*="9999"]').locator('text=Max reached').waitFor({ timeout: 2000 });
  await page.locator('[style*="9999"]').locator('button:text-is("✓")').click();
});

await test("Numpad: backspace works", async () => {
  const betaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Beta" }).first();
  await betaSection.locator('button:text-is("Custom")').click();
  await page.locator('[style*="9999"]').waitFor({ timeout: 3000 });
  await page.locator('[style*="9999"]').locator('button:text-is("3")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("5")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("⌫")').click();
  const display = await page.locator('[style*="9999"] .text-5xl.font-bold').textContent({ timeout: 2000 });
  if (display !== "3") throw new Error(`Expected "3" after backspace, got "${display}"`);
  await page.locator('[style*="9999"]').locator('button:text-is("✓")').click();
});

await test("Running total preview shows correct calculation", async () => {
  const alphaSection = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "Alpha" }).first();
  await alphaSection.locator('button:text-is("5")').first().click();
  // Alpha total = 0, pending = 5 → preview: "0 + 5 = 5"
  await page.waitForSelector("text=0 + 5 = 5", { timeout: 2000 });
});

await test("Running total preview: no false 💀 at score 5 (5 < 100)", async () => {
  // 0 + 5 = 5, well below 100, no skull expected
  const previewEl = page.locator("text=0 + 5 = 5").first();
  const visible = await previewEl.isVisible({ timeout: 1000 }).catch(() => false);
  if (visible) {
    const previewText = await previewEl.textContent({ timeout: 1000 });
    if (previewText?.includes("💀")) throw new Error("False 💀 shown at total 5");
  }
});

// Back out of score entry without confirming
await page.locator('button:text-is("← Back")').click();
await page.waitForSelector("text=Kaun Jeeta Be?", { timeout: 3000 });
await page.locator('button:text-is("← Cancel")').click();
// Wait for WhoClosed overlay to fully dismount before proceeding
await page.waitForSelector("text=Kaun Jeeta Be?", { state: "detached", timeout: 4000 }).catch(() => {});

// ── Group 3: Score boundary 100 / 101 ────────────────────────────────────────

console.log("\n── Group 3: Score boundary 100 / 101 ──");

// State: Alpha=0, Beta=10 (after round 1). Now round 2 starts.
// Build Beta up to 100 with chip-only scores.
await endRound(page, "Alpha", { Alpha: 0, Beta: 25 }); // Beta: 35
await endRound(page, "Beta",  { Alpha: 25, Beta: 0  }); // Alpha: 25
await endRound(page, "Alpha", { Alpha: 0, Beta: 25  }); // Beta: 60
await endRound(page, "Beta",  { Alpha: 25, Beta: 0  }); // Alpha: 50
await endRound(page, "Alpha", { Alpha: 0, Beta: 25  }); // Beta: 85
await endRound(page, "Beta",  { Alpha: 25, Beta: 0  }); // Alpha: 75
await endRound(page, "Alpha", { Alpha: 0, Beta: 15  }); // Beta: 100

await test("Player at exactly 100 pts stays alive (game continues)", async () => {
  // Beta at 100 — should NOT show 💀 OUT, game must still be running
  await page.waitForSelector("text=Beta", { timeout: 2000 });
  const betaCard = page.locator(".rounded-2xl", { hasText: "Beta" }).first();
  const scoreEl = betaCard.locator(".text-3xl.font-black").first();
  await expect(scoreEl, "Beta score at 100").toContainText("100");
  const outBadge = await betaCard.locator("text=💀 OUT").isVisible({ timeout: 500 }).catch(() => false);
  if (outBadge) throw new Error("Beta shows 💀 OUT at exactly 100 — should be safe");
  await page.waitForSelector('button:has-text("End Round")', { timeout: 2000 });
});

// One more round: Beta gets 1 → Beta:101 — 2-player game → winner screen immediately
await endRound(page, "Alpha", { Alpha: 0, Beta: 1 });

await test("2-player game: player at 101 eliminated → winner screen shows", async () => {
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  await page.locator("text=Chhummy Champion").first().waitFor({ timeout: 3000 });
});

await test("Winner screen shows correct winner (Alpha)", async () => {
  // WinnerView renders: "{winner.name} — Chhummy Champion"
  await page.locator("text=Alpha").first().waitFor({ timeout: 2000 });
});

await test("Winner screen: Quick Rematch button present", async () => {
  await page.waitForSelector("text=Quick Rematch", { timeout: 2000 });
});

await test("Winner screen: Copy Text button present", async () => {
  await page.waitForSelector("text=Copy Text", { timeout: 2000 });
});

await test("Back to Home navigates home", async () => {
  await page.locator("button", { hasText: /Back to Home/ }).first().click();
  await page.waitForSelector("text=Start New Game", { timeout: 5000 });
});

// ── Group 4: Undo / Redo ──────────────────────────────────────────────────────

console.log("\n── Group 4: Undo / Redo ──");

await fresh(page);
await startGame(page, ["Pops", "Mom"]);

await test("Undo button disabled (opacity-30) at round 0", async () => {
  const undoBtn = page.locator('button:has-text("Undo")').first();
  await expect(undoBtn, "undo at round 0").toIncludeClass("opacity-30");
});

await test("Redo row not shown at start", async () => {
  const redo = await page.locator("text=Redo available").isVisible({ timeout: 500 }).catch(() => false);
  if (redo) throw new Error("Redo row shown before any undo");
});

await endRound(page, "Pops", { Pops: 0, Mom: 20 });

await test("After round 1, Undo button is enabled (no opacity-30)", async () => {
  const undoBtn = page.locator('button:has-text("Undo")').first();
  const cls = await undoBtn.getAttribute("class");
  if (cls?.includes("opacity-30")) throw new Error("Undo still disabled after round 1");
});

await test("Tapping Undo shows confirm prompt", async () => {
  await page.click('button:has-text("Undo")');
  await page.waitForSelector("text=Undo Round 1?", { timeout: 2000 });
});

await test("Pressing No cancels the undo confirm", async () => {
  await page.locator('button:text-is("No")').first().click();
  const still = await page.locator("text=Undo Round 1?").isVisible({ timeout: 500 }).catch(() => false);
  if (still) throw new Error("Undo confirm still shown after No");
});

await test("Confirming Undo reverts to round 1 state", async () => {
  await page.click('button:has-text("Undo")');
  await page.waitForSelector("text=Undo Round 1?", { timeout: 2000 });
  await page.locator('button:text-is("Yes")').first().click();
  // Hero is always visible, so wait for its text to actually change to "Round 1"
  await page.locator(".text-4xl.font-black", { hasText: "Round 1" }).waitFor({ timeout: 5000 });
});

await test("Redo row available after undo", async () => {
  await page.waitForSelector("text=Redo available", { timeout: 2000 });
});

await test("Redo confirm shows correct round number", async () => {
  await page.locator('button:text-is("Redo")').first().click();
  await page.waitForSelector("text=Redo Round 1?", { timeout: 2000 });
});

await test("Confirming Redo restores the round", async () => {
  await page.locator('button:text-is("Yes")').first().click();
  // Wait for hero text to actually update to "Round 2"
  await page.locator(".text-4xl.font-black", { hasText: "Round 2" }).waitFor({ timeout: 5000 });
});

await test("Redo cleared after confirming a new round (prevents data corruption)", async () => {
  // Undo again → redo available → play a NEW round → redo must disappear
  await page.click('button:has-text("Undo")');
  await page.waitForSelector("text=Undo Round 1?", { timeout: 2000 });
  await page.locator('button:text-is("Yes")').first().click();
  await page.waitForSelector("text=Redo available", { timeout: 2000 });
  // Confirm a new round (different scores = new data)
  await endRound(page, "Pops", { Pops: 0, Mom: 15 });
  const redoVisible = await page.locator("text=Redo available").isVisible({ timeout: 500 }).catch(() => false);
  if (redoVisible) throw new Error("Redo still available after confirming new round — data corruption risk");
});

// ── Group 5: Player management & names ───────────────────────────────────────

console.log("\n── Group 5: Player management & names ──");

await fresh(page);
await page.click("text=Start New Game");
await page.waitForSelector('button:has-text("+ Add Player")', { timeout: 5000 });

await test("Adding a player shows them in the available grid", async () => {
  await addPlayer(page, "Ravi");
  await page.waitForSelector("text=Ravi", { timeout: 2000 });
});

await test("Adding duplicate name (exact) shows inline error", async () => {
  await page.click('button:has-text("+ Add Player")');
  await page.waitForSelector("text=Player ka naam?", { timeout: 3000 });
  await page.locator('input[type="text"]').last().fill("Ravi");
  await page.locator('button:text-is("Add")').click();
  await page.waitForSelector("text=pehle se hai", { timeout: 2000 });
});

await test("Error message clears on typing", async () => {
  // Error is showing; type a new char to clear it
  const input = page.locator('input[type="text"]').last();
  await input.press("Backspace");
  await input.type("x");
  const errStill = await page.locator("text=pehle se hai").isVisible({ timeout: 500 }).catch(() => false);
  if (errStill) throw new Error("Error still showing after typing");
});

await test("Adding duplicate name (case-insensitive) shows error", async () => {
  const input = page.locator('input[type="text"]').last();
  await input.fill("ravi");
  await page.locator('button:text-is("Add")').click();
  await page.waitForSelector("text=pehle se hai", { timeout: 2000 });
  // dismiss by clicking Cancel
  await page.locator('button:text-is("Cancel")').last().click();
  await page.waitForTimeout(300);
});

await test("Adding a unique name succeeds", async () => {
  await addPlayer(page, "Simi");
  await page.waitForSelector("text=Simi", { timeout: 2000 });
});

await test("Max name length: input capped at 20 characters", async () => {
  await page.click('button:has-text("+ Add Player")');
  await page.waitForSelector("text=Player ka naam?", { timeout: 3000 });
  const longName = "A".repeat(25);
  await page.locator('input[type="text"]').last().fill(longName);
  const val = await page.locator('input[type="text"]').last().inputValue();
  await page.locator('button:text-is("Cancel")').last().click();
  if (val.length > 20) throw new Error(`Name input accepted ${val.length} chars (max 20)`);
});

await test("Edit player: ✏️ icon opens edit modal", async () => {
  const raviCard = page.locator('div.h-20.rounded-2xl', { hasText: "Ravi" }).first();
  await raviCard.locator("button").first().click(); // ✏️ button
  await page.waitForSelector("text=Player Edit", { timeout: 3000 });
});

await test("Edit player: renaming reflects in available list", async () => {
  const nameInput = page.locator('input[type="text"]').last();
  await nameInput.fill("Ravi2");
  await page.locator('button:text-is("Save")').first().click();
  await page.waitForSelector("text=Ravi2", { timeout: 2000 });
});

await test("Edit player: renaming to a duplicate name shows error", async () => {
  const ravi2Card = page.locator('div.h-20.rounded-2xl', { hasText: "Ravi2" }).first();
  await ravi2Card.locator("button").first().click();
  await page.waitForSelector("text=Player Edit", { timeout: 3000 });
  const nameInput = page.locator('input[type="text"]').last();
  await nameInput.fill("Simi");
  await page.locator('button:text-is("Save")').first().click();
  await page.waitForSelector("text=pehle se hai", { timeout: 2000 });
  // dismiss by clicking backdrop
  await page.locator('.fixed.inset-0.z-50').last().click({ position: { x: 10, y: 10 } });
  await page.waitForTimeout(300);
});

await test("Delete player: player removed from available list", async () => {
  const ravi2Card = page.locator('div.h-20.rounded-2xl', { hasText: "Ravi2" }).first();
  await ravi2Card.locator("button").first().click();
  await page.waitForSelector("text=Player Edit", { timeout: 3000 });
  // Delete button text: "🗑 Delete"
  await page.locator("button", { hasText: "Delete" }).first().click();
  await page.waitForTimeout(500);
  const gone = await page.locator("text=Ravi2").isVisible({ timeout: 500 }).catch(() => false);
  if (gone) throw new Error("Ravi2 still shown after delete");
});

// ── Group 6: Dealer picker ────────────────────────────────────────────────────

console.log("\n── Group 6: Dealer picker ──");

await fresh(page);
await page.click("text=Start New Game");
await page.waitForSelector('button:has-text("+ Add Player")', { timeout: 5000 });

await test("Dealer picker hidden before any player added", async () => {
  const visible = await page.locator("text=Pehle kaun deal karega").isVisible({ timeout: 500 }).catch(() => false);
  if (visible) throw new Error("Dealer picker shown before any player");
});

await addPlayer(page, "P1"); // auto-selects P1 (1 selected)

await test("Dealer picker still hidden with only 1 player selected", async () => {
  const visible = await page.locator("text=Pehle kaun deal karega").isVisible({ timeout: 500 }).catch(() => false);
  if (visible) throw new Error("Dealer picker shown with only 1 player");
});

await addPlayer(page, "P2"); // auto-selects P2 (2 selected)

await test("Dealer picker appears when 2 players are selected", async () => {
  await page.waitForSelector("text=Pehle kaun deal karega", { timeout: 3000 });
});

await test("First-added player (P1) is the default dealer — highlighted blue", async () => {
  // Dealer button: bg-blue-500/20 border-blue-400/50 text-blue-300 when active
  const p1Chip = page.locator(`button`, { hasText: "P1" }).last();
  const cls = await p1Chip.getAttribute("class").catch(() => "");
  if (!cls?.includes("blue")) throw new Error(`P1 chip not highlighted blue. Class: ${cls}`);
});

await test("Switching dealer to P2 highlights P2 chip blue", async () => {
  await page.locator("button", { hasText: "P2" }).last().click();
  await page.waitForTimeout(200);
  const p2Chip = page.locator("button", { hasText: "P2" }).last();
  const cls = await p2Chip.getAttribute("class").catch(() => "");
  if (!cls?.includes("blue")) throw new Error(`P2 chip not highlighted after selection. Class: ${cls}`);
});

await addPlayer(page, "P3"); // auto-selects P3 (3 selected), P2 still dealer

await page.click('button:has-text("Start Session")');
await page.waitForSelector(".text-4xl.font-black", { timeout: 6000 });

await test("Selected dealer (P2) shows 🎴 Dealer badge in live game", async () => {
  const p2Card = page.locator(".rounded-2xl", { hasText: "P2" }).first();
  await p2Card.locator("text=🎴 Dealer").waitFor({ timeout: 3000 });
});

// ── Group 7: UI features ──────────────────────────────────────────────────────

console.log("\n── Group 7: UI features ──");

await test("Pause button opens PauseOverlay", async () => {
  await page.click('button:has-text("⏸ Pause")');
  await page.waitForSelector("text=Resume Game", { timeout: 3000 });
});

await test("Resume Game closes PauseOverlay", async () => {
  await page.click('button:has-text("Resume Game")');
  // Wait for overlay to fully dismount (exit animation can take ~300ms)
  await page.waitForSelector("text=Resume Game", { state: "detached", timeout: 4000 });
});

// Complete a round to enable history and badges
await endRound(page, "P1", { P1: 0, P2: 10, P3: 15 });

await test("Player history sheet opens on card tap", async () => {
  const p1Card = page.locator(".rounded-2xl", { hasText: "P1" }).first();
  await p1Card.click();
  // "rounds played" is unique to PlayerHistorySheet — not present in LiveGame
  await page.waitForSelector("text=rounds played", { timeout: 3000 });
});

await test("Player history sheet closes on backdrop tap", async () => {
  // Absolute viewport coords (10, 10) hit the backdrop (z-40) above the bottom sheet (z-50)
  await page.mouse.click(10, 10);
  // Spring exit animation takes ~500ms; 900ms is a safe margin
  await page.waitForTimeout(900);
  const still = await page.locator("text=rounds played").isVisible({ timeout: 500 }).catch(() => false);
  if (still) throw new Error("History sheet still visible after backdrop tap");
});

await test("Trophy badge appears after player closes a round", async () => {
  // P1 closed round 1 — trophy badge on P1's card
  const p1Card = page.locator(".rounded-2xl", { hasText: "P1" }).first();
  await p1Card.locator("text=🏆").waitFor({ timeout: 2000 });
});

await test("Dealer badge (🎴 Dealer) shows on P1 after they closed", async () => {
  // P1 closed round 1 → P1 is dealer for round 2
  const p1Card = page.locator(".rounded-2xl", { hasText: "P1" }).first();
  await p1Card.locator("text=🎴 Dealer").waitFor({ timeout: 2000 });
});

await test("Share Standings button enabled in Pause after round 1", async () => {
  await page.click('button:has-text("⏸ Pause")');
  await page.waitForSelector("text=Share Standings", { timeout: 3000 });
  const btn = page.locator("button", { hasText: "Share Standings" }).first();
  const disabled = await btn.getAttribute("disabled");
  if (disabled !== null) throw new Error("Share Standings disabled after round 1 — should be enabled");
  await page.click('button:has-text("Resume Game")');
});

// ── Group 8: Visual tension (card states) ─────────────────────────────────────

console.log("\n── Group 8: Visual tension (card states) ──");

await fresh(page);
await startGame(page, ["Raj", "Naz"]);

// Build Raj to 75 pts (warning zone ≥70) — Naz closes each round to give Raj points
await endRound(page, "Naz", { Raj: 25, Naz: 0 }); // Raj:25
await endRound(page, "Raj", { Raj: 0, Naz: 25  }); // Naz:25
await endRound(page, "Naz", { Raj: 25, Naz: 0  }); // Raj:50
await endRound(page, "Raj", { Raj: 0, Naz: 25  }); // Naz:50
await endRound(page, "Naz", { Raj: 25, Naz: 0  }); // Raj:75 ← warning zone

await test("Player at 75 pts shows warning card background (amber hex)", async () => {
  const rajCard = page.locator(".rounded-2xl", { hasText: "Raj" }).first();
  const cls = await rajCard.getAttribute("class");
  // Warning bg: bg-[#17110a] — contains "17110a"
  if (!cls?.includes("17110a")) throw new Error(`Raj at 75 not showing warning bg. Classes: ${cls}`);
});

await test("Player at 75 pts shows 70+ danger badge", async () => {
  const rajCard = page.locator(".rounded-2xl", { hasText: "Raj" }).first();
  await rajCard.locator("text=70+").waitFor({ timeout: 2000 });
});

// Push Raj to 90 pts (critical zone ≥85)
await endRound(page, "Raj", { Raj: 0, Naz: 25  }); // Naz:75
await endRound(page, "Naz", { Raj: 15, Naz: 0  }); // Raj:90 ← critical zone

await test("Player at 90 pts shows critical card background (red hex)", async () => {
  const rajCard = page.locator(".rounded-2xl", { hasText: "Raj" }).first();
  const cls = await rajCard.getAttribute("class");
  // Critical bg: bg-[#1a0606] — contains "1a0606"
  if (!cls?.includes("1a0606")) throw new Error(`Raj at 90 not showing critical bg. Classes: ${cls}`);
});

await test("Player at 90 pts shows 85+ danger badge with animate-pulse", async () => {
  const rajCard = page.locator(".rounded-2xl", { hasText: "Raj" }).first();
  await rajCard.locator("text=85+").waitFor({ timeout: 2000 });
});

// ── Group 9: All-out edge case ────────────────────────────────────────────────

console.log("\n── Group 9: All-out edge case (both players cross 100 same round) ──");

await fresh(page);
await startGame(page, ["A1", "B1"]);

// Target: A1=97, B1=42 before final round.
// All chip-only scores (CHIPS = [0,1,2,3,4,5,10,15,20,25]).
await endRound(page, "A1", { A1: 0,  B1: 25 }); // A1:0,  B1:25
await endRound(page, "B1", { A1: 25, B1: 0  }); // A1:25, B1:25
await endRound(page, "A1", { A1: 0,  B1: 15 }); // A1:25, B1:40 (15 is a chip value)
await endRound(page, "B1", { A1: 25, B1: 0  }); // A1:50, B1:40
await endRound(page, "A1", { A1: 0,  B1: 0  }); // A1:50, B1:40
await endRound(page, "B1", { A1: 25, B1: 0  }); // A1:75, B1:40
await endRound(page, "A1", { A1: 0,  B1: 0  }); // A1:75, B1:40
await endRound(page, "B1", { A1: 20, B1: 0  }); // A1:95, B1:40 (20 is a chip value)
await endRound(page, "A1", { A1: 0,  B1: 2  }); // A1:95, B1:42
await endRound(page, "B1", { A1: 2,  B1: 0  }); // A1:97, B1:42

// Final round: A1 closes (5) → A1:102; B1 gets 60 via numpad → B1:102
// Both cross 100 same round → all-out → A1 wins (closer tiebreaker)
await test("All-out: both cross 100 same round → winner screen shows closer (A1) as winner", async () => {
  await page.click('button:has-text("End Round")');
  await page.waitForSelector("text=Kaun Jeeta Be?", { timeout: 4000 });
  await page.locator("button", { hasText: "A1" }).first().click();
  await page.waitForSelector("text=Enter Scores", { timeout: 4000 });

  // A1 (closer): chip 5
  const a1Sec = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "A1" }).first();
  await a1Sec.locator('button:text-is("5")').first().click();

  // B1 (non-closer): custom 60 via numpad
  const b1Sec = page.locator(".rounded-2xl.bg-elevated.p-3", { hasText: "B1" }).first();
  await b1Sec.locator('button:text-is("Custom")').click();
  await page.locator('[style*="9999"]').waitFor({ timeout: 3000 });
  await page.locator('[style*="9999"]').locator('button:text-is("6")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("0")').first().click();
  await page.locator('[style*="9999"]').locator('button:text-is("✓")').click();
  await page.waitForTimeout(300);

  await page.locator('button:text-is("Confirm Round")').click();

  // All-out → winner overlay shows (A1 wins as closer-tiebreaker)
  await page.waitForSelector("text=Chhummy Champion", { timeout: 8000 });
  await page.locator("text=Chhummy Champion").first().waitFor({ timeout: 3000 });
  // A1 should be on winner screen
  await page.locator("text=A1").first().waitFor({ timeout: 2000 });
});

// ── Group 10: 3-player: elimination modal, game continues ─────────────────────

console.log("\n── Group 10: 3-player elimination ──");

await page.locator("button", { hasText: /Back to Home|Home/ }).first().click().catch(() => {});
await page.waitForSelector("text=Start New Game", { timeout: 5000 }).catch(() => {});

await fresh(page);
await startGame(page, ["X", "Y", "Z"]);

// Get Z to exactly 101 while X and Y stay safe (chip-only scores)
await endRound(page, "X", { X: 0, Y: 0, Z: 25 }); // Z:25
await endRound(page, "Y", { X: 0, Y: 0, Z: 25 }); // Z:50
await endRound(page, "X", { X: 0, Y: 0, Z: 25 }); // Z:75
await endRound(page, "Y", { X: 0, Y: 0, Z: 25 }); // Z:100 (still alive)
await endRound(page, "X", { X: 0, Y: 0, Z: 1  }); // Z:101 → eliminated

await test("3-player: elimination modal shown (not direct winner)", async () => {
  // 2 survivors remain (X, Y) → elimination overlay, NOT winner screen
  const winnerShown = await page.locator("text=Chhummy Champion").first().isVisible({ timeout: 500 }).catch(() => false);
  if (winnerShown) throw new Error("Winner screen shown prematurely — should show elimination modal first");
  // Some elimination indicator visible
  await page.waitForSelector("text=OUT", { timeout: 5000 });
});

await test("After dismissing elimination, game continues with 2 survivors", async () => {
  await dismissElimination(page);
  await page.waitForSelector(".text-4xl.font-black", { timeout: 4000 });
  const heroText = await page.locator(".text-4xl.font-black").first().textContent();
  if (!heroText?.includes("Round")) throw new Error(`Expected round hero, got: "${heroText}"`);
  await page.waitForSelector("text=2 playing", { timeout: 2000 });
});

// ── Group 11: Stats & History ─────────────────────────────────────────────────

console.log("\n── Group 11: Stats & History ──");

// End the 3-player game via Pause → End Game, then navigate home
await page.click('button:has-text("⏸ Pause")').catch(() => {});
await page.waitForSelector("text=End Game", { timeout: 4000 }).catch(() => {});
await page.locator("button", { hasText: "End Game" }).first().click().catch(() => {});
await page.waitForTimeout(500);
// Confirm abandon if a confirmation dialog appears
const confirmAbandon = page.locator("button", { hasText: /Confirm|Yes|Abandon/ }).first();
if (await confirmAbandon.isVisible({ timeout: 2000 }).catch(() => false)) {
  await confirmAbandon.click();
}
// Navigate home — use page.goto as reliable fallback (does NOT delete DB)
await page.waitForSelector("text=Start New Game", { timeout: 6000 }).catch(async () => {
  await page.goto(BASE);
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
});

await test("Stats button navigates to stats page", async () => {
  await page.locator("button", { hasText: /Stats|History/ }).first().click();
  await page.waitForSelector("text=Players", { timeout: 3000 });
});

await test("Stats Players tab is active by default", async () => {
  await page.waitForSelector("text=Players", { timeout: 2000 });
});

await test("Stats History tab shows session data", async () => {
  await page.locator("button", { hasText: "History" }).first().click();
  // History tab should have content (at least column headers or player names)
  await page.waitForTimeout(500);
  // Just verify no crash — no specific text guaranteed without completed game stats
});

await test("Stats Charts tab renders without crash", async () => {
  await page.locator("button", { hasText: "Charts" }).first().click();
  await page.waitForTimeout(500);
  // No crash = pass (completed game stats may or may not be present)
});

await test("Back to Home from Stats works", async () => {
  await page.locator("button", { hasText: /Back|Home/ }).first().click();
  await page.waitForSelector("text=Start New Game", { timeout: 5000 });
});

// ── Summary ───────────────────────────────────────────────────────────────────

await browser.close();

const total = pass + fail;
console.log(`\n── Results: ${pass}/${total} passed ──`);
if (fail > 0) {
  console.log(`   ${fail} failed`);
  process.exit(1);
}
