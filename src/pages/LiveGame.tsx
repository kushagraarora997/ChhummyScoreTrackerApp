import { useMemo, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { motion, AnimatePresence } from "framer-motion";
import FullOverlay from "../components/FullOverlay";
import WinnerView from "../components/WinnerView";

const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20];
const CLOSER_CHIPS = [0, 1, 2, 3, 4, 5];

export default function LiveGame({
  onExit,
}: {
  onExit: () => void;
}) {
  const store = useAppStore();
  const session = store.activeSession;
  const rounds = store.rounds;
  const totals = store.getTotals();

  const players = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        emoji?: string;
      }
    >();

    store.players.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        name: p.name,
        emoji: p.emoji,
      });
    });

    return (
      session?.playerIds.map(
        (id) =>
          map.get(id) || {
            id,
            name: "Player",
            emoji: "🙂",
          }
      ) ?? []
    );
  }, [session, store.players]);

  if (!session) {
    return (
      <div className="p-4">
        <div className="text-lg">
          No active session.
        </div>

        <button
          onClick={onExit}
          className="mt-4 px-4 py-3 rounded-2xl bg-card border border-white/10"
        >
          Go Home
        </button>
      </div>
    );
  }

  const roundNumber = rounds.length + 1;

  const dealerId =
    session.playerIds[session.dealerIndex];

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
    store.ui.overlay.type === "enterScores"
      ? store.ui.overlay.closerId
      : undefined;

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

        <div className="text-xl font-semibold">
          Round {roundNumber}
        </div>

        <button
          onClick={store.undoLastRound}
          className="px-3 py-2 rounded-xl bg-card border border-white/10"
        >
          Undo
        </button>
      </div>

      <div className="mt-1 text-sm opacity-70">
        Dealer:{" "}
        {
          players.find(
            (p) => p.id === dealerId
          )?.name
        }
      </div>

      {/* Player Cards */}
      <div className="mt-4 grid gap-3">
        {sorted.map((p) => {
          const total = totals[p.id] || 0;

          const state = cardState(total);

          const isCloser =
            closerId === p.id;

          const wins =
            rounds.filter(
              (r) => r.closerId === p.id
            ).length;

          return (
            <motion.div
              layout
              key={p.id}
              className={`
                p-4
                rounded-2xl
                border
                ${
                  state === "eliminated"
                    ? "bg-[#1a0b0b] border-danger/30 opacity-60"
                    : "bg-elevated border-white/5"
                }
                ${
                  state === "warning"
                    ? "shadow-amber"
                    : state === "critical"
                    ? "shadow-red"
                    : isCloser
                    ? "shadow-green"
                    : "shadow-glow"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">
                    {p.emoji ?? "🙂"}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-lg font-semibold">
                        {p.name}
                      </div>

 <div className="
flex items-center gap-1
px-2 py-1
rounded-full
bg-yellow-500/10
text-yellow-400
text-xs
font-bold
border border-yellow-500/20
">
  🏆 {wins}
</div>
                    </div>

                    <div className="text-sm opacity-70">
                      Total: {total}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCloser && (
                    <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">
                      🏁 Closer
                    </span>
                  )}

                  {state === "warning" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-warning/20 text-warning">
                      70+
                    </span>
                  )}

                  {state === "critical" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-danger/20 text-danger animate-pulse">
                      85+
                    </span>
                  )}

                  {state ===
                    "eliminated" && (
                    <span className="px-2 py-1 rounded-full text-xs bg-danger text-white">
                      💀 OUT
                    </span>
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
          Round {roundNumber} • Live
          Score Tracker
        </div>

        <button
          onClick={store.endRoundStart}
          className="
            w-full
            py-4
            rounded-2xl
            bg-success
            text-black
            text-lg
            font-bold
            shadow-green
            active:scale-[0.98]
            transition
            flex
            items-center
            justify-center
            gap-2
          "
        >
          🎯 End Round #
          {roundNumber}
        </button>
      </div>

      <Overlays onExit={onExit} />
    </div>
  );
}

function Overlays({ onExit }: { onExit: () => void }) {
  const store = useAppStore();
  const [endGameConfirm, setEndGameConfirm] = useState(false);
  const [validErr, setValidErr] = useState<string | null>(null);
  const [numpad, setNumpad] = useState<{ playerId: string } | null>(null);
  const [numInput, setNumInput] = useState("");

  const session = store.activeSession;
  if (!session) return null;

  const players = store.players.filter(
    (p) =>
      session.playerIds.includes(p.id)
  );

  return (
    <AnimatePresence>
      {/* WHO CLOSED */}
      {store.ui.overlay.type ===
        "whoClosed" && (
        <FullOverlay title="Kaun Jeeta Be? 👑">
          <div className="grid grid-cols-2 gap-3">
            {players.map((p) => {
              const total =
                store.getTotals()[p.id] ||
                0;

              const eliminated =
                total >= 100;

              return (
                <button
                  key={p.id}
                  disabled={eliminated}
                  onClick={() => {
                    if (!eliminated) {
                      store.chooseCloser(
                        p.id
                      );
                    }
                  }}
                  className={`
                    h-24
                    rounded-2xl
                    transition
                    flex
                    flex-col
                    items-center
                    justify-center
                    ${
                      eliminated
                        ? "bg-[#1a0b0b] border border-danger/20 opacity-40 cursor-not-allowed"
                        : "bg-card border border-white/10 active:scale-[0.98]"
                    }
                  `}
                >
                  <div className="text-3xl">
                    {p.emoji ?? "🙂"}
                  </div>

                  <div className="mt-2 text-lg">
                    {p.name}
                  </div>

                  {eliminated && (
                    <div className="text-[10px] text-danger mt-1">
                      💀 OUT
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-center text-xs opacity-50 italic">
            “Jo 100 paar gaya… woh
            itihaas ban gaya 😭”
          </div>
        </FullOverlay>
      )}

      {/* ENTER SCORES */}
      {store.ui.overlay.type ===
        "enterScores" && (
        <FullOverlay title="Enter Scores">
          <div className="space-y-4">
            {players
              .filter((p) => {
                const total =
                  store.getTotals()[
                    p.id
                  ] || 0;

                return total < 100;
              })
              .map((p) => {
                const isCloser =
                  store.ui.overlay.type === "enterScores" &&
                  store.ui.overlay.closerId === p.id;
                const chips = isCloser ? CLOSER_CHIPS : CHIPS;

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-elevated p-3 border border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">{p.emoji ?? "🙂"}</div>
                        <div className="font-semibold">{p.name}</div>
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
                            onClick={() => {
                              store.setTempScore(p.id, c);
                              setValidErr(null);
                            }}
                            className={`
                              rounded-xl font-semibold transition active:scale-[0.97]
                              ${c === 0 ? "col-span-3 py-3 text-xl" : "py-4 text-lg"}
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

                      <button
                        onClick={() => {
                          setNumpad({ playerId: p.id });
                          setNumInput(
                            store.tempScores[p.id] !== undefined
                              ? String(store.tempScores[p.id])
                              : ""
                          );
                        }}
                        className={`${isCloser ? "col-span-3" : ""} py-4 rounded-xl bg-card border border-dashed border-white/20 text-sm`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="mt-6 sticky bottom-0 bg-inherit pt-3">
            {validErr && (
              <div className="mb-3 text-center text-sm text-danger">
                {validErr}
              </div>
            )}
            <button
              onClick={() => {
                const alivePlayers = players.filter(
                  (p) => (store.getTotals()[p.id] || 0) < 100
                );
                const missing = alivePlayers.some(
                  (p) => store.tempScores[p.id] === undefined
                );
                if (missing) {
                  setValidErr("Sabka score daal pehle 😭");
                  return;
                }
                const cId =
                  store.ui.overlay.type === "enterScores"
                    ? store.ui.overlay.closerId
                    : undefined;
                if (cId && store.tempScores[cId] > 5) {
                  setValidErr("Closer 5 se zyada score nahi ho sakta 😭");
                  return;
                }
                setValidErr(null);
                store.confirmRound();
              }}
              className="w-full py-4 rounded-2xl bg-success text-black text-lg font-semibold shadow-green"
            >
              Confirm Round
            </button>
          </div>
        </FullOverlay>
      )}

      {/* ELIMINATION */}
      {store.ui.overlay.type ===
        "eliminated" && (
        <FullOverlay
          title="Eliminated"
          tone="danger"
        >
          <div className="text-center">
            <div className="text-3xl mb-2">
              🔴{" "}
              {
                store.ui.overlay
                  .name
              }{" "}
              ELIMINATED
            </div>

            <div className="opacity-80 mb-4">
              Reached{" "}
              {
                store.ui.overlay
                  .total
              }
            </div>

            <div className="italic opacity-70">
              “Ye dukh kahe khatam
              nahi hota 😭”
            </div>

            <button
              onClick={
                store.closeOverlay
              }
              className="mt-6 w-full py-3 rounded-2xl bg-card border border-white/10"
            >
              Continue
            </button>
          </div>
        </FullOverlay>
      )}

      {/* WINNER */}
      {store.ui.overlay.type ===
        "winner" && (
        <FullOverlay
          title="Session Winner"
          tone="success"
        >
          <WinnerView
            onClose={
              store.closeOverlay
            }
          />
        </FullOverlay>
      )}

      {/* PAUSE */}
      {store.ui.overlay.type === "pause" && (
        <FullOverlay title={endGameConfirm ? "End Game?" : "Game Paused ⏸"}>
          {endGameConfirm ? (
            <div className="grid gap-3">
              <p className="text-center text-sm opacity-60 mb-1">
                Session band ho jayega. Scores ud jayenge.
              </p>
              <button
                onClick={() => {
                  onExit();
                  store.abandonSession();
                }}
                className="w-full py-4 rounded-2xl bg-danger text-white text-lg font-semibold"
              >
                Haan, band karo
              </button>
              <button
                onClick={() => setEndGameConfirm(false)}
                className="w-full py-3 rounded-2xl bg-card border border-white/10"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              <button
                onClick={() => { setEndGameConfirm(false); store.closeOverlay(); }}
                className="w-full py-4 rounded-2xl bg-green-500 text-black text-lg font-semibold"
              >
                Resume Game
              </button>
              <button
                onClick={() => setEndGameConfirm(true)}
                className="w-full py-3 rounded-2xl bg-card border border-danger/40 text-danger"
              >
                End Game
              </button>
            </div>
          )}
        </FullOverlay>
      )}
      {/* CUSTOM SCORE NUMPAD */}
      {numpad && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setNumpad(null)}
        >
          <motion.div
            className="w-full rounded-t-3xl bg-elevated border-t border-white/10 p-5 pb-10"
            initial={{ y: 32 }}
            animate={{ y: 0 }}
            exit={{ y: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />

            {/* Display */}
            <div className="text-center mb-5">
              <div className="text-5xl font-bold tracking-tight">
                {numInput === "" ? "—" : numInput}
              </div>
              <div className="text-xs opacity-50 mt-1">Custom score</div>
            </div>

            {/* Numpad grid */}
            <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
              {[1,2,3,4,5,6,7,8,9].map((d) => (
                <button
                  key={d}
                  onClick={() =>
                    setNumInput((prev) =>
                      (prev + d).length <= 3 ? prev + d : prev
                    )
                  }
                  className="py-5 rounded-2xl bg-card border border-white/10 text-2xl font-semibold active:scale-[0.96] transition"
                >
                  {d}
                </button>
              ))}
              {/* Bottom row: backspace | 0 | confirm */}
              <button
                onClick={() => setNumInput((prev) => prev.slice(0, -1))}
                className="py-5 rounded-2xl bg-card border border-white/10 text-xl active:scale-[0.96] transition"
              >
                ⌫
              </button>
              <button
                onClick={() =>
                  setNumInput((prev) =>
                    prev.length < 3 ? prev + "0" : prev
                  )
                }
                className="py-5 rounded-2xl bg-card border border-white/10 text-2xl font-semibold active:scale-[0.96] transition"
              >
                0
              </button>
              <button
                onClick={() => {
                  const v = Number(numInput);
                  if (!Number.isNaN(v) && v >= 0) {
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

