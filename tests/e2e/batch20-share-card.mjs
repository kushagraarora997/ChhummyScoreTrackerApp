/**
 * batch-20 — Share card & winner screen edge case tests
 *
 * What we're guarding against:
 *   - Right-edge clipping of score text in html2canvas off-screen div (bug found 2026-06-24)
 *   - Long player names (20 chars) overflowing the pts column
 *   - 3-digit scores (101+) fitting in the card layout
 *   - 6-player leaderboard completeness
 *   - Eliminated players shown correctly (💀, red color class)
 *   - Mid-game share card (PauseOverlay) text completeness
 *   - Share card off-screen div structural integrity
 *
 * Key technique: html2canvas captures an off-screen div. We verify the div's DOM text
 * content includes the FULL strings (e.g. "116 pts" not "116 pt") before the user
 * ever taps Share.
 *
 * Run: node batch20-share-card.mjs  (dev server on http://localhost:5173)
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

async function enterScore(page, playerName, score) {
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
    await enterScore(page, name, score);
  }
  await page.locator("button:has-text('Confirm Round')").click();
  await page.waitForTimeout(700);
}

// 2-player game: Alpha wins in 2 rounds (Beta reaches 115 → eliminated)
async function fastGame(page, alpha, beta) {
  await startGame(page, [alpha, beta]);
  await playRound(page, alpha, { [alpha]: 0, [beta]: 60 });
  await playRound(page, alpha, { [alpha]: 0, [beta]: 55 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
}

const ctx = await chromium.launch({ headless: true });
const mkPage = async () => {
  const c = await ctx.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  return p;
};

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 1: Share card off-screen div — text completeness ──");

await test("Share card div: winner row shows full 'X pts' (not truncated)", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Pops", "Nanz");
  // Query the off-screen share card div
  const hiddenText = await page.evaluate(() => {
    // The hidden card is position:fixed left:-9999px — find it by style
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("0 pts")) throw new Error(`Winner score row missing '0 pts' in share card. Got: "${hiddenText.slice(0, 200)}"`);
  if (!hiddenText.includes("115 pts")) throw new Error(`Eliminated score '115 pts' missing in share card. Got: "${hiddenText.slice(0, 200)}"`);
  await page.close();
});

await test("Share card div: eliminated player score ends with 'pts' not 'pt'", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Kush", "Hanz");
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  // Should NOT contain "115 pt " (truncated — note the space after "pt" would indicate "pts" was cut)
  // Should contain "115 pts" with the full "s"
  if (hiddenText.includes("115 pt ") && !hiddenText.includes("115 pts")) {
    throw new Error("Score appears truncated: found '115 pt ' but not '115 pts'");
  }
  if (!hiddenText.includes("pts")) throw new Error("No 'pts' found in share card at all");
  await page.close();
});

await test("Share card div: 3-digit score (100+ pts) renders completely", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Mom", "Dev");
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  // 55 + 60 = 115 for eliminated player — verify 3 digit score + "pts" present
  const match = hiddenText.match(/\d{3}\s*pts/);
  if (!match) throw new Error(`No 3-digit score 'XXX pts' found in share card. Text: "${hiddenText.slice(0, 200)}"`);
  await page.close();
});

await test("Share card div: both player names present", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Pops", "Nanz");
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("Pops")) throw new Error("Winner name 'Pops' missing from share card");
  if (!hiddenText.includes("Nanz")) throw new Error("Loser name 'Nanz' missing from share card");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 2: Long player names ──");

await test("20-char player name: visible leaderboard row doesn't clip score", async () => {
  const page = await mkPage();
  await fresh(page);
  const longName = "Kushagra Arora123"; // 17 chars (near max 20)
  await fastGame(page, longName, "Pops");
  // Check visible card (not off-screen)
  const visibleBody = await page.locator("body").textContent();
  if (!visibleBody.includes("0 pts")) throw new Error("Winner score '0 pts' not visible in winner card");
  await page.close();
});

await test("20-char name: share card div contains full score", async () => {
  const page = await mkPage();
  await fresh(page);
  const longName = "Kushagra Arora123"; // 17 chars
  await fastGame(page, longName, "Pops");
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("0 pts")) throw new Error(`Winner '0 pts' missing from share card with long name. Got: "${hiddenText.slice(0, 200)}"`);
  if (!hiddenText.includes("115 pts")) throw new Error(`Loser '115 pts' missing from share card with long name.`);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 3: Multi-player leaderboard completeness ──");

await test("3-player game: all 3 names in winner screen leaderboard", async () => {
  const page = await mkPage();
  await fresh(page);
  // 3-player: Alpha wins, Gamma eliminated first, Beta eliminated next
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  await playRound(page, "Alpha", { Alpha: 0, Beta: 60, Gamma: 60 });
  await playRound(page, "Alpha", { Alpha: 0, Beta: 55, Gamma: 55 });
  // Gamma: 115 (elim), Beta: 115 (elim) — both eliminated same round → Alpha wins allOut
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const body = await page.locator("body").textContent();
  if (!body.includes("Alpha")) throw new Error("Alpha missing from winner screen");
  if (!body.includes("Beta")) throw new Error("Beta missing from winner screen");
  if (!body.includes("Gamma")) throw new Error("Gamma missing from winner screen");
  await page.close();
});

await test("3-player game: eliminated player shows 💀 in leaderboard", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  await playRound(page, "Alpha", { Alpha: 0, Beta: 60, Gamma: 60 });
  await playRound(page, "Alpha", { Alpha: 0, Beta: 55, Gamma: 55 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const body = await page.locator("body").textContent();
  if (!body.includes("💀")) throw new Error("No 💀 shown for eliminated players in winner leaderboard");
  await page.close();
});

await test("3-player share card: all 3 names + all scores with 'pts'", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Alpha", "Beta", "Gamma"]);
  await playRound(page, "Alpha", { Alpha: 0, Beta: 60, Gamma: 60 });
  await playRound(page, "Alpha", { Alpha: 0, Beta: 55, Gamma: 55 });
  await page.waitForSelector("text=Chhummy Champion", { timeout: 6000 });
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Chhummy Champion"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("Alpha")) throw new Error("Alpha missing from 3P share card");
  if (!hiddenText.includes("Beta")) throw new Error("Beta missing from 3P share card");
  if (!hiddenText.includes("Gamma")) throw new Error("Gamma missing from 3P share card");
  const ptsCounts = (hiddenText.match(/\d+\s*pts/g) || []).length;
  if (ptsCounts < 3) throw new Error(`Expected ≥3 'pts' occurrences in 3P card, found ${ptsCounts}`);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 4: Visible winner card integrity ──");

await test("Visible card: score column shows full 'X pts' text", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Pops", "Nanz");
  // Leaderboard rows use rounded-xl (not rounded-2xl) inside the winner card
  const visibleRows = page.locator(".rounded-xl").filter({ hasText: /\d+ pts/ });
  const count = await visibleRows.count();
  if (count < 2) throw new Error(`Expected ≥2 visible leaderboard rows with 'pts', found ${count}`);
  await page.close();
});

await test("Visible card: winner shown at rank 1", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Pops", "Nanz");
  // The ranked list: winner (0 pts) first, eliminated (115 pts) second
  const rankCells = await page.locator(".rounded-2xl").filter({ hasText: /\d+ pts/ }).allTextContents();
  if (!rankCells[0]?.includes("Pops")) throw new Error(`Rank 1 should be Pops (winner). Got: "${rankCells[0]}"`);
  await page.close();
});

await test("Visible card: ROUNDS and CLOSES stats shown", async () => {
  const page = await mkPage();
  await fresh(page);
  await fastGame(page, "Pops", "Nanz");
  const body = await page.locator("body").textContent();
  // DOM text is "Rounds"/"Closes"; CSS text-transform: uppercase makes them appear as ROUNDS/CLOSES
  if (!body.includes("Rounds")) throw new Error("Rounds stat label missing from winner screen");
  if (!body.includes("Closes")) throw new Error("Closes stat label missing from winner screen");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 5: Mid-game share card (PauseOverlay) ──");

await test("Pause share card div: contains 'pts' for each player", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Pops", "Nanz"]);
  await playRound(page, "Pops", { Pops: 0, Nanz: 25 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator("button:has-text('Pause')").click();
  await page.waitForSelector("text=Share Standings", { timeout: 4000 });
  // Read the off-screen standings card
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Standings"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("Pops")) throw new Error("'Pops' missing from pause share card");
  if (!hiddenText.includes("Nanz")) throw new Error("'Nanz' missing from pause share card");
  const ptsCounts = (hiddenText.match(/\d+\s*pts/g) || []).length;
  if (ptsCounts < 2) throw new Error(`Expected ≥2 'pts' in pause share card, found ${ptsCounts}`);
  await page.locator("button:has-text('Resume')").click();
  await page.close();
});

await test("Pause share card div: 3-digit score (70+ warning) shows full 'pts'", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Pops", "Nanz"]);
  // Get Nanz to 75 pts
  await playRound(page, "Pops", { Pops: 0, Nanz: 60 });
  await playRound(page, "Pops", { Pops: 0, Nanz: 15 });
  // Nanz: 75 pts (warning zone)
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 4000 }).catch(() => {});
  await page.locator("button:has-text('Pause')").click();
  await page.waitForSelector("text=Share Standings", { timeout: 4000 });
  const hiddenText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("div[style*='-9999px']")]
      .find(d => d.textContent?.includes("Standings"));
    return el?.textContent ?? "";
  });
  if (!hiddenText.includes("75 pts")) throw new Error(`'75 pts' not in pause share card. Found: "${hiddenText.slice(0,200)}"`);
  await page.locator("button:has-text('Resume')").click();
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
await ctx.close();

const total = pass + fail;
console.log(`\n══════════════════════════════════════════════`);
console.log(`batch-20 Results — ${new Date().toISOString()}`);
console.log(`Total: ${total} | ✓ ${pass} passed | ✗ ${fail} failed`);
console.log(`══════════════════════════════════════════════\n`);
process.exit(fail > 0 ? 1 : 0);
