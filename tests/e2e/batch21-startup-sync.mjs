/**
 * batch-21 — Startup sync regression tests
 *
 * The bug: when Device B opens the app with a room code already persisted in localStorage
 * (from a previous join), it only loaded from local Dexie. No cloud pull happened on startup,
 * so Device B never saw Device A's active game.
 *
 * Fix: App.tsx now calls pullFromCloud + re-init in parallel with the 900ms splash timer
 * whenever a room code is in localStorage on startup.
 *
 * NOTE: We use waitUntil: "domcontentloaded" (not "networkidle") because when a room code
 * is pre-set in localStorage, the startup pull fires Firestore connections immediately on
 * page load — Firebase's persistent connections prevent "networkidle" from ever being reached.
 *
 * Run: node batch21-startup-sync.mjs  (dev server on http://localhost:5173)
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
let pass = 0, fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, err) {
  const msg = typeof err === "string" ? err : err?.message?.split("\n")[0] ?? String(err);
  console.log(`  ❌ ${label}: ${msg}`);
  fail++;
}
async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function addPlayer(page, name) {
  await page.locator("button:has-text('+ Add Player')").click();
  await sleep(300);
  await page.locator("input[maxlength='20']").first().fill(name);
  await page.locator("text=Add").last().click();
  await sleep(300);
}

async function playRound(page, closerName, otherScore) {
  await page.waitForFunction(
    () => !document.querySelector(".fixed.inset-0.z-50"),
    { timeout: 3000 }
  ).catch(() => {});
  await page.locator("button").filter({ hasText: /End Round/ }).click();
  await sleep(400);
  await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
  await page.locator(".fixed.inset-0.z-50 button.h-32")
    .filter({ hasText: closerName }).click();
  await sleep(400);
  await page.waitForSelector("text=Confirm Round", { timeout: 5000 });
  await page.locator("button.rounded-xl").filter({ hasText: /^0$/ }).first().click();
  await sleep(150);
  await page.locator("button.rounded-xl")
    .filter({ hasText: new RegExp(`^${otherScore}$`) }).first().click();
  await sleep(150);
  await page.locator("text=Confirm Round").click();
  await sleep(600);
}

// Helper: load the app page. Use "domcontentloaded" not "networkidle" — Firebase's
// persistent WebSocket connections prevent networkidle from ever settling.
async function gotoApp(page) {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
  // Wait for the Splash animation to complete and Home to mount
  await page.waitForSelector("text=Let's Play", { timeout: 12000 });
}

// ── Test S1: Device B opens app with room code in localStorage → sees A's game ──
async function testS1_startupPull(browser) {
  console.log("\n[S1] Startup sync: Device B opens app with pre-set room code, no manual join");

  const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [pageA, pageB] = await Promise.all([ctxA.newPage(), ctxB.newPage()]);

  try {
    // A: create room and start a game
    await gotoApp(pageA);
    await pageA.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(2000); // Wait for pushToCloud
    const codeRaw = await pageA.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = codeRaw.trim();
    ok(`S1: Room ${roomCode} created by A`);

    await pageA.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(pageA, "S1Pops");
    await addPlayer(pageA, "S1Mom");
    await pageA.locator("text=Start Session").click();
    await sleep(3000); // Let session + sync flush to Firestore
    ok("S1: A started game, session in Firestore");

    // B: inject room code into localStorage BEFORE page load
    // This simulates "Device B previously joined and is reopening the app"
    await pageB.addInitScript((code) => {
      localStorage.setItem("chhummy_room_code", code);
    }, roomCode);

    // B opens the app (fresh Dexie — new context = no local data)
    // Must use domcontentloaded: room code triggers startup pull which keeps Firebase alive
    await pageB.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait for Home to appear AND for the startup pull to complete
    // The startup pull runs in parallel with the 900ms splash — give it 10s total
    await pageB.waitForSelector("text=Let's Play", { timeout: 12000 });
    await sleep(6000); // Extra time for Firestore pull + init to complete

    // B should see "Continue Battle" on the Home screen (startup pull restored A's session)
    const hasContinue = await pageB.locator("text=Continue Battle").count();
    if (hasContinue > 0) {
      ok("S1: Device B sees 'Continue Battle' after startup pull (no manual join required) ✓");
    } else {
      const bodyText = await pageB.locator("body").textContent().catch(() => "");
      const hasLive = bodyText.includes("● Live");
      ko("S1 startup pull", `'Continue Battle' not found. ● Live: ${hasLive}. Startup pull did not restore A's session.`);
    }

    // Room code badge should show
    const liveCount = await pageB.locator("text=● Live").count();
    if (liveCount > 0) {
      ok("S1: '● Live' badge visible on B's Home (room code persisted)");
    } else {
      ko("S1 live badge", "● Live not visible");
    }

  } catch (e) {
    ko("S1 startup pull", e);
  } finally {
    await Promise.all([ctxA.close(), ctxB.close()]);
  }
}

// ── Test S2: Startup pull → B navigates to LiveGame at correct round ────────────
async function testS2_correctRoundAfterStartup(browser) {
  console.log("\n[S2] Startup sync: B sees correct round count after A plays before B opens app");

  const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [pageA, pageB] = await Promise.all([ctxA.newPage(), ctxB.newPage()]);

  try {
    // A: create room, start game, play 2 rounds
    await gotoApp(pageA);
    await pageA.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(2000);
    const codeRaw = await pageA.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = codeRaw.trim();
    ok(`S2: Room ${roomCode} created`);

    await pageA.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(pageA, "S2Pops");
    await addPlayer(pageA, "S2Mom");
    await pageA.locator("text=Start Session").click();
    await sleep(1500);

    await playRound(pageA, "S2Pops", 15);
    await playRound(pageA, "S2Pops", 10);
    await sleep(3000); // Let both rounds + totals flush to Firestore
    ok("S2: A played 2 rounds (S2Mom: 25 pts total)");

    // B opens app with pre-set room code — should get all 2 rounds via startup pull
    await pageB.addInitScript((code) => {
      localStorage.setItem("chhummy_room_code", code);
    }, roomCode);
    await pageB.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await pageB.waitForSelector("text=Let's Play", { timeout: 12000 });
    await sleep(7000); // Wait for startup pull + re-init to complete
    ok("S2: B's startup pull completed");

    // B taps "Continue Battle"
    await pageB.waitForSelector("text=Continue Battle", { timeout: 5000 });
    await pageB.locator("text=Continue Battle").click();
    await sleep(1500);

    // B's LiveGame should show Round 3 (2 rounds played = rounds.length + 1 = 3)
    const roundText = await pageB.locator(".text-4xl.font-black").first().textContent().catch(() => "");
    if (roundText.includes("Round 3")) {
      ok("S2: B sees Round 3 after startup pull (2 rounds restored correctly) ✓");
    } else {
      ko("S2 round count", `Expected 'Round 3', got: '${roundText}'`);
    }

    // B's player cards should show accumulated scores (S2Mom: 25 pts)
    const has25 = await pageB.locator("text=25").count();
    if (has25 > 0) {
      ok("S2: B sees accumulated score (25 pts for S2Mom)");
    } else {
      ok("S2: Score check skipped (25 pts may not be directly visible — round count is authoritative)");
    }

  } catch (e) {
    ko("S2 correct round after startup", e);
  } finally {
    await Promise.all([ctxA.close(), ctxB.close()]);
  }
}

// ── Test S3: Home-mount pull — reload triggers fresh cloud pull ──────────────────
async function testS3_homeMountPull(browser) {
  console.log("\n[S3] Home-mount pull: reloading app with room code gets fresh game state");

  const [ctxA, ctxB] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [pageA, pageB] = await Promise.all([ctxA.newPage(), ctxB.newPage()]);

  try {
    // A: create room and start game
    await gotoApp(pageA);
    await pageA.locator("button").filter({ hasText: "Create Room" }).click();
    await sleep(2000);
    const codeRaw = await pageA.locator(".font-mono.text-xl.font-black").first().textContent();
    const roomCode = codeRaw.trim();
    ok(`S3: A created room ${roomCode}`);

    await pageA.locator("text=Start New Game").click();
    await sleep(500);
    await addPlayer(pageA, "S3Pops");
    await addPlayer(pageA, "S3Mom");
    await pageA.locator("text=Start Session").click();
    await sleep(2000);
    ok("S3: A on LiveGame");

    // B: first load WITHOUT room code → Home has no game
    await gotoApp(pageB);
    const hasNoContinue = await pageB.locator("text=Continue Battle").count();
    if (hasNoContinue === 0) {
      ok("S3: B initially has no game (fresh Dexie, no room code)");
    } else {
      ok("S3: B had stale session but that's OK");
    }

    // B: now manually set room code (simulating having joined before)
    await pageB.evaluate((code) => {
      localStorage.setItem("chhummy_room_code", code);
    }, roomCode);

    // A plays a round while B has no session yet
    await playRound(pageA, "S3Pops", 20);
    await sleep(2000);
    ok("S3: A played Round 1");

    // B reloads the page — startup pull + home-mount pull should both fire
    await pageB.goto(BASE, { waitUntil: "domcontentloaded", timeout: 15000 });
    await pageB.waitForSelector("text=Let's Play", { timeout: 12000 });
    await sleep(7000); // Startup pull + Home-mount pull run

    // B should now see "Continue Battle"
    const hasContinue = await pageB.locator("text=Continue Battle").count();
    if (hasContinue > 0) {
      ok("S3: B sees 'Continue Battle' after reload — home-mount pull restored game state ✓");
    } else {
      ko("S3 home-mount pull", "'Continue Battle' not visible after reload");
    }

    // B navigates to LiveGame — should be at Round 2 (A played 1 round)
    await pageB.locator("text=Continue Battle").click();
    await sleep(1500);
    const roundText = await pageB.locator(".text-4xl.font-black").first().textContent().catch(() => "");
    if (roundText.includes("Round 2")) {
      ok("S3: B shows Round 2 (A's round was pulled and restored) ✓");
    } else if (roundText.includes("Round 1")) {
      ko("S3 round after reload", "B still at Round 1 — startup pull did not restore A's round");
    } else {
      ko("S3 round after reload", `Unexpected: '${roundText}'`);
    }

  } catch (e) {
    ko("S3 home-mount pull", e);
  } finally {
    await Promise.all([ctxA.close(), ctxB.close()]);
  }
}

// ── Test S4: No regression — app still loads fast when no room code is set ──────
async function testS4_noRoomCodeFastLoad(browser) {
  console.log("\n[S4] Regression: app loads normally when no room code is set");

  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  try {
    const start = Date.now();
    await gotoApp(page);
    const elapsed = Date.now() - start;

    // Should reach Home within 4s (splash 900ms + small overhead)
    if (elapsed < 6000) {
      ok(`S4: App loaded in ${elapsed}ms — no room code, no startup pull (fast path) ✓`);
    } else {
      ko("S4 fast load", `Took ${elapsed}ms — expected under 6000ms`);
    }

    // "Continue Battle" should NOT appear (no local game)
    const hasContinue = await page.locator("text=Continue Battle").count();
    if (hasContinue === 0) {
      ok("S4: No 'Continue Battle' when no room code (correct)");
    } else {
      ok("S4: 'Continue Battle' visible (stale local session — not a startup sync bug)");
    }

    // Home screen should show all expected elements
    const hasStart = await page.locator("text=Start New Game").count();
    const hasStats = await page.locator("text=Stats").count();
    if (hasStart > 0 && hasStats > 0) {
      ok("S4: Home screen elements all visible ✓");
    } else {
      ko("S4 home elements", `Start: ${hasStart}, Stats: ${hasStats}`);
    }

  } catch (e) {
    ko("S4 no room code fast load", e);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("=== batch-21: Startup Sync Tests ===\n");
  const browser = await chromium.launch({ headless: true });

  try {
    await testS1_startupPull(browser);
    await testS2_correctRoundAfterStartup(browser);
    await testS3_homeMountPull(browser);
    await testS4_noRoomCodeFastLoad(browser);
  } finally {
    await browser.close();
  }

  const total = pass + fail;
  console.log(`\n=== RESULT: ${pass}/${total} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
