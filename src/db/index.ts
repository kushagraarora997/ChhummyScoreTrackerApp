import Dexie, { Table } from "dexie";

export interface Player {
  id: string;
  name: string;
  emoji?: string;
  createdAt: number;
  lastUsedAt: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  playerIds: string[];
  dealerIndex: number;
  winnerId?: string;
  lastRoundId?: string;
  status: "active" | "completed";
}

export interface Round {
  id: string;
  sessionId: string;
  number: number;
  closerId: string;
  scores: Record<string, number>;
  totals: Record<string, number>;
  createdAt: number;
}

export interface Stats {
  id: "global";
  totals: {
    wins: Record<string, number>;
    closes: Record<string, number>;
    eliminations: Record<string, number>;
    averageScore: Record<string, number>;
    survivalRounds: Record<string, number>;
    streaks: {
      closeStreak: Record<string, number>;
      bestCloseStreak: Record<string, number>;
    };
  };
}

export interface Achievement {
  id: string;
  playerId: string;
  key: "ICE_COLD" | "UNTOUCHABLE" | "SURVIVOR" | "CLUTCH_MASTER" | "PATSY";
  sessionId: string;
  roundId?: string;
  createdAt: number;
}

class ChhummyDB extends Dexie {
  players!: Table<Player, string>;
  sessions!: Table<Session, string>;
  rounds!: Table<Round, string>;
  stats!: Table<Stats, string>;
  achievements!: Table<Achievement, string>;
  constructor() {
    super("chhummy-db");
    this.version(1).stores({
      players: "id, name, lastUsedAt",
      sessions: "id, status, startedAt",
      rounds: "id, sessionId, number",
      stats: "id",
      achievements: "id, playerId, sessionId, key",
    });
  }
}

export const db = new ChhummyDB();
