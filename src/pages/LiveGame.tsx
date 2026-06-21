import { useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import WhoClosed from "../components/overlays/WhoClosed";
import EnterScores from "../components/overlays/EnterScores";
import EliminationOverlay from "../components/overlays/EliminationOverlay";
import WinnerOverlay from "../components/overlays/WinnerOverlay";
import PauseOverlay from "../components/overlays/PauseOverlay";

export default function LiveGame({ onExit }: { onExit: () => void }) {
  const store = useAppStore();
  const session = store.activeSession;
  const rounds = store.rounds;
  const totals = store.getTotals();
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [redoConfirm, setRedoConfirm] = useState(false);

  const players = useMemo(() => {
    const map = new Map(store.players.map((p) => [p.id, p]));
    return (
      session?.playerIds.map(
        (id) => map.get(id) ?? { id, name: "Player", emoji: "🙂" }
      ) ?? []
    );
  }, [session, store.players]);

  if (!session) {
    return (
      <div className="p-4">
        <div className="text-lg">No active session.</div>
        <button onClick={onExit} className="mt-4 px-4 py-3 rounded-2xl bg-card border border-white/10">
          Go Home
        </button>
      </div>
    );
  }

  const roundNumber = rounds.length + 1;
  const dealerId = session.playerIds[session.dealerIndex];
  const survivors = players.filter((p) => (totals[p.id] || 0) < 100);

  const sorted = [...players].sort((a, b) => {
    const ta = totals[a.id] || 0;
    const tb = totals[b.id] || 0;
    const ea = ta >= 100 ? 1 : 0;
    const eb = tb >= 100 ? 1 : 0;
    if (ea !== eb) return ea - eb;
    return tb - ta;
  });

  const cardState = (total: number) => {
    if (total >= 100) return "eliminated";
    if (total >= 85) return "critical";
    if (total >= 70) return "warning";
    return "normal";
  };

  const closerId =
    store.ui.overlay.type === "enterScores" ? store.ui.overlay.closerId : undefined;

  return (
    <div className="min-h-screen bg-background text-text p-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={store.pause}
          className="px-3 py-2 rounded-xl bg-card border border-white/10"
        >
          Pause
        </button>

        <div className="text-xl font-semibold">Round {roundNumber}</div>

        <button
          onClick={() => { if (rounds.length > 0) setUndoConfirm(true); }}
          className={`px-3 py-2 rounded-xl bg-card border border-white/10 ${rounds.length === 0 ? "opacity-30 cursor-not-allowed" : ""}`}
        >
          Undo
        </button>
      </div>

      {undoConfirm && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-card border border-white/10 px-3 py-2">
          <span className="text-sm opacity-80">Undo Round {rounds.length}?</span>
          <div className="flex gap-2">
            <button
              onClick={() => { store.undoLastRound(); setUndoConfirm(false); setRedoConfirm(false); }}
              className="px-3 py-1 rounded-lg bg-danger text-white text-sm font-semibold"
            >
              Yes
            </button>
            <button
              onClick={() => setUndoConfirm(false)}
              className="px-3 py-1 rounded-lg bg-elevated text-sm"
            >
              No
            </button>
          </div>
        </div>
      )}

      {!undoConfirm && store.lastUndoneRound && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-card border border-amber-500/20 px-3 py-2">
          {redoConfirm ? (
            <>
              <span className="text-sm opacity-80">Redo Round {store.lastUndoneRound.number}?</span>
              <div className="flex gap-2">
                <button
                  onClick={() => { store.redoLastRound(); setRedoConfirm(false); }}
                  className="px-3 py-1 rounded-lg bg-success text-black text-sm font-semibold"
                >
                  Yes
                </button>
                <button
                  onClick={() => { store.clearRedo(); setRedoConfirm(false); }}
                  className="px-3 py-1 rounded-lg bg-elevated text-sm"
                >
                  No
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm text-amber-400 opacity-80">↩ Redo available</span>
              <button
                onClick={() => setRedoConfirm(true)}
                className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-semibold border border-amber-500/30"
              >
                Redo
              </button>
            </>
          )}
        </div>
      )}

      {/* Player Cards */}
      <div className="mt-4 grid gap-3">
        {sorted.map((p) => {
          const total = totals[p.id] || 0;
          const state = cardState(total);
          const isCloser = closerId === p.id;
          const wins = rounds.filter((r) => r.closerId === p.id).length;

          return (
            <motion.div
              layout
              key={p.id}
              className={`
                p-4 rounded-2xl border
                ${state === "eliminated" ? "bg-[#1a0b0b] border-danger/30 opacity-60"
                  : state === "critical" ? "bg-[#1a0606] border-danger/40"
                  : state === "warning" ? "bg-[#17110a] border-warning/30"
                  : "bg-elevated border-white/5"}
                ${state === "warning" ? "shadow-amber"
                  : state === "critical" ? "shadow-red"
                  : isCloser ? "shadow-green"
                  : "shadow-glow"}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-3xl flex-shrink-0">
                    {p.emoji ?? "🙂"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">{p.name}</div>
                      {wins > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                          🏆 {wins}
                        </div>
                      )}
                      {p.id === dealerId && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold border border-blue-500/20">
                          🎴 Dealer
                        </div>
                      )}
                    </div>
                    <div className={`text-sm font-medium ${
                      state === "critical" ? "text-danger animate-pulse"
                      : state === "warning" ? "text-warning"
                      : "opacity-70"
                    }`}>
                      Total: {total}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCloser && (
                    <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">🏁 Closer</span>
                  )}
                  {state === "warning" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">70+</span>
                  )}
                  {state === "critical" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-danger/20 text-danger animate-pulse">85+</span>
                  )}
                  {state === "eliminated" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-danger text-white">💀 OUT</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Action */}
      <div className="fixed left-0 right-0 bottom-0 p-4 safe bg-gradient-to-t from-background via-background to-transparent">
        <div className="mb-2 text-center text-xs opacity-50 tracking-wide uppercase">
          Round {roundNumber} • Live Score Tracker
        </div>

        {survivors.length === 1 ? (
          <button
            onClick={() => store.declareWinner(survivors[0].id)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-lg font-bold shadow-amber active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            🏆 End Game — {survivors[0].name} Wins!
          </button>
        ) : (
          <button
            onClick={store.endRoundStart}
            className="w-full py-4 rounded-2xl bg-success text-black text-lg font-bold shadow-green active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            🎯 End Round #{roundNumber}
          </button>
        )}
      </div>

      <Overlays onExit={onExit} />
    </div>
  );
}

function Overlays({ onExit }: { onExit: () => void }) {
  const overlay = useAppStore((s) => s.ui.overlay);

  return (
    <AnimatePresence>
      {overlay.type === "whoClosed" && <WhoClosed key="whoClosed" />}
      {overlay.type === "enterScores" && <EnterScores key="enterScores" />}
      {overlay.type === "eliminated" && <EliminationOverlay key="eliminated" />}
      {overlay.type === "winner" && <WinnerOverlay key="winner" onExit={onExit} />}
      {overlay.type === "pause" && <PauseOverlay key="pause" onExit={onExit} />}
    </AnimatePresence>
  );
}
