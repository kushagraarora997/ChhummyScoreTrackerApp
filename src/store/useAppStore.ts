import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { db, Player, Session, Round } from "../db";
import { nanoid } from "../utils/nanoid";

type UIOverlay =
  | { type: "none" }
  | { type: "whoClosed" }
  | { type: "enterScores"; closerId: string }
  | { type: "confirmRound" }
  | { type: "eliminated"; name: string; total: number }
  | { type: "winner"; winnerId: string; summary: { rounds: number; closes: number; final: number } }
  | { type: "pause" };

interface AppState {
  players: Player[];
  activeSession?: Session;
  rounds: Round[];
  ui: {
    overlay: UIOverlay;
    toast?: { message: string; tone?: "success" | "warning" | "danger" };
  };
  init: () => Promise<void>;
  newSession: (playerIds: string[]) => Promise<void>;
  resumeLatest: () => Promise<void>;
  endRoundStart: () => void;
  chooseCloser: (playerId: string) => void;
  setScore: (playerId: string, value: number) => void;
  confirmRound: () => Promise<void>;
  undoLastRound: () => Promise<void>;
  pause: () => void;
  closeOverlay: () => void;
  getTotals: () => Record<string, number>;
  tempScores: Record<string, number>;
  setTempScore: (pid: string, v: number) => void;
}

export const useAppStore = create<AppState>()(
  devtools((set, get) => ({
    players: [],
    rounds: [],
    ui: { overlay: { type: "none" } },
    tempScores: {},
    async init() {
      const players = await db.players.toArray();
      const active = await db.sessions.where("status").equals("active").first();
      let rounds: Round[] = [];
      if (active) {
        rounds = await db.rounds.where("sessionId").equals(active.id).sortBy("number");
      }
      set({ players, activeSession: active, rounds });
    },
    async newSession(playerIds) {
      const session: Session = {
        id: nanoid(),
        startedAt: Date.now(),
        playerIds,
        dealerIndex: 0,
        status: "active",
      };
      await db.sessions.add(session);
      set({ activeSession: session, rounds: [] });
    },
    async resumeLatest() {
      const active = await db.sessions.where("status").equals("active").first();
      if (active) {
        const rounds = await db.rounds.where("sessionId").equals(active.id).sortBy("number");
        set({ activeSession: active, rounds });
      }
    },
    endRoundStart() {
      set((s) => ({ ui: { ...s.ui, overlay: { type: "whoClosed" } } }));
    },
    chooseCloser(playerId) {
      set((s) => ({ ui: { ...s.ui, overlay: { type: "enterScores", closerId: playerId } } }));
    },
    setScore(playerId, value) {
      const { tempScores } = get();
      set({ tempScores: { ...tempScores, [playerId]: value } });
    },
    setTempScore(pid, v) {
      const { tempScores } = get();
      set({ tempScores: { ...tempScores, [pid]: v } });
    },
    getTotals() {
      const { rounds, activeSession } = get();
      const totals: Record<string, number> = {};
      if (!activeSession) return totals;
      activeSession.playerIds.forEach((pid) => (totals[pid] = 0));
      for (const r of rounds) {
        for (const pid of Object.keys(r.scores)) {
          totals[pid] = (totals[pid] || 0) + r.scores[pid];
        }
      }
      return totals;
    },
    async confirmRound() {
      const { activeSession, rounds, tempScores, ui, getTotals } = get();
      if (!activeSession) return;
      if (ui.overlay.type !== "enterScores") return;

      const closerId = ui.overlay.closerId;
      const prevTotals = getTotals();
      const scores: Record<string, number> = {};
      for (const pid of activeSession.playerIds) {
        scores[pid] = tempScores[pid] ?? 0;
      }
      const number = rounds.length + 1;
      const totals: Record<string, number> = {};
      for (const pid of activeSession.playerIds) {
        totals[pid] = (prevTotals[pid] || 0) + (scores[pid] || 0);
      }

      const round: Round = {
        id: nanoid(),
        sessionId: activeSession.id,
        number,
        closerId,
        scores,
        totals,
        createdAt: Date.now(),
      };
      await db.rounds.add(round);

      const nextDealerIndex = activeSession.playerIds.indexOf(closerId);
      const updatedSession = { ...activeSession, dealerIndex: nextDealerIndex, lastRoundId: round.id };
      await db.sessions.put(updatedSession);

      const survivors = activeSession.playerIds.filter((pid) => totals[pid] < 100);

      set({
        rounds: [...rounds, round],
        activeSession: updatedSession,
        ui: { overlay: { type: "none" } },
        tempScores: {},
      });

      const justEliminated = activeSession.playerIds
        .filter((pid) => (prevTotals[pid] < 100) && (totals[pid] >= 100));

      if (justEliminated.length > 0) {
        const pmap = await db.players.toArray();
        const first = justEliminated[0];
        const name = pmap.find((p) => p.id === first)?.name || "Player";
        set((s) => ({ ui: { ...s.ui, overlay: { type: "eliminated", name, total: totals[first] } } }));
        return;
      }

      if (survivors.length === 1) {
        const winnerId = survivors[0];
        const final = totals[winnerId] || 0;
        const closes = [...rounds, round].filter((r) => r.closerId === winnerId).length;
        const summary = { rounds: number, closes, final };
        const completed = { ...updatedSession, status: "completed", endedAt: Date.now(), winnerId };
        await db.sessions.put(completed);
        set((s) => ({ activeSession: completed, ui: { ...s.ui, overlay: { type: "winner", winnerId, summary } } }));
      }
    },
    async undoLastRound() {
      const { rounds, activeSession } = get();
      if (!activeSession || rounds.length === 0) return;
      const last = rounds[rounds.length - 1];
      await db.rounds.delete(last.id);
      const remain = rounds.slice(0, -1);
      const dealerIndex = remain.length
        ? activeSession.playerIds.indexOf(remain[remain.length - 1].closerId)
        : 0;
      const updated = { ...activeSession, dealerIndex, lastRoundId: remain[remain.length - 1]?.id };
      await db.sessions.put(updated);
      set({ rounds: remain, activeSession: updated, ui: { overlay: { type: "none" }, toast: { message: "Undid previous round" } } });
    },
    pause() {
      set((s) => ({ ui: { ...s.ui, overlay: { type: "pause" } } }));
    },
    closeOverlay() {
      set((s) => ({ ui: { ...s.ui, overlay: { type: "none" } } }));
    },
  }))
);
