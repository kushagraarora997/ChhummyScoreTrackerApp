/**
 * Chhummy Tracker — Multi-Player Test Suite
 * Tests: 2, 3, 4, 5, 6 player game scenarios
 * Covers: hero header, elimination (101+ rule), winner flow
 */
import { chromium } from 'playwright';

const PORT = 5176;
const BASE = `http://localhost:${PORT}`;
const TS   = Date.now().toString().slice(-4); // run suffix — unique player names per run

const PASS = [], FAIL = [];

function p(label, n) { return `${label}${n}_${TS}`; } // e.g. "D1_4567"

// ── result tracking ─────────────────────────────────────────────────────────
function ok(name)      { PASS.push(name);             console.log(`  ✅ ${name}`); }
function no(name, err) { FAIL.push({name, err});       console.log(`  ❌ ${name}: ${err}`); }

async function check(name, fn) {
  try   { await fn(); ok(name); }
  catch (e) { no(name, e.message ?? String(e)); }
}

// ── navigation ───────────────────────────────────────────────────────────────
async function goHome(page) {
  await page.goto(BASE);
  await page.waitForTimeout(1100);
  await page.waitForSelector('text=Start New Game', { timeout: 8000 });
}

async function openSetup(page) {
  await page.locator('button', { hasText: /Start New Game/ }).click();
  await page.waitForTimeout(400);
}

// ── player management ────────────────────────────────────────────────────────
async function addPlayer(page, name) {
  await page.locator('button', { hasText: /Add Player/ }).first().click();
  await page.waitForTimeout(300);
  await page.locator('.fixed.inset-0.z-50 input').fill(name);
  await page.waitForTimeout(80);
  // click the Add button inside the modal (not the grid Add Player button)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find(b => /^Add$/.test(b.textContent?.trim()) && b.closest('.fixed'));
    btn?.click();
  });
  await page.waitForTimeout(450);
}

async function startSession(page) {
  await page.locator('button', { hasText: /Start Session/ }).click();
  await page.waitForTimeout(700);
}

// ── game actions ─────────────────────────────────────────────────────────────
async function endRound(page) {
  await page.locator('button', { hasText: /End Round/ }).click();
  await page.waitForTimeout(700);
}

async function selectCloser(page, name) {
  await page.locator('.fixed.inset-0.z-50 button.h-32').filter({ hasText: name }).click();
  await page.waitForTimeout(600);
}

const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];

async function enterScore(page, name, score) {
  const overlay  = page.locator('.fixed.inset-0.z-50');
  const section  = overlay.locator('.rounded-2xl.bg-elevated').filter({ hasText: name });

  if (CHIPS.includes(score)) {
    const re = score === 0 ? /^0$/ : new RegExp(`^${score}$`);
    await section.locator('button').filter({ hasText: re }).first().click();
    await page.waitForTimeout(120);
  } else {
    // Custom numpad
    await section.locator('button', { hasText: 'Custom' }).click();
    await page.waitForTimeout(350);
    for (const d of String(score).split('')) {
      await page.evaluate((lbl) => {
        const btn = [...document.querySelectorAll('button')]
          .find(b => b.textContent?.trim() === lbl && b.closest('[style*="9999"]'));
        btn?.click();
      }, d);
      await page.waitForTimeout(80);
    }
    // confirm ✓
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent?.trim() === '✓' && b.closest('[style*="9999"]'));
      btn?.click();
    });
    await page.waitForTimeout(250);
  }
}

async function confirmRound(page) {
  await page.locator('button', { hasText: 'Confirm Round' }).click();
  await page.waitForTimeout(950);
}

async function clickContinue(page) {
  await page.locator('button', { hasText: 'Continue' }).click();
  await page.waitForTimeout(700);
}

// detects what happened after confirmRound
async function overlayState(page) {
  const text = await page.locator('body').textContent().catch(() => '');
  if (text.includes('Chhummy Champion')) return 'winner';
  if (text.includes('Continue'))        return 'elimination';
  return 'normal';
}

async function assertAliveCount(page, expected) {
  // Use element-specific locator — body.textContent() concatenates "Round 1" + "2 alive" → "12 alive"
  const el   = page.getByText(/\d+ alive/).first();
  const text = await el.textContent().catch(() => '');
  const match = text.match(/(\d+)\s+alive/);
  const actual = match ? parseInt(match[1]) : -1;
  if (actual !== expected) throw new Error(`Expected ${expected} alive, got "${text}"`);
}

