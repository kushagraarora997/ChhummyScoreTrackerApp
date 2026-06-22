import { db, Player, Session, Round, Stats, Achievement } from "./index";
import { nanoid } from "../utils/nanoid";

// ── Players ──────────────────────────────────────────────────────────────────

export function getPlayers(): Promise<Player[]> {
  return db.players.toArray();
}

export function addPlayer(player: Player): Promise<string> {
  return db.players.add(player);
}

export function updatePlayerLastUsed(id: string): Promise<number> {
  return db.players.update(id, { lastUsedAt: Date.now() });
}

export function updatePlayer(id: string, data: Partial<Player>): Promise<number> {
  return db.players.update(id, data);
}

export function deletePlayer(id: string): Promise<void> {
  return db.players.delete(id);
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export function getActiveSession(): Promise<Session | undefined> {
  return db.sessions.where("status").equals("active").first();
}

export function addSession(session: Session): Promise<string> {
  return db.sessions.add(session);
}

export function putSession(session: Session): Promise<string> {
  return db.sessions.put(session);
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

export function addRound(round: Round): Promise<string> {
  return db.rounds.add(round);
}

export function putRound(round: Round): Promise<string> {
  return db.rounds.put(round);
}

export function deleteRound(id: string): Promise<void> {
  return db.rounds.delete(id);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function getGlobalStats(): Promise<Stats | undefined> {
  return db.stats.get("global");
}

export function putStats(stats: Stats): Promise<string> {
  return db.stats.put(stats);
}

// ── Achievements ──────────────────────────────────────────────────────────────

export function getAchievements(): Promise<Achievement[]> {
  return db.achievements.toArray();
}

export function addAchievement(achievement: Omit<Achievement, "id">): Promise<string> {
  return db.achievements.add({ ...achievement, id: nanoid() });
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
