/**
 * Double-Write Prevention & Multi-Device Sync Tests
 *
 * DW1  Composite Firestore doc ID: after Round 1, rounds collection has exactly 1 doc with composite key
 * DW2  3-device bidirectional play: no duplicate rounds on any device
 * DW3  Late joiner after 2 rounds: gets exactly 2 rounds via pullFromCloud, no duplicates
 * DW4  Injected duplicate round (same number, different ID) via REST -> ingestCloudRound drops it
 * DW5  6-device fan-out: A plays, B-F all receive exactly 1 round
 * DW6  Alternating A/B play: round sequence 1,2,3 with no gaps or duplicates
 */

import { chromium } from "playwright";

const BASE = "http://localhost:5173";
const FIREBASE_API_KEY = "AIzaSyCZDaVKefU0UwBy-y8Kj5FE2t3eJKhW1gs";
const FIREBASE_PROJECT = "chummyscoretracker";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
let browser;

function assert(cond, msg) {
  if (!cond) {
    console.error("  FAIL: " + msg);
    failed++;
    throw new Error("FAIL: " + msg);
  }
  console.log("  OK: " + msg);
  passed++;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────

async function firestoreList(path) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT +
    "/databases/(default)/documents/" +
    path +
    "?key=" +
    FIREBASE_API_KEY;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.documents || [];
}

async function firestoreWrite(path, fields) {
  const url =
    "https://firestore.googleapis.com/v1/projects/" +
    FIREBASE_PROJECT +
    "/databases/(default)/documents/" +
    path +
    "?key=" +
    FIREBASE_API_KEY;
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error("Firestore WRITE failed: " + res.status + " " + (await res.text()));
  return res.json();
}

function docNameToId(name) {
  return name.split("/").pop();
}

// ── Playwright helpers ────────────────────────────────────────────────────────

async function waitOverlayGone(page) {
  await page
    .waitForFunction(() => !document.querySelector(".fixed.inset-0.z-50"), { timeout: 5000 })
    .catch(() => {});
}

async function goHome(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  await sleep(1500);
  await page.waitForSelector("text=Start New Game", { timeout: 8000 });
}

// Create room from HOME page. Returns the 6-char room code.
// MUST be called before startGame so sync is active when rounds are played.
async function createRoom(page) {
  await page.locator("text=Create Room").click();
  await sleep(500);
  // Room code appears in .font-mono.font-black
  const codeEl = page.locator(".font-mono.font-black");
  await codeEl.waitFor({ timeout: 5000 });
  const code = (await codeEl.textContent()).trim();
  assert(code.length === 6, "createRoom: got 6-char code: " + code);
  return code;
}

async function addPlayer(page, name) {
  await page.locator("button:has-text('+ Add Player')").click();
  await page.locator("input[placeholder='Naam likhna yahan...']").fill(name);
  await page.locator("button").filter({ hasText: /^Add$/ }).click();
  await sleep(300);
}

async function startGame(page, playerNames) {
  await page.locator("button:has-text('Start New Game')").click();
  await page.waitForSelector("button:has-text('+ Add Player')", { timeout: 5000 });
  for (const name of playerNames) await addPlayer(page, name);
  await page.locator("button:has-text('Start Session')").click();
  await page.waitForSelector("text=Round 1", { timeout: 8000 });
  await sleep(600);
}

async function clickChip(page, playerName, score) {
  const overlay = page.locator(".fixed.inset-0.z-50");
  await overlay
    .locator("div.rounded-2xl")
    .filter({ hasText: new RegExp(playerName) })
    .locator("button.rounded-xl")
    .filter({ hasText: new RegExp("^" + score + "$") })
    .first()
    .click();
  await sleep(100);
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
  await sleep(700);
}

async function joinRoom(page, code) {
  await page.locator("text=Join Room").click();
  await sleep(300);
  const joinInput = page.locator("input[placeholder='Room code']");
  await joinInput.waitFor({ timeout: 5000 });
  await joinInput.fill(code);
  await sleep(200);
  await page.locator("button.bg-green-600").click();
  // Wait for pull to complete (join modal closes when pullFromCloud finishes)
  await page.waitForFunction(() => !document.querySelector("input[placeholder='Room code']"), { timeout: 12000 });
  await sleep(1500);
}

