import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Player, Session, Round } from "../db";
import { nanoid } from "../utils/nanoid";
import { soundWinner, soundElimination, soundConfirm } from "../utils/sound";
import {
  getPlayers, getActiveSession, getRoundsBySession,
  addSession, putSession,
  addRound, putRound, putRoundLocal, deleteRound, deleteRoundLocal,
  writeStats,
} from "../db/operations";
import { getRoomCode } from "../lib/roomCode";
import { pullStatsFromCloud } from "../lib/firebaseSync";

export function resolveRoundOutcome(
  playerIds: string[],
  prevTotals: Record<string, number>,
  totals: Record<string, number>,
  survivors: string[],
): { outcome: "normal" | "elimination" | "winner" | "allOut"; justEliminated: string[] } {
  const justEliminated = playerIds.filter(
    (pid) => prevTotals[pid] <= 100 && totals[pid] > 100
  );
  if (justEliminated.length > 0 && survivors.length > 1) return { outcome: "elimination", justEliminated };
  if (survivors.length === 0) return { outcome: "allOut", justEliminated };
  if (survivors.length === 1) return { outcome: "winner", justEliminated };
  return { outcome: "normal", justEliminated };
}

type UIOverlay =
  | { type: "none" }
  | { type: "whoClosed" }
  | { type: "enterScores"; closerId: string }
  | { type: "confirmRound" }
  | { type: "eliminated"; name: string; total: number }
  | {
      type: "winner";
      winnerId: string;
      summary: {
        rounds: number;
        closes: number;
        final: number;
      };
    }
  | { type: "pause" };

export type { UIOverlay };

interface AppState {
  players: Player[];
  activeSession?: Session;
  rounds: Round[];
  lastUndoneRound: Round | null;
  deletedRoundIds: string[];
  ui: {
    overlay: UIOverlay;
  };

  init: () => Promise<void>;
  newSession: (playerIds: string[], dealerIndex?: number) => Promise<void>;
  endRoundStart: () => void;
  chooseCloser: (playerId: string) => void;
  confirmRound: () => Promise<void>;
  undoLastRound: () => Promise<void>;
  redoLastRound: () => Promise<void>;
  clearRedo: () => void;
  declareWinner: (winnerId: string) => Promise<void>;
  pause: () => void;
  closeOverlay: () => void;
  abandonSession: () => Promise<void>;
  getTotals: () => Record<string, number>;

  tempScores: Record<string, number>;
  setTempScore: (pid: string, v: number) => void;

  ingestCloudRound: (round: Round) => Promise<void>;
  ingestCloudSession: (session: Session) => Promise<void>;
  removeIngestedRound: (roundId: string) => Promise<void>;
}

