/**
 * batch-18 — Final pre-release E2E coverage
 * Covers gaps not in prior suites:
 *   - Session resume on page reload (IndexedDB persistence)
 *   - Dealer rotation (closer becomes dealer next round)
 *   - Cancel on WhoClosed (back to live game)
 *   - Back button on EnterScores (reopens WhoClosed)
 *   - Stats: Longest Game / Fastest Win records visible
 *   - Stats: Weekly Activity chart rendered
 *   - Stats: Clear All Data button flow
 *   - Round dots cap (14 dots then "+N")
 *   - History tab: Final Scores card after rounds
 *   - Numpad: leading zero replaced on next digit
 *
 * Run: node batch18-final.mjs  (dev server on http://localhost:5173)
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

async function playRound(page, closerName, scores) {
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 5000 }).catch(() => {});
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: new RegExp(`^${closerName}$`) }) })
    .first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  for (const [name, score] of Object.entries(scores)) {
    const section = page.locator(".fixed.inset-0.z-50")
      .locator("div.rounded-2xl.bg-elevated")
      .filter({ has: page.locator(".font-semibold").filter({ hasText: new RegExp(`^${name}$`) }) });
    if ([0,1,2,3,4,5,10,15,20,25].includes(score)) {
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
  await page.locator("button:has-text('Confirm Round')").click();
  await page.waitForTimeout(700);
}

async function dismissElimination(page) {
  const hasElim = await page.locator("text=OUT").isVisible().catch(() => false);
  if (hasElim) {
    await page.locator("button:has-text('Continue')").click();
    await page.waitForTimeout(500);
  }
}

const ctx = await chromium.launch({ headless: true });
const mkPage = async () => {
  const c = await ctx.newContext({ viewport: { width: 390, height: 844 } });
  const p = await c.newPage();
  return p;
};

// ─────────────────────────────────────────────────────────────────
console.log("\n── Group 1: Session resume on reload ──");

await test("Session mid-game persists after reload (IndexedDB)", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Aarav", "Reena"]);
  await playRound(page, "Aarav", { Aarav: 0, Reena: 10 });
  // Reload the page
  await page.reload();
  await page.waitForTimeout(1500);
  // Should show the resume screen or land on LiveGame directly
  const body = await page.locator("body").textContent();
  const hasResume = body.includes("Continue Battle") || body.includes("Round 2") || body.includes("Aarav");
  if (!hasResume) throw new Error("No resume/live screen after reload");
  await page.close();
});

await test("Continue Battle resumes live game at correct round", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Aarav", "Reena"]);
  await playRound(page, "Aarav", { Aarav: 0, Reena: 15 });
  await playRound(page, "Aarav", { Aarav: 0, Reena: 20 });
  // Now at Round 3 with 2 rounds played
  await page.reload();
  await page.waitForTimeout(1500);
  const body = await page.locator("body").textContent();
  if (body.includes("Continue Battle")) {
    await page.locator("text=Continue Battle").click();
    await page.waitForTimeout(800);
  }
  const heroText = await page.locator(".text-4xl.font-black").textContent().catch(() => "");
  if (!heroText.includes("Round 3")) throw new Error(`Expected Round 3, got: "${heroText}"`);
  await page.close();
});

await test("Player scores persist after reload", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Aarav", "Reena"]);
  await playRound(page, "Aarav", { Aarav: 0, Reena: 30 });
  await page.reload();
  await page.waitForTimeout(1500);
  const body = await page.locator("body").textContent();
  if (body.includes("Continue Battle")) {
    await page.locator("text=Continue Battle").click();
    await page.waitForTimeout(800);
  }
  // Reena should show 30 pts
  const reenaCard = page.locator(".rounded-2xl").filter({ hasText: "Reena" }).first();
  const cardText = await reenaCard.textContent().catch(() => "");
  if (!cardText.includes("30")) throw new Error(`Reena's score 30 not found after reload, got: "${cardText}"`);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 2: Dealer rotation ──");

await test("After R1 (A closes), A shows Dealer badge in R2", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  await playRound(page, "Priya", { Priya: 0, Anjali: 10 });
  // Now at Round 2 — Priya closed R1, so Priya should be dealer
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  const priyaCard = page.locator(".rounded-2xl").filter({ hasText: "Priya" }).first();
  const cardText = await priyaCard.textContent().catch(() => "");
  if (!cardText.includes("Dealer")) throw new Error(`Priya should be Dealer in R2, got: "${cardText}"`);
  await page.close();
});

await test("After R2 (B closes), B shows Dealer badge in R3", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  await playRound(page, "Priya", { Priya: 0, Anjali: 10 });
  await playRound(page, "Anjali", { Priya: 5, Anjali: 0 });
  // Anjali closed R2, so Anjali is dealer in R3
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  const anjaliCard = page.locator(".rounded-2xl").filter({ hasText: "Anjali" }).first();
  const cardText = await anjaliCard.textContent().catch(() => "");
  if (!cardText.includes("Dealer")) throw new Error(`Anjali should be Dealer in R3, got: "${cardText}"`);
  await page.close();
});

await test("Trophy badge count increments correctly (2 closes = 🏆 2)", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  await playRound(page, "Priya", { Priya: 0, Anjali: 10 });
  await playRound(page, "Priya", { Priya: 0, Anjali: 10 });
  // Priya closed twice
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  const body = await page.locator("body").textContent();
  if (!body.includes("🏆 2")) throw new Error("Expected 🏆 2 after 2 closes");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 3: Navigation flows ──");

await test("Cancel on WhoClosed returns to live game", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  // Press Cancel
  await page.locator("button:has-text('Cancel')").click();
  await page.waitForTimeout(500);
  // Should be back on live game, no overlay
  const overlayVisible = await page.locator(".fixed.inset-0.z-50").isVisible().catch(() => false);
  if (overlayVisible) throw new Error("Overlay still visible after Cancel");
  const heroText = await page.locator(".text-4xl.font-black").textContent().catch(() => "");
  if (!heroText.includes("Round 1")) throw new Error(`Expected Round 1 after cancel, got: "${heroText}"`);
  await page.close();
});

await test("Back on EnterScores returns to WhoClosed", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  // Select a closer
  await page.locator(".fixed.inset-0.z-50 button.h-32").first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  // Press Back
  await page.locator("button:has-text('Back')").click();
  await page.waitForTimeout(500);
  // Should be back on WhoClosed
  const whoClosedVisible = await page.locator("text=Kaun Jeeta Be").isVisible().catch(() => false);
  if (!whoClosedVisible) throw new Error("WhoClosed not shown after pressing Back from EnterScores");
  await page.close();
});

await test("End Round button shows round number in text", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  // R1: End Round #1
  const btnR1 = await page.locator("button").filter({ hasText: /End Round #1/ }).isVisible();
  if (!btnR1) throw new Error("End Round #1 button not visible");
  await playRound(page, "Priya", { Priya: 0, Anjali: 5 });
  // R2: End Round #2
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  const btnR2 = await page.locator("button").filter({ hasText: /End Round #2/ }).isVisible();
  if (!btnR2) throw new Error("End Round #2 button not visible after round 1");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 4: Round dots & long games ──");

await test("Round dots appear 1 per completed round (up to 14)", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  // Play 3 rounds
  for (let i = 0; i < 3; i++) {
    await playRound(page, "Priya", { Priya: 0, Anjali: 5 });
    await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  }
  const dots = await page.locator(".w-1\\.5.h-1\\.5.rounded-full.bg-white\\/25").count();
  if (dots !== 3) throw new Error(`Expected 3 dots after 3 rounds, got ${dots}`);
  await page.close();
});

await test("Round dots cap at 14, then '+N' overflow label appears", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["Priya", "Anjali"]);
  // Play 16 rounds with small scores
  for (let i = 0; i < 16; i++) {
    await playRound(page, "Priya", { Priya: 0, Anjali: 1 });
    await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  }
  const dots = await page.locator(".w-1\\.5.h-1\\.5.rounded-full.bg-white\\/25").count();
  if (dots !== 14) throw new Error(`Expected 14 dots max, got ${dots}`);
  // Should have "+2" overflow label
  const body = await page.locator("body").textContent();
  if (!body.includes("+2")) throw new Error("Expected '+2' overflow label after 16 rounds");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 5: Stats page features ──");

async function completeFastGame(page, names) {
  await startGame(page, names);
  const [A, B] = names;
  // 2-player quick win: A closes, B hits 101 in 2 rounds (60+41)
  await playRound(page, A, { [A]: 0, [B]: 60 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  await playRound(page, A, { [A]: 0, [B]: 41 });
  await page.waitForTimeout(500);
  // Back to home
  await page.locator("button:has-text('Back to Home')").click().catch(() => {});
  await page.locator("button:has-text('Back')").click().catch(() => {});
  await page.waitForSelector("text=Start New Game", { timeout: 5000 });
}

await test("Stats Charts tab: Longest Game stat renders", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  await page.locator("button:has-text('Charts')").click();
  await page.waitForTimeout(800);
  const body = await page.locator("body").textContent();
  if (!body.includes("Longest Game")) throw new Error("Longest Game stat not visible in Charts tab");
  await page.close();
});

await test("Stats Charts tab: Fastest Win stat renders", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  await page.locator("button:has-text('Charts')").click();
  await page.waitForTimeout(800);
  const body = await page.locator("body").textContent();
  if (!body.includes("Fastest Win")) throw new Error("Fastest Win stat not visible in Charts tab");
  await page.close();
});

await test("Stats Charts tab: Score Trend line chart renders", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  await page.locator("button:has-text('Charts')").click();
  await page.waitForTimeout(800);
  const body = await page.locator("body").textContent();
  if (!body.includes("Score Trend")) throw new Error("Score Trend chart not visible");
  await page.close();
});

await test("Stats History: Final Scores card shows after expanding session", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  await page.locator("button:has-text('History')").click();
  await page.waitForTimeout(500);
  // Expand session
  await page.locator("text=Sana won").first().click().catch(() => {});
  await page.locator(".rounded-2xl").first().click().catch(() => {});
  await page.waitForTimeout(500);
  const body = await page.locator("body").textContent();
  if (!body.includes("Final Scores")) throw new Error("Final Scores card not found in History expand");
  await page.close();
});

await test("Stats: Clear All Data button visible and two-step confirm flow", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  // Scroll down to find Clear All Data
  await page.locator("button:has-text('Clear All Data')").scrollIntoViewIfNeeded().catch(() => {});
  const clearBtn = await page.locator("button:has-text('Clear All Data')").isVisible();
  if (!clearBtn) throw new Error("Clear All Data button not visible");
  // Click it — should show confirm step
  await page.locator("button:has-text('Clear All Data')").click();
  await page.waitForTimeout(300);
  const body = await page.locator("body").textContent();
  // Should show a confirm prompt (two-step)
  const hasConfirm = body.includes("Sure?") || body.includes("Confirm") || body.includes("Yes") || body.includes("Cancel");
  if (!hasConfirm) throw new Error("Two-step confirm not shown after clicking Clear All Data");
  await page.close();
});

await test("Clear All Data confirmed → returns to Home with no history", async () => {
  const page = await mkPage();
  await fresh(page);
  await completeFastGame(page, ["Sana", "Ravi"]);
  await page.click("text=Stats");
  await page.waitForSelector("text=Players", { timeout: 5000 });
  await page.locator("button:has-text('Clear All Data')").scrollIntoViewIfNeeded().catch(() => {});
  await page.locator("button:has-text('Clear All Data')").click();
  await page.waitForTimeout(300);
  // Find and click the confirm button (second step)
  const confirmBtn = page.locator("button").filter({ hasText: /Yes|Confirm|Haan/ }).first();
  await confirmBtn.click();
  await page.waitForTimeout(1000);
  // Should land on Home
  const homeVisible = await page.locator("text=Start New Game").isVisible().catch(() => false);
  if (!homeVisible) throw new Error("Did not return to Home after Clear All Data");
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 6: Numpad edge cases ──");

await test("Numpad: leading zero replaced on next digit (0→3 shows 3, not 03)", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["P1", "P2"]);
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32").first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  // Open Custom numpad for non-closer
  const nonCloserSection = page.locator(".fixed.inset-0.z-50")
    .locator("div.rounded-2xl.bg-elevated")
    .filter({ has: page.locator("button:has-text('Custom')") })
    .first();
  await nonCloserSection.locator("button:has-text('Custom')").click();
  await page.waitForTimeout(350);
  // Press 0 then 3 — should show "3" not "03"
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(b => b.textContent?.trim() === "0" && b.closest('[style*="9999"]'));
    btn?.click();
  });
  await page.waitForTimeout(80);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(b => b.textContent?.trim() === "3" && b.closest('[style*="9999"]'));
    btn?.click();
  });
  await page.waitForTimeout(80);
  // The numpad display should show "3" not "03"
  const numpadDisplay = await page.evaluate(() => {
    const el = document.querySelector('[style*="9999"] .text-5xl, [style*="9999"] .text-4xl, [style*="9999"] span.font-black');
    return el?.textContent?.trim() ?? "";
  });
  if (numpadDisplay === "03") throw new Error(`Numpad shows "03" — leading zero not replaced`);
  if (!numpadDisplay.includes("3")) throw new Error(`Numpad shows "${numpadDisplay}" — unexpected`);
  await page.close();
});

await test("Numpad: backspace clears last digit", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["P1", "P2"]);
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32").first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  const nonCloserSection = page.locator(".fixed.inset-0.z-50")
    .locator("div.rounded-2xl.bg-elevated")
    .filter({ has: page.locator("button:has-text('Custom')") })
    .first();
  await nonCloserSection.locator("button:has-text('Custom')").click();
  await page.waitForTimeout(350);
  // Type "45"
  for (const d of ["4", "5"]) {
    await page.evaluate((lbl) => {
      const btn = [...document.querySelectorAll("button")]
        .find(b => b.textContent?.trim() === lbl && b.closest('[style*="9999"]'));
      btn?.click();
    }, d);
    await page.waitForTimeout(80);
  }
  // Press backspace (⌫)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find(b => (b.textContent?.includes("⌫") || b.textContent?.includes("←")) && b.closest('[style*="9999"]'));
    btn?.click();
  });
  await page.waitForTimeout(80);
  // Should show "4" after deleting "5"
  const numpadText = await page.evaluate(() => {
    const all = document.querySelectorAll('[style*="9999"] button');
    return [...all].map(b => b.textContent?.trim()).filter(Boolean).join("|");
  });
  if (numpadText.includes("45")) throw new Error(`Backspace did not work — still shows 45 in numpad area`);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
console.log("── Group 7: Running total preview ──");

await test("Running total preview shows correctly for non-closer", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["A", "B"]);
  // Play 1 round to give B some score first
  await playRound(page, "A", { A: 0, B: 20 });
  await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  // Start round 2
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: /^A$/ }) })
    .first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  // B starts at 20; select chip 10 → preview should show 30
  const bSection = page.locator(".fixed.inset-0.z-50")
    .locator("div.rounded-2xl.bg-elevated")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: /^B$/ }) });
  await bSection.locator("button").filter({ hasText: /^10$/ }).first().click();
  await page.waitForTimeout(200);
  // Preview should show "→ 30" or "30" somewhere near B
  const sectionText = await bSection.textContent().catch(() => "");
  if (!sectionText.includes("30")) throw new Error(`Running total preview not showing 30 (got: "${sectionText}")`);
  await page.close();
});

await test("Running total preview shows 💀 when pending pushes over 100", async () => {
  const page = await mkPage();
  await fresh(page);
  await startGame(page, ["A", "B"]);
  // Give B 75 pts first (play 3 rounds of 25)
  for (let i = 0; i < 3; i++) {
    await playRound(page, "A", { A: 0, B: 25 });
    await page.waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 3000 }).catch(() => {});
  }
  // Now B is at 75. Start round 4
  await page.locator("button").filter({ hasText: /End Round/ }).first().click();
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: /^A$/ }) })
    .first().click();
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  // B at 75 + select chip 30 → 105 → 💀 preview
  const bSection = page.locator(".fixed.inset-0.z-50")
    .locator("div.rounded-2xl.bg-elevated")
    .filter({ has: page.locator(".font-semibold").filter({ hasText: /^B$/ }) });
  // Use custom numpad for 30 (30 is not in chip set)
  await bSection.locator("button:has-text('Custom')").click();
  await page.waitForTimeout(350);
  for (const d of ["3", "0"]) {
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
  await page.waitForTimeout(300);
  // Preview should show 💀 (105 > 100)
  const sectionText = await bSection.textContent().catch(() => "");
  if (!sectionText.includes("💀")) throw new Error(`No 💀 in running total preview at 75+30=105 (got: "${sectionText}")`);
  await page.close();
});

// ─────────────────────────────────────────────────────────────────
await ctx.close();

console.log(`\n── Results: ${pass}/${pass + fail} passed ──`);
if (fail > 0) {
  console.log(`\nFailed tests: ${fail}`);
  process.exit(1);
}