async function assertRoundHero(page, roundNum) {
  const text = await page.locator('.text-4xl.font-black').textContent().catch(() => '');
  if (!text.includes(`Round ${roundNum}`)) throw new Error(`Expected Round ${roundNum} in hero, got: "${text}"`);
}

async function assertWinnerIs(page, name) {
  const text = await page.locator('body').textContent().catch(() => '');
  if (!text.includes(name)) throw new Error(`Winner overlay doesn't contain "${name}"`);
  if (!text.includes('Chhummy Champion')) throw new Error(`Winner overlay missing "Chhummy Champion"`);
}

async function assertEliminationModal(page, name) {
  // Elimination modal has "OUT" and the player name
  const text = await page.locator('body').textContent().catch(() => '');
  if (!text.includes('OUT'))  throw new Error('No elimination modal (missing OUT)');
  if (!text.includes(name))   throw new Error(`Elimination modal doesn't mention ${name}`);
}

async function assertPlayerStillAlive(page, name) {
  // Player should appear in hero context line as alive (not show OUT badge)
  const text = await page.locator('body').textContent().catch(() => '');
  // Check the 💀 OUT badge is NOT present next to this player
  // Simplified: just check they're not shown as eliminated in the card list
  // We'll look for the OUT badge — if player at 100, they should NOT have 💀 OUT
  const cards = await page.locator('.rounded-2xl').filter({ hasText: name }).all();
  for (const card of cards) {
    const t = await card.textContent().catch(() => '');
    if (t.includes('OUT')) throw new Error(`${name} shows OUT badge but should be alive (100 is safe)`);
  }
}

// play a complete round: closer scores 0, others get specified scores
async function round(page, closer, scores) {
  await endRound(page);
  await selectCloser(page, closer);
  await enterScore(page, closer, 0);
  for (const [name, score] of Object.entries(scores)) {
    await enterScore(page, name, score);
  }
  await confirmRound(page);
}