export const useAppStore = create<AppState>()(
  devtools((set, get) => ({
    players: [],
    rounds: [],
    lastUndoneRound: null,
    deletedRoundIds: [],
    ui: {
      overlay: { type: "none" },
    },

    tempScores: {},

    async init() {
      const players = await getPlayers();
      const active = await getActiveSession();
      let rounds: Round[] = [];

      if (active) {
        rounds = await getRoundsBySession(active.id);
      }

      set({
        players,
        activeSession: active,
        rounds,
      });
    },

    async newSession(playerIds, dealerIndex = 0) {
      const existing = get().activeSession;
      if (existing?.status === "active") {
        await putSession({ ...existing, status: "abandoned", endedAt: Date.now() });
      }

      const session: Session = {
        id: nanoid(),
        startedAt: Date.now(),
        playerIds,
        dealerIndex,
        status: "active",
      };

      await addSession(session);

      const players = await getPlayers();

      set({
        players,
        activeSession: session,
        rounds: [],
        lastUndoneRound: null,
        deletedRoundIds: [],
        ui: { overlay: { type: "none" } },
        tempScores: {},
      });
    },

    endRoundStart() {
      set((s) => ({
        tempScores: {},
        ui: {
          ...s.ui,
          overlay: { type: "whoClosed" },
        },
      }));
    },

    chooseCloser(playerId) {
      set((s) => ({
        ui: {
          ...s.ui,
          overlay: {
            type: "enterScores",
            closerId: playerId,
          },
        },
      }));
    },

    setTempScore(pid, v) {
      const { tempScores } = get();

      set({
        tempScores: {
          ...tempScores,
          [pid]: v,
        },
      });
    },

    getTotals() {
      const { rounds, activeSession } = get();

      const totals: Record<string, number> = {};

      if (!activeSession) return totals;

      activeSession.playerIds.forEach((pid) => {
        totals[pid] = 0;
      });

      for (const r of rounds) {
        for (const pid of Object.keys(r.scores)) {
          totals[pid] =
            (totals[pid] || 0) + r.scores[pid];
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

      await addRound(round);

      const nextDealerIndex = activeSession.playerIds.indexOf(closerId);
      const updatedSession: Session = {
        ...activeSession,
        dealerIndex: nextDealerIndex,
      };
      await putSession(updatedSession);

      const survivors = activeSession.playerIds.filter((pid) => totals[pid] <= 100);
      const allRounds = [...rounds, round];

      set({
        rounds: allRounds,
        activeSession: updatedSession,
        lastUndoneRound: null,
        ui: { overlay: { type: "none" } },
        tempScores: {},
      });

      const { outcome, justEliminated } = resolveRoundOutcome(
        activeSession.playerIds, prevTotals, totals, survivors
      );

      switch (outcome) {
        case "elimination": {
          soundElimination();
          navigator.vibrate?.([200, 100, 200]);
          const first = justEliminated[0];
          const name = get().players.find((p) => p.id === first)?.name || "Player";
          set((s) => ({ ui: { ...s.ui, overlay: { type: "eliminated", name, total: totals[first] } } }));
          break;
        }
        case "allOut": {
          const lowestTotal = Math.min(...activeSession.playerIds.map((pid) => totals[pid]));
          const lowestPlayers = activeSession.playerIds.filter((pid) => totals[pid] === lowestTotal);
          const tieWinnerId = lowestPlayers.includes(closerId) ? closerId : lowestPlayers[0];
          const final = totals[tieWinnerId] || 0;
          const closes = allRounds.filter((r) => r.closerId === tieWinnerId).length;
          const completed: Session = { ...updatedSession, status: "completed", endedAt: Date.now(), winnerId: tieWinnerId };
          await putSession(completed);
          await writeStats(completed, allRounds);
          soundWinner();
          navigator.vibrate?.([100, 50, 100, 50, 300]);
          set((s) => ({
            activeSession: completed,
            ui: { ...s.ui, overlay: { type: "winner", winnerId: tieWinnerId, summary: { rounds: allRounds.length, closes, final } } },
          }));
          break;
        }
        case "winner": {
          const winnerId = survivors[0];
          const final = totals[winnerId] || 0;
          const closes = allRounds.filter((r) => r.closerId === winnerId).length;
          const completed: Session = { ...updatedSession, status: "completed", endedAt: Date.now(), winnerId };
          await putSession(completed);
          await writeStats(completed, allRounds);
          soundWinner();
          navigator.vibrate?.([100, 50, 100, 50, 300]);
          set((s) => ({
            activeSession: completed,
            ui: { ...s.ui, overlay: { type: "winner", winnerId, summary: { rounds: allRounds.length, closes, final } } },
          }));
          break;
        }
        case "normal": {
          soundConfirm();
          const crossedCritical = activeSession.playerIds.some(
            (pid) => prevTotals[pid] < 85 && totals[pid] >= 85 && totals[pid] < 100
          );
          const crossedWarning = !crossedCritical && activeSession.playerIds.some(
            (pid) => prevTotals[pid] < 70 && totals[pid] >= 70 && totals[pid] < 85
          );
          if (crossedCritical) navigator.vibrate?.([50, 30, 50, 30, 50]);
          else if (crossedWarning) navigator.vibrate?.([30, 20, 30]);
          break;
        }
      }
    },

    async undoLastRound() {
      const { rounds, activeSession } = get();

      if (!activeSession || rounds.length === 0)
        return;

      const last = rounds[rounds.length - 1];

      await deleteRound(last);

      const remain = rounds.slice(0, -1);

      const dealerIndex = remain.length
        ? activeSession.playerIds.indexOf(
            remain[remain.length - 1].closerId
          )
        : 0;

      const updated: Session = {
        ...activeSession,
        dealerIndex,
        // If undoing the game-ending round, revert session back to active
        ...(activeSession.status === "completed"
          ? { status: "active" as const, winnerId: undefined, endedAt: undefined }
          : {}),
      };

      await putSession(updated);

      set((s) => ({
        rounds: remain,
        activeSession: updated,
        lastUndoneRound: last,
        // Bug 1 fix: track deleted round ID so Firestore's delayed "modified" event doesn't re-add it
        deletedRoundIds: [...s.deletedRoundIds, last.id],
        ui: { overlay: { type: "none" } },
      }));
    },

    async redoLastRound() {
      const { lastUndoneRound, rounds, activeSession } = get();
      if (!activeSession || !lastUndoneRound) return;

      await putRound(lastUndoneRound);

      const restored = [...rounds, lastUndoneRound].sort((a, b) => a.number - b.number);

      const dealerIndex = activeSession.playerIds.indexOf(lastUndoneRound.closerId);

      const updated: Session = {
        ...activeSession,
        dealerIndex,
      };

      await putSession(updated);

      set((s) => ({
        rounds: restored,
        activeSession: updated,
        lastUndoneRound: null,
        deletedRoundIds: s.deletedRoundIds.filter((id) => id !== lastUndoneRound.id),
        ui: { overlay: { type: "none" } },
      }));
    },

    clearRedo() {
      set({ lastUndoneRound: null });
    },

    pause() {
      set((s) => ({
        ui: {
          ...s.ui,
          overlay: { type: "pause" },
        },
      }));
    },

    closeOverlay() {
      set((s) => ({
        ui: {
          ...s.ui,
          overlay: { type: "none" },
        },
      }));
    },

    async declareWinner(winnerId: string) {
      const { activeSession, rounds } = get();
      if (!activeSession) return;

      const totals = get().getTotals();
      const final = totals[winnerId] || 0;
      const closes = rounds.filter((r) => r.closerId === winnerId).length;

      const completed: Session = {
        ...activeSession,
        status: "completed",
        endedAt: Date.now(),
        winnerId,
      };

      await putSession(completed);
      await writeStats(completed, rounds);

      soundWinner();
      navigator.vibrate?.([100, 50, 100, 50, 300]);

      set((s) => ({
        activeSession: completed,
        lastUndoneRound: null,
        ui: {
          ...s.ui,
          overlay: {
            type: "winner",
            winnerId,
            summary: { rounds: rounds.length, closes, final },
          },
        },
      }));
    },

    async ingestCloudRound(round) {
      // Bug 1 fix: skip rounds that were explicitly deleted locally (Firestore "modified" event race)
      if (get().deletedRoundIds.includes(round.id)) return;
      const existing = get().rounds;
      // Dedup by ID (same device's own round coming back via onSnapshot)
      if (existing.some((r) => r.id === round.id)) return;
      // Block double-write: skip if we already have this round number for this session
      if (existing.some((r) => r.sessionId === round.sessionId && r.number === round.number)) return;
      // Write to Dexie only — no Firestore re-sync (round came FROM Firestore already)
      await putRoundLocal(round);
      set((s) => {
        if (s.rounds.some((r) => r.id === round.id)) return s;
        if (s.rounds.some((r) => r.sessionId === round.sessionId && r.number === round.number)) return s;
        return { rounds: [...s.rounds, round].sort((a, b) => a.number - b.number) };
      });
    },

    // Bug 2 fix: remove a round that was undone on another device (Firestore "removed" event)
    async removeIngestedRound(roundId) {
      const { rounds } = get();
      if (!rounds.some((r) => r.id === roundId)) return;
      await deleteRoundLocal(roundId);
      set((s) => ({ rounds: s.rounds.filter((r) => r.id !== roundId) }));
    },

    async ingestCloudSession(session) {
      const { activeSession, rounds, ui } = get();
      if (!activeSession || activeSession.id !== session.id) return;
      await putSession(session);

      // When host ends the game, show winner overlay on joined device too
      if (session.status === "completed" && session.winnerId && ui.overlay.type !== "winner") {
        const winnerId = session.winnerId;
        const closes = rounds.filter((r) => r.closerId === winnerId).length;
        const final = rounds[rounds.length - 1]?.totals[winnerId] ?? 0;
        soundWinner();
        navigator.vibrate?.([100, 50, 100, 50, 300]);
        set({
          activeSession: session,
          ui: {
            ...ui,
            overlay: {
              type: "winner",
              winnerId,
              summary: { rounds: rounds.length, closes, final },
            },
          },
        });
        // Pull updated stats from cloud after host has time to write them
        setTimeout(() => {
          const code = getRoomCode();
          if (code) pullStatsFromCloud(code).catch(() => {});
        }, 3000);
        return;
      }

      set({ activeSession: session });
    },

    async abandonSession() {
      const { activeSession } = get();
      if (!activeSession) return;
      await putSession({
        ...activeSession,
        status: "abandoned",
        endedAt: Date.now(),
      });
      set({
        activeSession: undefined,
        rounds: [],
        lastUndoneRound: null,
        ui: { overlay: { type: "none" } },
        tempScores: {},
      });
    },
  }), { enabled: import.meta.env.DEV })
);