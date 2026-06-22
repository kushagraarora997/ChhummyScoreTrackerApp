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
