import FullOverlay from "../FullOverlay";
import { useAppStore } from "../../store/useAppStore";

export default function WhoClosed() {
  const session = useAppStore((s) => s.activeSession)!;
  const allPlayers = useAppStore((s) => s.players);
  const rounds = useAppStore((s) => s.rounds);
  const getTotals = useAppStore((s) => s.getTotals);
  const chooseCloser = useAppStore((s) => s.chooseCloser);
  const closeOverlay = useAppStore((s) => s.closeOverlay);

  const players = allPlayers.filter((p) => session.playerIds.includes(p.id));
  const totals = getTotals();
  const roundNumber = rounds.length + 1;

  return (
    <FullOverlay title="Kaun Jeeta Be? 👑">
      <div className="text-center text-xs opacity-40 -mt-1 mb-3">Round {roundNumber}</div>
      <div className="grid grid-cols-2 gap-3">
        {players.map((p, i) => {
          const total = totals[p.id] || 0;
          const eliminated = total > 100;
          const isLast = i === players.length - 1 && players.length % 2 !== 0;

          return (
            <button
              key={p.id}
              disabled={eliminated}
              onClick={() => { if (!eliminated) { navigator.vibrate?.(20); chooseCloser(p.id); } }}
              className={`
                h-32 rounded-2xl transition relative overflow-hidden
                flex flex-col items-center justify-center gap-1.5
                ${isLast ? "col-span-2" : ""}
                ${
                  eliminated
                    ? "bg-[#1a0b0b] border border-danger/20 opacity-40 cursor-not-allowed"
                    : total >= 85
                    ? "bg-[#1a0606] border border-danger/40 active:scale-[0.97]"
                    : total >= 70
                    ? "bg-[#17110a] border border-warning/30 active:scale-[0.97]"
                    : "bg-elevated border border-white/8 active:scale-[0.97]"
                }
              `}
            >
              {!eliminated && (
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              )}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-3xl ${
                eliminated ? "bg-white/5"
                : total >= 85 ? "bg-danger/15"
                : total >= 70 ? "bg-warning/15"
                : "bg-white/10"
              }`}>
                {p.emoji ?? "🙂"}
              </div>
              <div className="font-semibold text-[15px] leading-tight">{p.name}</div>
              <div className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${
                eliminated ? "bg-danger/20 text-danger"
                : total >= 85 ? "bg-danger/15 text-orange-400"
                : total >= 70 ? "bg-warning/15 text-warning"
                : "bg-white/8 text-white/40"
              }`}>
                {eliminated ? "💀 OUT" : `${total} pts`}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-center text-xs opacity-50 italic">
        "Jo 100 paar gaya… woh itihaas ban gaya 😭"
      </div>

      <button
        onClick={closeOverlay}
        className="mt-3 w-full py-3 rounded-2xl bg-card border border-white/10 text-sm opacity-60"
      >
        ← Cancel
      </button>
    </FullOverlay>
  );
}
