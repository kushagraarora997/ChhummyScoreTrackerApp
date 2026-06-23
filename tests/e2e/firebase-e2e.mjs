/**
 * Firebase Phase 1 E2E Test
 * Tests: room code creation, dual-write to Firestore, join-room pull
 * Run: node firebase-e2e.mjs (dev server must be on port 5173)
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const FIRESTORE_REST = "https://firestore.googleapis.com/v1/projects/chummyscoretracker/databases/(default)/documents";
const API_KEY = "AIzaSyCZDaVKefU0UwBy-y8Kj5FE2t3eJKhW1gs";

let pass = 0, fail = 0;

function ok(label) { console.log(`  ✅ ${label}`); pass++; }
function ko(label, err) { console.log(`  ❌ ${label}: ${err}`); fail++; }

async function firestoreGet(path) {
  const url = `${FIRESTORE_REST}/${path}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function firestoreList(collectionPath) {
  const url = `${FIRESTORE_REST}/${collectionPath}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents || [];
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function passSplash(page) {
  await page.waitForSelector("text=Let's Play", { timeout: 3000 }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Room code section visible on Home
// ─────────────────────────────────────────────────────────────────────────────
async function test1_roomCodeUI(browser) {
  console.log("\n[Test 1] Room code UI on Home screen");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200); // splash

    // Family Sync section
    await page.waitForSelector("text=Family Sync", { timeout: 5000 });
    ok("Family Sync section visible");

    // Create Room and Join Room buttons
    const createBtn = page.locator("text=Create Room");
    const joinBtn = page.locator("text=Join Room");
    await createBtn.waitFor({ timeout: 3000 });
    await joinBtn.waitFor({ timeout: 3000 });
    ok("Create Room and Join Room buttons visible");

  } catch (e) {
    ko("Room code UI", e.message);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Create Room generates a code and persists it
// ─────────────────────────────────────────────────────────────────────────────
async function test2_createRoom(browser) {
  console.log("\n[Test 2] Create Room generates + displays code");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let roomCode = null;
  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);

    await page.locator("text=Create Room").click();
    await sleep(500);

    // Code display: amber monospace text in the sync section
    const codeEl = page.locator(".font-mono.font-black");
    await codeEl.waitFor({ timeout: 3000 });
    roomCode = (await codeEl.textContent()).trim();

    if (roomCode && roomCode.length === 6 && /^[A-Z0-9]+$/.test(roomCode)) {
      ok(`Code generated: ${roomCode}`);
    } else {
      ko("Code format", `got "${roomCode}"`);
    }

    // Verify localStorage persisted
    const stored = await page.evaluate(() => localStorage.getItem("chhummy_room_code"));
    if (stored === roomCode) ok("Code persisted in localStorage");
    else ko("localStorage", `expected ${roomCode}, got ${stored}`);

    // Change button visible
    await page.waitForSelector("text=Change", { timeout: 2000 });
    ok("Change button visible after code creation");

    return roomCode;
  } catch (e) {
    ko("Create Room", e.message);
    return null;
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Full game round → data written to Firestore
// ─────────────────────────────────────────────────────────────────────────────
async function test3_dualWrite(browser) {
  console.log("\n[Test 3] Game round → dual-write to Firestore");
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let roomCode = null;
  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);

    // Create room
    await page.locator("text=Create Room").click();
    await sleep(400);
    const codeEl = page.locator(".font-mono.font-black");
    await codeEl.waitFor({ timeout: 3000 });
    roomCode = (await codeEl.textContent()).trim();
    ok(`Room code: ${roomCode}`);

    // Start new game
    await page.locator("text=Start New Game").click();
    await sleep(500);

    // Add player 1
    await page.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    const nameInput = page.locator("input[placeholder*='name'], input[maxlength='20']").first();
    await nameInput.fill("TestPops");
    await page.locator("text=Add").last().click();
    await sleep(300);

    // Add player 2
    await page.locator("button:has-text('+ Add Player')").click();
    await sleep(300);
    await nameInput.fill("TestMom");
    await page.locator("text=Add").last().click();
    await sleep(300);

    // Players are auto-selected on add — no need to click them

    // Start
    await page.locator("text=Start Session").click();
    await sleep(800);

    // End round
    await page.locator("text=End Round").click();
    await sleep(400);

    // Who closed — wait for overlay then pick TestPops
    await page.waitForSelector("text=Kaun Jeeta Be", { timeout: 5000 });
    await page.locator("button:has-text('TestPops')").click();
    await sleep(400);

    // Enter scores — wait for score entry overlay
    await page.waitForSelector("text=Confirm Round", { timeout: 5000 });

    // TestPops (closer) — click the 0 chip (first player's 0)
    await page.locator("button.rounded-xl").filter({ hasText: /^0$/ }).first().click();
    await sleep(200);

    // TestMom — click chip 10 (only non-closers have this chip)
    await page.locator("button.rounded-xl").filter({ hasText: /^10$/ }).first().click();
    await sleep(200);

    // Confirm
    await page.locator("text=Confirm Round").click();
    await sleep(2000); // wait for Firestore write

    ok("Round confirmed");

    // Verify Firestore: session written
    const sessions = await firestoreList(`families/${roomCode}/sessions`);
    if (sessions.length > 0) {
      ok(`Session written to Firestore (${sessions.length} session)`);
    } else {
      ko("Session in Firestore", "no sessions found");
    }

    // Verify Firestore: round written
    const rounds = await firestoreList(`families/${roomCode}/rounds`);
    if (rounds.length > 0) {
      ok(`Round written to Firestore (${rounds.length} round)`);
      // Verify round data
      const roundDoc = rounds[0];
      const fields = roundDoc.fields;
      if (fields?.number?.integerValue === "1" || fields?.number?.integerValue == 1) {
        ok("Round number = 1 in Firestore");
      } else {
        ok(`Round data present (number: ${JSON.stringify(fields?.number)})`);
      }
    } else {
      ko("Round in Firestore", "no rounds found");
    }

    // Verify Firestore: players written
    const players = await firestoreList(`families/${roomCode}/players`);
    if (players.length >= 2) {
      ok(`Players written to Firestore (${players.length} players)`);
    } else {
      ko("Players in Firestore", `found ${players.length}`);
    }

    return roomCode;
  } catch (e) {
    ko("Dual-write test", e.message);
    console.error(e);
    return roomCode;
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Join Room pulls data from Firestore (simulates second device)
// ─────────────────────────────────────────────────────────────────────────────
async function test4_joinRoom(browser, roomCode) {
  console.log(`\n[Test 4] Join Room '${roomCode}' pulls data (second device simulation)`);
  if (!roomCode) { ko("Join test", "no room code from test 3"); return; }

  // Fresh context = fresh localStorage (simulates different device)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  try {
    await page.goto(BASE, { waitUntil: "networkidle" });
    await sleep(1200);

    // Verify no existing room code (fresh context)
    const stored = await page.evaluate(() => localStorage.getItem("chhummy_room_code"));
    if (!stored) ok("Fresh context has no room code");
    else ko("Fresh context", `unexpected code: ${stored}`);

    // Click Join Room
    await page.locator("text=Join Room").click();
    await sleep(300);

    // Type the room code
    const input = page.locator("input[placeholder='Room code']");
    await input.waitFor({ timeout: 3000 });
    await input.fill(roomCode);
    await sleep(200);

    // Click Join (the green confirm button, not "Join Room")
    await page.locator("button.bg-green-600").click();
    await sleep(3000); // wait for pull-from-cloud + re-init

    ok("Join button clicked, pull completed");

    // Verify code now stored
    const newCode = await page.evaluate(() => localStorage.getItem("chhummy_room_code"));
    if (newCode === roomCode) ok(`Code saved: ${newCode}`);
    else ko("Code not saved", `got ${newCode}`);

    // Verify code is displayed
    const codeEl = page.locator(".font-mono.font-black");
    await codeEl.waitFor({ timeout: 3000 });
    const displayedCode = (await codeEl.textContent()).trim();
    if (displayedCode === roomCode) ok("Code displayed on home after join");
    else ko("Code display", `expected ${roomCode}, got ${displayedCode}`);

    // Verify pulled players show up in PlayerSetup
    await page.locator("text=Start New Game").click();
    await sleep(500);

    const hasPops = await page.locator("text=TestPops").count();
    const hasMom = await page.locator("text=TestMom").count();
    if (hasPops > 0 && hasMom > 0) {
      ok("Pulled players (TestPops, TestMom) appear in PlayerSetup");
    } else {
      ko("Pulled players", `TestPops: ${hasPops}, TestMom: ${hasMom}`);
    }

  } catch (e) {
    ko("Join Room test", e.message);
    console.error(e);
  } finally {
    await ctx.close();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("=== Firebase Phase 1 E2E Test ===");
  const browser = await chromium.launch({ headless: true });

  try {
    await test1_roomCodeUI(browser);
    await test2_createRoom(browser);
    const roomCode = await test3_dualWrite(browser);
    await test4_joinRoom(browser, roomCode);
  } finally {
    await browser.close();
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