// ═══════════════════════════════════════════════════════════════════════════
//  2-PLAYER GAME
// ═══════════════════════════════════════════════════════════════════════════
async function test2Player(page) {
  console.log('\n━━━ 2-PLAYER GAME ━━━');
  const [A, B] = [p('D',1), p('D',2)];

  await check('2P: setup — add 2 players', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    // both auto-selected after add
    const btnText = await page.locator('button', { hasText: /Start Session/ }).textContent();
    if (!btnText.includes('2')) throw new Error(`Expected 2 selected, got: ${btnText}`);
  });

  await check('2P: start session', async () => {
    await startSession(page);
    const body = await page.locator('body').textContent();
    if (!body.includes(A)) throw new Error(`${A} not on live game screen`);
    if (!body.includes(B)) throw new Error(`${B} not on live game screen`);
  });

  await check('2P: hero header shows Round 1 + 2 alive', async () => {
    await assertRoundHero(page, 1);
    await assertAliveCount(page, 2);
  });

  await check('2P: round 1 — A closes (0), B gets 60', async () => {
    await round(page, A, { [B]: 60 });
    const state = await overlayState(page);
    if (state !== 'normal') throw new Error(`Expected normal after R1, got ${state}`);
  });

  await check('2P: after round 1 — hero shows Round 2, 1 dot', async () => {
    await assertRoundHero(page, 2);
    await assertAliveCount(page, 2);
    const dots = await page.locator('.w-1\\.5.h-1\\.5.rounded-full.bg-white\\/25').count();
    if (dots !== 1) throw new Error(`Expected 1 round dot, got ${dots}`);
  });

  await check('2P: round 2 — A closes (0), B gets 40 → B at 100 (safe!)', async () => {
    await round(page, A, { [B]: 40 });
    const state = await overlayState(page);
    if (state !== 'normal') throw new Error(`Expected normal (100 is safe), got ${state}`);
  });

  await check('2P: B at 100 is NOT eliminated (101 threshold)', async () => {
    await assertAliveCount(page, 2); // both still alive
    await assertPlayerStillAlive(page, B);
  });

  await check('2P: round 3 — A closes (0), B gets 1 → B at 101 (eliminated)', async () => {
    await round(page, A, { [B]: 1 });
    const state = await overlayState(page);
    // 2-player: no elimination modal — goes directly to winner
    if (state !== 'winner') throw new Error(`Expected winner overlay, got ${state}`);
  });

  await check('2P: winner is A (no elimination modal for 2-player)', async () => {
    await assertWinnerIs(page, A);
  });

  console.log(`  → 2P result: B hit 100 (safe), then 101 → eliminated. ${A} wins directly. ✓`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  3-PLAYER GAME
// ═══════════════════════════════════════════════════════════════════════════
async function test3Player(page) {
  console.log('\n━━━ 3-PLAYER GAME ━━━');
  const [A, B, C] = [p('T',1), p('T',2), p('T',3)];

  await check('3P: setup — add 3 players, start', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    await addPlayer(page, C);
    await startSession(page);
    const body = await page.locator('body').textContent();
    if (!body.includes(A) || !body.includes(B) || !body.includes(C))
      throw new Error('Not all 3 players on screen');
  });

  await check('3P: hero shows Round 1 + 3 alive', async () => {
    await assertRoundHero(page, 1);
    await assertAliveCount(page, 3);
  });

  await check('3P: round 1 — A=0, B=60, C=30', async () => {
    await round(page, A, { [B]: 60, [C]: 30 });
    const state = await overlayState(page);
    if (state !== 'normal') throw new Error(`Expected normal, got ${state}`);
  });

  await check('3P: round 2 — A=0, B=60, C=30 → B=120 (elim), C=60', async () => {
    await round(page, A, { [B]: 60, [C]: 30 });
    const state = await overlayState(page);
    if (state !== 'elimination') throw new Error(`Expected elimination modal, got ${state}`);
  });

  await check('3P: elimination modal shows for B', async () => {
    await assertEliminationModal(page, B);
  });

  await check('3P: click Continue — game goes on with 2 alive', async () => {
    await clickContinue(page);
    await assertAliveCount(page, 2);
    await assertRoundHero(page, 3);
  });

  await check('3P: round 3 — A=0, C=60 → C=120 → A wins', async () => {
    await round(page, A, { [C]: 60 });
    const state = await overlayState(page);
    if (state !== 'winner') throw new Error(`Expected winner, got ${state}`);
  });

  await check('3P: winner is A', async () => {
    await assertWinnerIs(page, A);
  });

  console.log(`  → 3P result: B eliminated in R2 (elim modal ✓), C in R3, ${A} wins. ✓`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  4-PLAYER GAME
// ═══════════════════════════════════════════════════════════════════════════
async function test4Player(page) {
  console.log('\n━━━ 4-PLAYER GAME ━━━');
  const [A, B, C, D] = [p('Q',1), p('Q',2), p('Q',3), p('Q',4)];

  await check('4P: setup — add 4 players, start', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    await addPlayer(page, C);
    await addPlayer(page, D);
    await startSession(page);
    await assertAliveCount(page, 4);
  });

  await check('4P: hero shows Round 1 + 4 alive', async () => {
    await assertRoundHero(page, 1);
  });

  await check('4P: round 1 — A=0, B=60, C=60, D=30', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 30 });
    const state = await overlayState(page);
    if (state !== 'normal') throw new Error(`Expected normal, got ${state}`);
  });

  await check('4P: round 2 — A=0, B=60, C=60, D=30 → B+C elim, D=60', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 30 });
    const state = await overlayState(page);
    // B and C both hit 120. Elim modal for first eliminated (B or C, depends on playerIds order)
    if (state !== 'elimination') throw new Error(`Expected elimination modal, got ${state}`);
  });

  await check('4P: elim modal shows (B or C)', async () => {
    const text = await page.locator('body').textContent();
    if (!text.includes('OUT')) throw new Error('No OUT text in elimination modal');
  });

  await check('4P: Continue → 2 survivors (A + D)', async () => {
    await clickContinue(page);
    await assertAliveCount(page, 2);
  });

  await check('4P: round 3 — A=0, D=60 → D=120 → A wins', async () => {
    await round(page, A, { [D]: 60 });
    const state = await overlayState(page);
    if (state !== 'winner') throw new Error(`Expected winner, got ${state}`);
  });

  await check('4P: winner is A', async () => {
    await assertWinnerIs(page, A);
  });

  console.log(`  → 4P result: B+C eliminated in R2 (1 elim modal ✓), D in R3, ${A} wins. ✓`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  5-PLAYER GAME
// ═══════════════════════════════════════════════════════════════════════════
async function test5Player(page) {
  console.log('\n━━━ 5-PLAYER GAME ━━━');
  const [A, B, C, D, E] = [p('F',1), p('F',2), p('F',3), p('F',4), p('F',5)];

  await check('5P: setup — add 5 players, start', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    await addPlayer(page, C);
    await addPlayer(page, D);
    await addPlayer(page, E);
    await startSession(page);
    await assertAliveCount(page, 5);
  });

  await check('5P: hero shows Round 1 + 5 alive', async () => {
    await assertRoundHero(page, 1);
  });

  // R1: B=60, C=60, D=20, E=20
  await check('5P: round 1 — A=0, B=60, C=60, D=20, E=20', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 20, [E]: 20 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R2: B=60 (total 120 elim), C=60 (total 120 elim), D=20 (40), E=20 (40)
  await check('5P: round 2 — B+C eliminated, D+E at 40', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 20, [E]: 20 });
    const state = await overlayState(page);
    if (state !== 'elimination') throw new Error(`Expected elimination, got ${state}`);
  });

  await check('5P: elim modal shows', async () => {
    const text = await page.locator('body').textContent();
    if (!text.includes('OUT')) throw new Error('No OUT in elim modal');
  });

  await check('5P: Continue → 3 alive (A, D, E)', async () => {
    await clickContinue(page);
    await assertAliveCount(page, 3);
  });

  // R3: D=20 (60), E=20 (60) — test they're safe below 100
  await check('5P: round 3 — A=0, D=20, E=20 (totals: D=60, E=60)', async () => {
    await round(page, A, { [D]: 20, [E]: 20 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
    await assertAliveCount(page, 3);
  });

  // R4: D=25 (85), E=25 (85) — in critical zone, still alive
  await check('5P: round 4 — A=0, D=25, E=25 (totals: D=85, E=85 — critical but alive)', async () => {
    await round(page, A, { [D]: 25, [E]: 25 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
    await assertAliveCount(page, 3);
  });

  // R5: D=25 (110 elim), E=25 (110 elim) → A wins
  await check('5P: round 5 — D+E eliminated → A wins', async () => {
    await round(page, A, { [D]: 25, [E]: 25 });
    const state = await overlayState(page);
    if (state !== 'winner') throw new Error(`Expected winner, got ${state}`);
  });

  await check('5P: winner is A', async () => {
    await assertWinnerIs(page, A);
  });

  console.log(`  → 5P result: B+C elim R2 (modal ✓), D+E survived critical zone, eliminated R5, ${A} wins. ✓`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  6-PLAYER GAME
// ═══════════════════════════════════════════════════════════════════════════
async function test6Player(page) {
  console.log('\n━━━ 6-PLAYER GAME ━━━');
  const [A, B, C, D, E, F] = [p('S',1), p('S',2), p('S',3), p('S',4), p('S',5), p('S',6)];

  await check('6P: setup — add 6 players, start', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    await addPlayer(page, C);
    await addPlayer(page, D);
    await addPlayer(page, E);
    await addPlayer(page, F);
    await startSession(page);
    await assertAliveCount(page, 6);
  });

  await check('6P: hero shows Round 1 + 6 alive', async () => {
    await assertRoundHero(page, 1);
  });

  // R1: B=60, C=60, D=20, E=20, F=20
  await check('6P: round 1 — A=0, B=60, C=60, D=20, E=20, F=20', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 20, [E]: 20, [F]: 20 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R2: B=60 (120 elim), C=60 (120 elim), D=20 (40), E=20 (40), F=20 (40)
  await check('6P: round 2 — B+C eliminated, D+E+F at 40', async () => {
    await round(page, A, { [B]: 60, [C]: 60, [D]: 20, [E]: 20, [F]: 20 });
    const state = await overlayState(page);
    if (state !== 'elimination') throw new Error(`Expected elimination, got ${state}`);
  });

  await check('6P: elim modal shows', async () => {
    const text = await page.locator('body').textContent();
    if (!text.includes('OUT')) throw new Error('No OUT in elim modal');
  });

  await check('6P: Continue → 4 alive (A, D, E, F)', async () => {
    await clickContinue(page);
    await assertAliveCount(page, 4);
  });

  // R3: D=20 (60), E=20 (60), F=20 (60)
  await check('6P: round 3 — D=20, E=20, F=20 (at 60)', async () => {
    await round(page, A, { [D]: 20, [E]: 20, [F]: 20 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R4: D=25 (85), E=25 (85), F=25 (85)
  await check('6P: round 4 — D=25, E=25, F=25 (all at 85 — critical)', async () => {
    await round(page, A, { [D]: 25, [E]: 25, [F]: 25 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
    await assertAliveCount(page, 4);
  });

  // R5: D=20 (105 elim), E=20 (105 elim), F=20 (105 elim) → A wins
  await check('6P: round 5 — D+E+F all eliminated → A wins directly', async () => {
    await round(page, A, { [D]: 20, [E]: 20, [F]: 20 });
    const state = await overlayState(page);
    if (state !== 'winner') throw new Error(`Expected winner, got ${state}`);
  });

  await check('6P: winner is A', async () => {
    await assertWinnerIs(page, A);
  });

  console.log(`  → 6P result: B+C elim R2 (modal ✓), D+E+F survived critical, eliminated R5, ${A} wins. ✓`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ALL-SAME-ROUND EDGE CASE — everyone hits 100+ at once
// ═══════════════════════════════════════════════════════════════════════════
async function testAllOutSameRound(page) {
  console.log('\n━━━ EDGE CASE: All players exceed 100 in same round ━━━');
  const [A, B] = [p('E',1), p('E',2)];

  await check('Edge: setup 2 players', async () => {
    await goHome(page);
    await openSetup(page);
    await addPlayer(page, A);
    await addPlayer(page, B);
    await startSession(page);
  });

  // Get A to 90 pts (A is NOT closing, B closes all)
  // Wait — to avoid A from being closer in setup, let B close.
  // R1: B closes (0), A gets 25 → A=25
  // R2: B closes (0), A gets 25 → A=50
  // R3: B closes (0), A gets 25 → A=75
  // R4: B closes (0), A gets 15 → A=90
  // R5: A closes (5), B gets 60 → A=95, B=60
  //   Actually we want BOTH to exceed 100 in same round.
  //   Let's do: A=90, B=90, then A closes (5) → A=95, B gets 10 → B=100 (safe!)
  //   Actually too complex. Let me do: A=90, B=90, then whoever closes (A)
  //   gets 5, B gets 15 → A=95, B=105 (elim). But then A wins normally.
  //   For ALL-OUT: need A and B both >100 same round.
  //   A closes (5, max) → A goes from 90 to 95. B gets 60 → B from 90 to 150.
  //   A still alive (95 ≤ 100). Not all-out.
  //   Only way: A must NOT be closer when A gets eliminated.
  //
  //   Let me restructure: A is always closer, B tries to eliminate A via high scores.
  //   Actually A is always closer and scores 0-5. B scores high.
  //   The all-out edge case requires A (closer) to also go over 100.
  //   Since closer is capped at 5, A can never go over 100 unless they accumulated enough.
  //
  //   Let's say A has 98 pts total. B closes this round (A is not closer).
  //   A gets 5 → A = 103. B gets 5 → B stays ok. Then next round...
  //
  //   OK let me build up to this more carefully.
  //   Setup: Rounds where B closes, A gets points.
  //   R1: B closes (0), A gets 25 → A=25
  //   R2: B closes (0), A gets 25 → A=50
  //   R3: B closes (0), A gets 25 → A=75
  //   R4: B closes (0), A gets 25 → A=100 (safe, 100 is ok!)
  //   Now A=100, B=0.
  //   R5: A closes (5), B gets 60 → A=105 (elim), B=60
  //     → Both not over 100 at same time.
  //
  //   For true all-out: A=95, B=95 before final round.
  //   R5: A closes (5) → A=100 (safe). B gets 5 → B=100 (safe). Hmm, not all-out.
  //   R6: A closes (5) → A=105 (elim), B gets 5 → B=105 (elim). BOTH out same round!
  //   But whoever closed (A) wins as tiebreaker since A=105 and B=105 (same total, A is closer).
  //
  //   Let's set it up:
  //   R1: A closes (0), B=25 → B=25
  //   R2: A closes (0), B=25 → B=50
  //   R3: A closes (0), B=25 → B=75
  //   Now A=0, B=75. Swap roles.
  //   R4: B closes (0), A=25 → A=25
  //   R5: B closes (0), A=25 → A=50  -- wait this is getting complex.
  //
  //   Simplest path to all-out: use Custom for large values.
  //   R1: A closes (0), B=custom 90 → B=90
  //   R2: B closes (0), A=custom 90 → A=90
  //   Now A=90, B=90.
  //   R3: A closes (5) → A=95, B=custom 10 → B=100 (safe!)
  //   R4: A closes (5) → A=100 (safe!), B=custom 5 → B=105 (elim)
  //     → A wins normally.
  //
  //   I can't easily force A to also go over 100 in the same round without complex setup.
  //   Let me try: A=98, B=98.
  //   R1: A closes (0), B gets 98 (custom) → B=98
  //   R2: B closes (0), A gets 98 (custom) → A=98
  //   R3: A closes (5) → A=103, B gets 5 → B=103. Both > 100 in same round!
  //   Closer is A → A is tiebreaker → A wins.
  //
  //   But wait: in R3, A is closer and scores 5. B scores 5.
  //   After R3: A=103, B=103. Both > 100. survivors=0.
  //   Tie: same total (103=103), closer is A → A wins.
  //   Winner overlay should show A.

  // Build A=98, B=98 using scores ≤ 60 (numpad cap)
  // R1: A closes (0), B gets 60 → B=60
  await check('Edge: R1 — A closes (0), B gets 60 → B=60', async () => {
    await round(page, A, { [B]: 60 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R2: A closes (0), B gets 38 → B=98
  await check('Edge: R2 — A closes (0), B gets 38 → B=98', async () => {
    await round(page, A, { [B]: 38 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R3: B closes (0), A gets 60 → A=60
  await check('Edge: R3 — B closes (0), A gets 60 → A=60', async () => {
    await round(page, B, { [A]: 60 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  // R4: B closes (0), A gets 38 → A=98
  await check('Edge: R4 — B closes (0), A gets 38 → A=98, B=98 both safe', async () => {
    await round(page, B, { [A]: 38 });
    if (await overlayState(page) !== 'normal') throw new Error('Expected normal');
  });

  await check('Edge: verify both at 98 — still alive (< 101)', async () => {
    await assertAliveCount(page, 2);
  });

  // R5: A closes (5) → A=103, B gets 5 → B=103. Both >100. All-out!
  await check('Edge: R5 — A closes (5), B gets 5 → both hit 103 (all-out same round)', async () => {
    await endRound(page);
    await selectCloser(page, A);
    await enterScore(page, A, 5);   // closer chip: 5
    await enterScore(page, B, 5);   // B chip: 5
    await confirmRound(page);
    const state = await overlayState(page);
    if (state !== 'winner') throw new Error(`Expected winner (all-out), got ${state}`);
  });

  await check('Edge: all-out tiebreaker — closer (A) wins', async () => {
    await assertWinnerIs(page, A);
    console.log('    Closer wins tiebreaker when all players exceed 100 in same round ✓');
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page    = await ctx.newPage();

  page.on('console', msg => { if (msg.type() === 'error') console.log('[browser error]', msg.text()); });

  console.log('\n🃏 CHHUMMY TRACKER — MULTI-PLAYER TEST SUITE\n');

  await test2Player(page);
  await test3Player(page);
  await test4Player(page);
  await test5Player(page);
  await test6Player(page);
  await testAllOutSameRound(page);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log(`RESULTS: ${PASS.length} PASS  |  ${FAIL.length} FAIL`);
  console.log('═'.repeat(50));

  if (FAIL.length > 0) {
    console.log('\nFAILED:');
    FAIL.forEach(f => console.log(`  ❌ ${f.name}\n     ${f.err}`));
  }

  await browser.close();
  process.exit(FAIL.length > 0 ? 1 : 0);
})();