// Round N confirmed means header shows "Round N+1"
async function getRoundCount(page) {
  const header = await page
    .locator("text=Round")
    .first()
    .textContent({ timeout: 3000 })
    .catch(() => "Round 1");
  const m = header.match(/Round\s+(\d+)/i);
  return m ? Number(m[1]) - 1 : 0;
}

// ── Test runner ───────────────────────────────────────────────────────────────

async function runTest(name, fn) {
  console.log("\n[TEST] " + name);
  try {
    await fn();
    console.log("  -> PASSED");
  } catch (e) {
    if (!e.message.startsWith("FAIL:")) {
      console.error("  ERROR: " + e.message.slice(0, 300));
      failed++;
    }
  }
}

// ── DW1: Composite Firestore doc ID ──────────────────────────────────────────

async function testDW1() {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await ctxA.newPage();
  try {
    await goHome(pageA);
    // Create room FIRST so sync is active before any rounds
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta"]);
    await sleep(1500); // subscription established

    await playRound(pageA, "Alpha", { Beta: 5 });
    await waitOverlayGone(pageA);
    await sleep(5000); // Firestore write confirm + settle

    const docs = await firestoreList("families/" + code + "/rounds");
    assert(docs.length === 1, "DW1: Exactly 1 Firestore doc for Round 1 (got " + docs.length + ")");

    const docId = docNameToId(docs[0].name);
    assert(docId.includes("_"), "DW1: Doc ID uses composite key (has underscore): " + docId);
    assert(docId.endsWith("_1"), "DW1: Doc ID ends with _1 for Round 1: " + docId);
    console.log("  info: composite doc ID = " + docId);
  } finally {
    await ctxA.close();
  }
}

// ── DW2: 3-device bidirectional sync, no duplicates ──────────────────────────

async function testDW2() {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  const pageC = await ctxC.newPage();
  try {
    await goHome(pageA);
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta", "Gamma"]);
    await sleep(1500);

    // B and C join
    await goHome(pageB);
    await joinRoom(pageB, code);
    await goHome(pageC);
    await joinRoom(pageC, code);

    // Both navigate to LiveGame
    await pageB.locator("text=Continue Battle").click();
    await pageB.waitForSelector("text=Round 1", { timeout: 10000 });
    await pageC.locator("text=Continue Battle").click();
    await pageC.waitForSelector("text=Round 1", { timeout: 10000 });
    await sleep(2500);

    // A plays Round 1
    await playRound(pageA, "Alpha", { Beta: 10, Gamma: 5 });
    await waitOverlayGone(pageA);
    await Promise.all([
      pageB.waitForSelector("text=Round 2", { timeout: 15000 }),
      pageC.waitForSelector("text=Round 2", { timeout: 15000 }),
    ]);

    assert((await getRoundCount(pageA)) === 1, "DW2: After Round 1 — A has 1 round");
    assert((await getRoundCount(pageB)) === 1, "DW2: After Round 1 — B has 1 round");
    assert((await getRoundCount(pageC)) === 1, "DW2: After Round 1 — C has 1 round");

    // B plays Round 2 (bidirectional)
    await playRound(pageB, "Beta", { Alpha: 15, Gamma: 5 });
    await waitOverlayGone(pageB);
    await Promise.all([
      pageA.waitForSelector("text=Round 3", { timeout: 15000 }),
      pageC.waitForSelector("text=Round 3", { timeout: 15000 }),
    ]);

    assert((await getRoundCount(pageA)) === 2, "DW2: After Round 2 — A has 2 rounds");
    assert((await getRoundCount(pageB)) === 2, "DW2: After Round 2 — B has 2 rounds");
    assert((await getRoundCount(pageC)) === 2, "DW2: After Round 2 — C has 2 rounds");

    await sleep(2000);
    const docs = await firestoreList("families/" + code + "/rounds");
    assert(docs.length === 2, "DW2: Firestore has exactly 2 round docs (got " + docs.length + ")");
    const ids = docs.map((d) => docNameToId(d.name));
    assert(
      ids.every((id) => id.includes("_")),
      "DW2: All Firestore docs use composite key: " + ids.join(", ")
    );
  } finally {
    await ctxA.close();
    await ctxB.close();
    await ctxC.close();
  }
}

// ── DW3: Late joiner sees no duplicates ──────────────────────────────────────

