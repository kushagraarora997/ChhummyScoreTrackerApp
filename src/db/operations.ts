import { db, Player, Session, Round, Stats, Achievement } from "./index";
import { nanoid } from "../utils/nanoid";
import { getRoomCode } from "../lib/roomCode";
import {
  syncPlayer, syncSession, syncRound,
  deleteRoundFromCloud, deletePlayerFromCloud,
  syncStats, syncAchievement,
} from "../lib/firebaseSync";

function fid() { return getRoomCode(); }

// ── Players ──────────────────────────────────────────────────────────────────

export function getPlayers(): Promise<Player[]> {
  return db.players.toArray();
}

export async function addPlayer(player: Player): Promise<string> {
  const result = await db.players.add(player);
  const f = fid(); if (f) syncPlayer(f, player);
  return result;
}

export function updatePlayerLastUsed(id: string): Promise<number> {
  return db.players.update(id, { lastUsedAt: Date.now() });
}

export async function updatePlayer(id: string, data: Partial<Player>): Promise<number> {
  const result = await db.players.update(id, data);
  const f = fid();
  if (f) db.players.get(id).then((p) => { if (p) syncPlayer(f, p); });
  return result;
}

export async function deletePlayer(id: string): Promise<void> {
  await db.players.delete(id);
  const f = fid(); if (f) deletePlayerFromCloud(f, id);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where("status").equals("active").first();
}

export async function addSession(session: Session): Promise<string> {
  const result = await db.sessions.add(session);
  const f = fid(); if (f) syncSession(f, session);
  return result;
}

export async function putSession(session: Session): Promise<string> {
  const result = await db.sessions.put(session);
  const f = fid(); if (f) syncSession(f, session);
  return result;
}

export function getCompletedSessions(): Promise<Session[]> {
  return db.sessions.where("status").equals("completed").sortBy("startedAt");
}

// ── Rounds ────────────────────────────────────────────────────────────────────

export function getRoundsBySession(sessionId: string): Promise<Round[]> {
  return db.rounds.where("sessionId").equals(sessionId).sortBy("number");
}

export function countRoundsBySession(sessionId: string): Promise<number> {
  return db.rounds.where("sessionId").equals(sessionId).count();
}

export async function addRound(round: Round): Promise<string> {
  const result = await db.rounds.add(round);
  const f = fid(); if (f) syncRound(f, round);
  return result;
}

export async function putRound(round: Round): Promise<string> {
  const result = await db.rounds.put(round);
  const f = fid(); if (f) syncRound(f, round);
  return result;
}

export function bulkPutRounds(rounds: Round[]): Promise<unknown> {
  return db.rounds.bulkPut(rounds);
}

export async function putRoundLocal(round: Round): Promise<void> {
  await db.rounds.put(round);
}

export async function deleteRound(round: Pick<Round, "id" | "sessionId" | "number">): Promise<void> {
  await db.rounds.delete(round.id);
  const f = fid(); if (f) deleteRoundFromCloud(f, round.sessionId, round.number);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getGlobalStats(): Promise<Stats | undefined> {
  return db.stats.get("global");
}

export async function putStats(stats: Stats): Promise<string> {
  const result = await db.stats.put(stats);
  const f = fid(); if (f) syncStats(f, stats);
  return result;
}

// ── Achievements ──────────────────────────────────────────────────────────────

export function getAchievements(): Promise<Achievement[]> {
  return db.achievements.toArray();
}

export async function addAchievement(achievement: Omit<Achievement, "id">): Promise<string> {
  const full = { ...achievement, id: nanoid() };
  await db.achievements.add(full);
  const f = fid(); if (f) syncAchievement(f, full);
  return full.id;
}

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.players.clear(),
    db.sessions.clear(),
    db.rounds.clear(),
    db.stats.clear(),
    db.achievements.clear(),
  ]);
}

// ── Stats Writing ─────────────────────────────────────────────────────────────

