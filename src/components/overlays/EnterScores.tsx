import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import FullOverlay from "../FullOverlay";
import { useAppStore } from "../../store/useAppStore";

const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];
const CLOSER_CHIPS = [0, 1, 2, 3, 4, 5];

export default function EnterScores() {
  const store = useAppStore();
  const [validErr, setValidErr] = useState<string | null>(null);
  const [numpad, setNumpad] = useState<{ playerId: string } | null>(null);
  const [numInput, setNumInput] = useState("");

  const session = store.activeSession!;
  const closerId =
    store.ui.overlay.type === "enterScores" ? store.ui.overlay.closerId : "";
  const totals = store.getTotals();

  const playerMap = new Map(store.players.map((p) => [p.id, p]));
  const players = session.playerIds
    .map((id) => playerMap.get(id))
    .filter((p): p is (typeof store.players)[0] => !!p && (totals[p.id] || 0) <= 100);

  function handleConfirm() {
    const missing = players.some((p) => store.tempScores[p.id] === undefined);
    if (missing) { setValidErr("Sabka score daal pehle 😭"); return; }
    if (closerId && (store.tempScores[closerId] ?? 0) > 5) {
      setValidErr("Closer 5 se zyada score nahi ho sakta 😭");
      return;
    }
    setValidErr(null);
    navigator.vibrate?.(30);
    store.confirmRound();
  }

  return (
    <>
      <FullOverlay title="Enter Scores">
        <div className="space-y-4">
          {players.map((p) => {
            const isCloser = p.id === closerId;
            const chips = isCloser ? CLOSER_CHIPS : CHIPS;
            const currentTotal = totals[p.id] || 0;
            const pending = store.tempScores[p.id];

            return (
              <div key={p.id} className="rounded-2xl bg-elevated p-3 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xl flex-shrink-0">
                      {p.emoji ?? "🙂"}
                    </div>
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-xs opacity-50">Total: {currentTotal} pts</div>
                    </div>
                  </div>
                  {isCloser && (
                    <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">
                      🏁 Closer
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {chips.map((c) => {
                    const selected = store.tempScores[p.id] === c;
                    return (
                      <button
                        key={c}
                        onClick={() => { navigator.vibrate?.(8); store.setTempScore(p.id, c); setValidErr(null); }}
                        className={`
                          rounded-xl font-semibold transition active:scale-[0.97]
                          ${c === 0 ? "col-span-3 py-3 text-xl" : "py-5 text-lg"}
                          ${selected
                            ? "bg-success text-black"
                            : c === 0
                              ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                              : "bg-card border border-white/10"
                          }
                        `}
                      >
                        {c}
                      </button>
                    );
                  })}

                  {!isCloser && (
                    <button
                      onClick={() => { setNumpad({ playerId: p.id }); setNumInput(""); }}
                      className="col-span-3 py-3 rounded-xl bg-card border border-dashed border-white/20 text-sm"
                    >
                      Custom
                    </button>
                  )}
                </div>

                {pending !== undefined && (
                  <div className={`mt-2 text-sm text-center font-semibold ${
                    currentTotal + pending > 100 ? "text-danger"
                    : currentTotal + pending >= 85 ? "text-orange-400"
                    : currentTotal + pending >= 70 ? "text-warning"
                    : "text-success/80"
                  }`}>
                    {currentTotal} + {pending} = {currentTotal + pending}
                    {currentTotal + pending > 100 && " 💀"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 sticky bottom-0 z-10 bg-[#171717] pt-3">
          {validErr && (
            <div className="mb-3 text-center text-sm text-danger">{validErr}</div>
          )}
          <button
            onClick={handleConfirm}
            className="w-full py-4 rounded-2xl bg-success text-black text-lg font-semibold shadow-green"
          >
            Confirm Round
          </button>
          <button
            onClick={store.endRoundStart}
            className="mt-2 w-full py-3 rounded-2xl bg-card border border-white/10 text-sm opacity-60"
          >
            ← Back
          </button>
        </div>
      </FullOverlay>

      {/* Numpad — portal to document.body to escape stacking contexts */}
      {numpad && createPortal(
        <div
          className="fixed inset-0 bg-black/70 flex items-end"
          style={{ zIndex: 9999 }}
          onClick={() => setNumpad(null)}
        >
          <motion.div
            className="w-full rounded-t-3xl bg-elevated border-t border-white/10 p-5 pb-10"
            initial={{ y: 48 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />

            <div className="text-center mb-5">
              <div className="text-xs opacity-50 mb-1">
                {store.players.find(p => p.id === numpad.playerId)?.name} ka score
              </div>
              <div className="text-5xl font-bold tracking-tight">
                {numInput === "" ? "—" : numInput}
              </div>
              <div className="text-xs opacity-50 mt-1">
                {Number(numInput) === 60 ? "Max reached" : "Max 60"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {[1,2,3,4,5,6,7,8,9].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    setNumInput((prev) => {
                      const next = prev === "0" ? String(d) : prev + d;
                      return Number(next) <= 60 ? next : prev;
                    })
                  }
                  className="py-5 rounded-2xl bg-card border border-white/10 text-2xl font-semibold active:scale-[0.96] transition"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setNumInput((prev) => prev.slice(0, -1))}
                className="py-5 rounded-2xl bg-card border border-white/10 text-xl active:scale-[0.96] transition"
              >
                ⌫
              </button>
              <button
                onClick={() =>
                  setNumInput((prev) => {
                    if (prev === "" || prev === "0") return "0";
                    const next = prev + "0";
                    return Number(next) <= 60 ? next : prev;
                  })
                }
                className="py-5 rounded-2xl bg-card border border-white/10 text-2xl font-semibold active:scale-[0.96] transition"
              >
                0
              </button>
              <button
                onClick={() => {
                  const v = Math.min(Number(numInput), 60);
                  if (!Number.isNaN(v) && v >= 0) {
                    navigator.vibrate?.(20);
                    store.setTempScore(numpad.playerId, v);
                    setValidErr(null);
                  }
                  setNumpad(null);
                }}
                className="py-5 rounded-2xl bg-success text-black text-xl font-bold active:scale-[0.96] transition"
              >
                ✓
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}
