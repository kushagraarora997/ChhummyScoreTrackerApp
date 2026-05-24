import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { motion, AnimatePresence } from "framer-motion";

const CHIPS = [0, 1, 2, 3, 4, 5, 10, 15, 20];

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
          onClick={onExit}
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

      <Overlays />
    </div>
  );
}

function Overlays() {
  const store = useAppStore();

  const session = store.activeSession!;

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
              .map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-elevated p-3 border border-white/5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">
                        {p.emoji ?? "🙂"}
                      </div>

                      <div className="font-semibold">
                        {p.name}
                      </div>
                    </div>

                    {store.ui.overlay
                      .type ===
                      "enterScores" &&
                      store.ui.overlay
                        .closerId ===
                        p.id && (
                        <span className="px-2 py-1 rounded-full text-xs bg-success/20 text-success">
                          🏁 Closer
                        </span>
                      )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {CHIPS.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          store.setTempScore(
                            p.id,
                            c
                          )
                        }
                        className={`
                          py-4
                          rounded-xl
                          text-lg
                          font-semibold
                          transition
                          active:scale-[0.97]
                          ${
                            store
                              .tempScores[
                              p.id
                            ] === c
                              ? "bg-success text-black"
                              : "bg-card border border-white/10"
                          }
                        `}
                      >
                        {c}
                      </button>
                    ))}

                    <button
                      onClick={() => {
                        const v = Number(
                          prompt(
                            "Custom score"
                          ) || "0"
                        );

                        if (
                          !Number.isNaN(v) &&
                          v >= 0
                        ) {
                          store.setTempScore(
                            p.id,
                            v
                          );
                        }
                      }}
                      className="py-4 rounded-xl bg-card border border-dashed border-white/20 text-sm"
                    >
                      Custom
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 sticky bottom-0 bg-inherit pt-3">
            <button
              onClick={() => {
                const alivePlayers =
                  players.filter((p) => {
                    const total =
                      store.getTotals()[
                        p.id
                      ] || 0;

                    return total < 100;
                  });

                const missing =
                  alivePlayers.some(
                    (p) =>
                      store.tempScores[
                        p.id
                      ] === undefined
                  );

                if (missing) {
                  alert(
                    "Bhai sabka score daal 😭"
                  );
                  return;
                }

                const closerId =
                  store.ui.overlay
                    .type ===
                  "enterScores"
                    ? store.ui.overlay
                        .closerId
                    : undefined;

                if (closerId) {
                  const closerScore =
                    store.tempScores[
                      closerId
                    ];

                  if (
                    closerScore > 5
                  ) {
                    alert(
                      "Closer 5 se upar score daalke jeet nahi sakta 😭"
                    );
                    return;
                  }
                }

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
    </AnimatePresence>
  );
}

function FullOverlay({
  children,
  title,
  tone,
}: {
  children: React.ReactNode;
  title: string;
  tone?: "success" | "danger";
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`
          w-full
          max-h-[92vh]
          overflow-y-auto
          overscroll-contain
          rounded-t-3xl
          p-4
          ${
            tone === "danger"
              ? "bg-[#1a0b0b]"
              : tone ===
                "success"
              ? "bg-[#0b1a12]"
              : "bg-elevated"
          }
          border-t border-white/10
        `}
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        exit={{ y: 24 }}
      >
        <div className="sticky top-0 z-10 bg-inherit pb-3">
          <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-3" />

          <div className="text-center text-xl font-semibold">
            {title}
          </div>
        </div>

        <div className="pb-10">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

function WinnerView({
  onClose,
}: {
  onClose: () => void;
}) {
  const s = useAppStore();

  const { winnerId, summary } =
    s.ui.overlay.type === "winner"
      ? s.ui.overlay
      : {
          winnerId: "",
          summary: {
            rounds: 0,
            closes: 0,
            final: 0,
          },
        };

  const winner = s.players.find(
    (p) => p.id === winnerId
  );

  return (
    <div className="text-center">
      <div className="text-4xl">
        👑 {winner?.name} SURVIVES
      </div>

      <div className="mt-3 opacity-80">
        {summary.rounds} rounds
        endured •{" "}
        {summary.closes} closes •
        Final: {summary.final}
      </div>

      <div className="mt-2 italic opacity-70">
        “Clutch maar diya”
      </div>

      <div className="mt-6 grid gap-2">
        <button className="w-full py-3 rounded-2xl bg-success text-black font-semibold">
          Share Result Card (PNG)
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-card border border-white/10"
        >
          Close
        </button>
      </div>
    </div>
  );
}