async function testDW3() {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  try {
    await goHome(pageA);
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta"]);
    await sleep(1500);

    // A plays 2 rounds BEFORE B joins
    await playRound(pageA, "Alpha", { Beta: 5 });
    await waitOverlayGone(pageA);
    await sleep(3500);
    await playRound(pageA, "Alpha", { Beta: 10 });
    await waitOverlayGone(pageA);
    await sleep(5000); // both rounds confirmed in Firestore

    // B joins late
    await goHome(pageB);
    await joinRoom(pageB, code);
    await pageB.locator("text=Continue Battle").click();
    await pageB.waitForSelector("text=Round 3", { timeout: 12000 });

    const countB = await getRoundCount(pageB);
    assert(countB === 2, "DW3: Late joiner B has exactly 2 rounds — no duplicates (got " + countB + ")");

    const docs = await firestoreList("families/" + code + "/rounds");
    assert(docs.length === 2, "DW3: Firestore has exactly 2 round docs (got " + docs.length + ")");
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
}

// ── DW4: Injected duplicate Round 1 is rejected by ingestCloudRound ──────────

async function testDW4() {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await ctxA.newPage();
  try {
    await goHome(pageA);
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta"]);
    await sleep(1500);

    await playRound(pageA, "Alpha", { Beta: 5 });
    await waitOverlayGone(pageA);
    await sleep(5000);

    const docsBefore = await firestoreList("families/" + code + "/rounds");
    assert(docsBefore.length === 1, "DW4: 1 round doc before injection (got " + docsBefore.length + ")");

    // Extract sessionId from composite doc ID: "{sessionId}_1"
    const compositeId = docNameToId(docsBefore[0].name);
    const sessionId = compositeId.slice(0, compositeId.lastIndexOf("_"));

    // Inject a DUPLICATE Round 1 under a different (nanoid-style) document key.
    // This simulates the pre-fix scenario: two devices both wrote Round 1 before
    // either received the other's onSnapshot — resulting in two Firestore docs
    // for the same round number.
    const fakeDocId = "aaabbbcccdddeee000111222";
    await firestoreWrite("families/" + code + "/rounds/" + fakeDocId, {
      id: { stringValue: fakeDocId },
      sessionId: { stringValue: sessionId },
      number: { integerValue: "1" },
      closerId: { stringValue: "fake-closer-id" },
      scores: { mapValue: { fields: {} } },
      totals: { mapValue: { fields: {} } },
      createdAt: { integerValue: String(Date.now()) },
    });
    console.log("  info: injected fake Round 1 doc: " + fakeDocId);

    // Wait for onSnapshot to fire on Device A (Firestore "added" event)
    await sleep(7000);

    // A must still show "Round 2" header — duplicate was rejected by number-based dedup
    const header = await pageA
      .locator("text=Round")
      .first()
      .textContent({ timeout: 3000 })
      .catch(() => "?");
    assert(
      header.includes("Round 2"),
      "DW4: A still shows Round 2 after duplicate injection (got: " + header + ")"
    );

    const countA = await getRoundCount(pageA);
    assert(countA === 1, "DW4: A has exactly 1 round — duplicate dropped (got " + countA + ")");
  } finally {
    await ctxA.close();
  }
}

// ── DW5: 6-device fan-out, A plays, B-F receive exactly 1 round ──────────────

async function testDW5() {
  const ctxs = await Promise.all(
    Array.from({ length: 6 }, () => browser.newContext({ viewport: { width: 390, height: 844 } }))
  );
  const pages = await Promise.all(ctxs.map((c) => c.newPage()));
  const [pageA, pageB, pageC, pageD, pageE, pageF] = pages;
  try {
    await goHome(pageA);
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta"]);
    await sleep(1500);

    // B-F join sequentially (avoid parallel join race)
    for (const p of [pageB, pageC, pageD, pageE, pageF]) {
      await goHome(p);
      await joinRoom(p, code);
    }

    // Navigate all to LiveGame
    for (const p of [pageB, pageC, pageD, pageE, pageF]) {
      await p.locator("text=Continue Battle").click();
      await p.waitForSelector("text=Round 1", { timeout: 12000 });
    }
    await sleep(3000); // all subscriptions settle

    // A plays Round 1 (all 6 players)
    await playRound(pageA, "Alpha", { Beta: 5, Gamma: 10, Delta: 15, Epsilon: 20, Zeta: 25 });
    await waitOverlayGone(pageA);

    // All joined devices receive Round 1
    await Promise.all(
      [pageB, pageC, pageD, pageE, pageF].map((p) =>
        p.waitForSelector("text=Round 2", { timeout: 20000 })
      )
    );

    const labels = ["A", "B", "C", "D", "E", "F"];
    for (let i = 0; i < 6; i++) {
      const c = await getRoundCount(pages[i]);
      assert(c === 1, "DW5: Device " + labels[i] + " has exactly 1 round (got " + c + ")");
    }

    await sleep(2000);
    const docs = await firestoreList("families/" + code + "/rounds");
    assert(docs.length === 1, "DW5: Firestore has exactly 1 round doc across 6 devices (got " + docs.length + ")");
  } finally {
    await Promise.all(ctxs.map((c) => c.close()));
  }
}

// ── DW6: Alternating A/B play — sequence 1,2,3 no gaps or dups ───────────────

async function testDW6() {
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  try {
    await goHome(pageA);
    const code = await createRoom(pageA);
    await sleep(500);
    await startGame(pageA, ["Alpha", "Beta"]);
    await sleep(1500);

    await goHome(pageB);
    await joinRoom(pageB, code);
    await pageB.locator("text=Continue Battle").click();
    await pageB.waitForSelector("text=Round 1", { timeout: 10000 });
    await sleep(2000);

    // Round 1: A plays
    await playRound(pageA, "Alpha", { Beta: 5 });
    await waitOverlayGone(pageA);
    await pageB.waitForSelector("text=Round 2", { timeout: 12000 });
    assert((await getRoundCount(pageA)) === 1, "DW6: After R1 — A has 1 round");
    assert((await getRoundCount(pageB)) === 1, "DW6: After R1 — B has 1 round");

    // Round 2: B plays
    await playRound(pageB, "Beta", { Alpha: 10 });
    await waitOverlayGone(pageB);
    await pageA.waitForSelector("text=Round 3", { timeout: 12000 });
    assert((await getRoundCount(pageA)) === 2, "DW6: After R2 — A has 2 rounds");
    assert((await getRoundCount(pageB)) === 2, "DW6: After R2 — B has 2 rounds");

    // Round 3: A plays
    await playRound(pageA, "Alpha", { Beta: 5 });
    await waitOverlayGone(pageA);
    await pageB.waitForSelector("text=Round 4", { timeout: 12000 });
    assert((await getRoundCount(pageA)) === 3, "DW6: After R3 — A has 3 rounds");
    assert((await getRoundCount(pageB)) === 3, "DW6: After R3 — B has 3 rounds");

    await sleep(2000);
    const docs = await firestoreList("families/" + code + "/rounds");
    assert(docs.length === 3, "DW6: Firestore has exactly 3 round docs (got " + docs.length + ")");
    const ids = docs.map((d) => docNameToId(d.name)).sort();
    assert(ids.some((id) => id.endsWith("_1")), "DW6: Round 1 doc exists in Firestore");
    assert(ids.some((id) => id.endsWith("_2")), "DW6: Round 2 doc exists in Firestore");
    assert(ids.some((id) => id.endsWith("_3")), "DW6: Round 3 doc exists in Firestore");
    console.log("  info: doc IDs = " + ids.join(", "));
  } finally {
    await ctxA.close();
    await ctxB.close();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  browser = await chromium.launch({ headless: true });
  console.log("=== Double-Write Prevention & Multi-Device Sync Tests ===");

  await runTest("DW1: Composite Firestore doc ID (no nanoid key)", testDW1);
  await runTest("DW2: 3-device bidirectional sync — no duplicates", testDW2);
  await runTest("DW3: Late joiner — exactly 2 rounds via pullFromCloud", testDW3);
  await runTest("DW4: Injected duplicate rejected by ingestCloudRound", testDW4);
  await runTest("DW5: 6-device fan-out — all devices get exactly 1 round", testDW5);
  await runTest("DW6: Alternating play — sequence 1,2,3 no gaps or dups", testDW6);

  await browser.close();
  console.log("\n" + "=".repeat(50));
  console.log("Results: " + passed + " passed, " + failed + " failed");
  console.log("=".repeat(50));
  process.exit(failed > 0 ? 1 : 0);
})();
