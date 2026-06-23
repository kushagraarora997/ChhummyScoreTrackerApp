/**
 * Firebase Phase 2 E2E Test — Real-time onSnapshot sync
 * Tests: ● Live indicator, cross-device round propagation via onSnapshot
 * Run: node firebase-phase2-e2e.mjs (dev server on port 5173)
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
let pass = 0, fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, err) { console.log(`  ❌ ${label}: ${err}`); fail++; }
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function passSplash(page) {
  await page.waitForSelector("text=Let's Play", { timeout: 3000 }).catch(() => {});
  await sleep(200);
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Phase 2 real-time sync via onSnapshot
// Device A creates room + plays round; Device B sees the update live
// ─────────────────────────────────────────────────────────────────────────────
async function test5_realtimeSync(browser) {
  console.log("\n[Test 5] Phase 2: Real-time round sync across devices");

  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  let roomCode = null;

  try {
    // ── DEVICE A: Create room + start game ───────────────────────────────────
    await pageA.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500); // splash

    await pageA.locator("text=Create Room").click();
    await sleep(400);
    const codeEl = pageA.locator(".font-mono.font-black");
    await codeEl.waitFor({ timeout: 3000 });
    roomCode = (await codeEl.textContent()).trim();
    ok(`Device A: Room created — code ${roomCode}`);

    await pageA.locator("text=Start New Game").click();
    await sleep(500);

    // Add two players
    await pageA.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    const nameInput = pageA.locator("input[maxlength='20']").first();
    await nameInput.fill("SyncPops");
    await pageA.locator("text=Add").last().click();
    await sleep(300);

    await pageA.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    await nameInput.fill("SyncMom");
    await pageA.locator("text=Add").last().click();
    await sleep(300);

    await pageA.locator("text=Start Session").click();
    await sleep(1500); // LiveGame loads + session synced to Firestore
    ok("Device A: LiveGame loaded");

    // ── DEVICE B: Join room via room code ────────────────────────────────────
    await pageB.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500); // splash

    await pageB.locator("text=Join Room").click();
    await sleep(300);
    const joinInput = pageB.locator("input[placeholder='Room code']");
    await joinInput.waitFor({ timeout: 3000 });
    await joinInput.fill(roomCode);
    await sleep(200);
    await pageB.locator("button.bg-green-600").click();
    await sleep(4000); // pull + init
    ok("Device B: Joined room, data pulled");

    // Device B clicks Continue Battle to enter LiveGame
    await pageB.waitForSelector("text=Continue Battle", { timeout: 5000 });
    await pageB.locator("text=Continue Battle").click();
    await sleep(1000);
    ok("Device B: Navigated to LiveGame via Resume");

    // Both should show Round 1 (no rounds yet)
    const r1A = await pageA.locator(".text-4xl.font-black").textContent().catch(() => "");
    const r1B = await pageB.locator(".text-4xl.font-black").textContent().catch(() => "");
    if (r1A?.includes("Round 1")) ok(`Device A: Shows Round 1`);
    else ko("Device A round", `got: '${r1A}'`);
    if (r1B?.includes("Round 1")) ok(`Device B: Shows Round 1`);
    else ko("Device B round", `got: '${r1B}'`);

    // ── ● Live indicator check ───────────────────────────────────────────────
    const liveA = await pageA.locator("text=● Live").count();
    const liveB = await pageB.locator("text=● Live").count();
    if (liveA > 0) ok("Device A: ● Live indicator visible");
    else ko("Device A ● Live", "not found");
    if (liveB > 0) ok("Device B: ● Live indicator visible");
    else ko("Device B ● Live", "not found");

    // ── DEVICE A: Confirm round 1 ────────────────────────────────────────────
    await pageA.locator("text=End Round").click();
    await sleep(400);

    await pageA.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
    await pageA.locator("button:has-text('SyncPops')").click();
    await sleep(400);

    await pageA.waitForSelector("text=Confirm Round", { timeout: 5000 });

    // SyncPops (closer) chip 0
    await pageA.locator("button.rounded-xl").filter({ hasText: /^0$/ }).first().click();
    await sleep(200);
    // SyncMom chip 15
    await pageA.locator("button.rounded-xl").filter({ hasText: /^15$/ }).first().click();
    await sleep(200);

    await pageA.locator("text=Confirm Round").click();
    await sleep(400);
    ok("Device A: Round 1 confirmed");

    // Wait for Firestore → onSnapshot propagation on Device B
    await sleep(4000);

    // ── DEVICE B: Verify round received via onSnapshot ───────────────────────
    const r2B = await pageB.locator(".text-4xl.font-black").textContent().catch(() => "");
    if (r2B?.includes("Round 2")) {
      ok("Device B: Real-time sync ✓ — shows Round 2 after Device A confirmed round 1");
    } else {
      ko("Device B real-time sync", `expected 'Round 2', got: '${r2B}'`);
    }

    // Device A should also show Round 2
    const r2A = await pageA.locator(".text-4xl.font-black").textContent().catch(() => "");
    if (r2A?.includes("Round 2")) ok("Device A: Shows Round 2 (local state)");
    else ko("Device A round after confirm", `got: '${r2A}'`);

  } catch (e) {
    ko("Phase 2 real-time sync", e.message);
    console.error(e);
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: ● Live hidden when no room code (no sync)
// ─────────────────────────────────────────────────────────────────────────────
async function test6_noLiveIndicatorWithoutRoom(browser) {
  console.log("\n[Test 6] No ● Live indicator when no room code set");

  const ctx = await browser.newContext(); // fresh context = no room code
  const page = await ctx.newPage();

  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1500);

    // Start a game without creating a room
    await page.locator("text=Start New Game").click();
    await sleep(500);

    await page.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    const nameInput = page.locator("input[maxlength='20']").first();
    await nameInput.fill("LocalPops");
    await page.locator("text=Add").last().click();
    await sleep(300);

    await page.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    await nameInput.fill("LocalMom");
    await page.locator("text=Add").last().click();
    await sleep(300);

    await page.locator("text=Start Session").click();
    await sleep(800);

    const liveCount = await page.locator("text=● Live").count();
    if (liveCount === 0) ok("No ● Live indicator without room code (local-only game)");
    else ko("● Live indicator", `should be hidden, found ${liveCount} instances`);

  } catch (e) {
    ko("No-room code live indicator test", e.message);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("=== Firebase Phase 2 E2E Test ===");
  const browser = await chromium.launch({ headless: true });

  try {
    await test5_realtimeSync(browser);
    await test6_noLiveIndicatorWithoutRoom(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