export async function writeStats(session: Session, allRounds: Round[]) {
  const existing = await getGlobalStats();
  const base: Stats = existing ?? {
    id: "global",
    totals: {
      wins: {},
      closes: {},
      eliminations: {},
      averageScore: {},
      survivalRounds: {},
      streaks: { closeStreak: {}, bestCloseStreak: {} },
    },
  };
  const t = base.totals;

  if (session.winnerId) {
    t.wins[session.winnerId] = (t.wins[session.winnerId] || 0) + 1;
  }

  for (const r of allRounds) {
    t.closes[r.closerId] = (t.closes[r.closerId] || 0) + 1;
  }

  const lastTotals = allRounds[allRounds.length - 1]?.totals ?? {};
  for (const pid of session.playerIds) {
    if (pid !== session.winnerId && (lastTotals[pid] || 0) > 100) {
      t.eliminations[pid] = (t.eliminations[pid] || 0) + 1;
    }
  }

  for (const pid of session.playerIds) {
    const roundsIn = allRounds.filter((r) => pid in r.scores).length;
    const sessionTotal = allRounds.reduce((s, r) => s + (r.scores[pid] || 0), 0);
    const prev = t.survivalRounds[pid] || 0;
    const newRounds = prev + roundsIn;
    t.survivalRounds[pid] = newRounds;
    if (newRounds > 0) {
      t.averageScore[pid] = Math.round(
        ((t.averageScore[pid] || 0) * prev + sessionTotal) / newRounds
      );
    }
  }

  const currentStreak: Record<string, number> = {};
  for (const pid of session.playerIds) currentStreak[pid] = 0;
  for (const r of allRounds) {
    for (const pid of session.playerIds) {
      if (r.closerId === pid) {
        currentStreak[pid]++;
        if (currentStreak[pid] > (t.streaks.bestCloseStreak[pid] || 0)) {
          t.streaks.bestCloseStreak[pid] = currentStreak[pid];
        }
      } else {
        currentStreak[pid] = 0;
      }
    }
  }
  for (const pid of session.playerIds) {
    t.streaks.closeStreak[pid] = currentStreak[pid];
  }

  await putStats(base);

  const achievements: Omit<Achievement, "id">[] = [];
  const winnerId = session.winnerId;
  const sid = session.id;
  const now = Date.now();

  if (winnerId) {
    if ((lastTotals[winnerId] || 0) === 0) {
      achievements.push({ playerId: winnerId, key: "ICE_COLD", sessionId: sid, createdAt: now });
    }
    const neverWarn = allRounds.every((r) => (r.totals[winnerId] || 0) < 70);
    if (neverWarn) {
      achievements.push({ playerId: winnerId, key: "UNTOUCHABLE", sessionId: sid, createdAt: now });
    }
    const wasCritical = allRounds.some((r) => (r.totals[winnerId] || 0) >= 85);
    if (wasCritical) {
      achievements.push({ playerId: winnerId, key: "SURVIVOR", sessionId: sid, createdAt: now });
    }
  }

  const closeCount: Record<string, number> = {};
  for (const r of allRounds) closeCount[r.closerId] = (closeCount[r.closerId] || 0) + 1;
  const maxC = Math.max(0, ...Object.values(closeCount));
  const leaders = Object.entries(closeCount).filter(([, v]) => v === maxC);
  if (maxC > 0 && leaders.length === 1) {
    achievements.push({ playerId: leaders[0][0], key: "CLUTCH_MASTER", sessionId: sid, createdAt: now });
  }

  let firstOut: string | null = null;
  let firstOutRound = Infinity;
  for (const pid of session.playerIds) {
    for (let i = 0; i < allRounds.length; i++) {
      if ((allRounds[i].totals[pid] || 0) > 100) {
        if (i < firstOutRound) { firstOutRound = i; firstOut = pid; }
        break;
      }
    }
  }
  if (firstOut) {
    achievements.push({ playerId: firstOut, key: "PATSY", sessionId: sid, createdAt: now });
  }

  for (const a of achievements) {
    await addAchievement(a);
  }
}
