import { motion } from "framer-motion";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { useAppStore } from "../../store/useAppStore";

export default function PlayerHistorySheet({
  playerId,
  onClose,
}: {
  playerId: string;
  onClose: () => void;
}) {
  const store = useAppStore();
  const player = store.players.find((p) => p.id === playerId);
  const rounds = store.rounds;

  const rows = rounds.map((r) => ({
    number: r.number,
    score: r.scores[playerId] ?? 0,
    total: r.totals[playerId] ?? 0,
    closed: r.closerId === playerId,
  }));

  const totalNow = rows[rows.length - 1]?.total ?? 0;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#111111] rounded-t-3xl border-t border-white/8 px-4 pt-5 pb-10 max-h-[70vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-2xl">
              {player?.emoji ?? "🙂"}
            </div>
            <div>
              <div className="font-semibold text-lg">{player?.name}</div>
              <div className="text-xs opacity-50">{rows.length} rounds played</div>
            </div>
          </div>
          <div className={`text-2xl font-black tabular-nums ${totalNow >= 100 ? "text-danger" : totalNow >= 85 ? "text-danger" : totalNow >= 70 ? "text-warning" : "opacity-80"}`}>
            {totalNow}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center opacity-50 py-8 text-sm italic">No rounds yet</div>
        ) : (
          <>
          {rows.length > 1 && (
            <div className="mb-4">
              <div className="text-[10px] opacity-35 mb-1 uppercase tracking-wide">Score per round</div>
              <ResponsiveContainer width="100%" height={56}>
                <BarChart data={rows.map((r) => ({ name: `#${r.number}`, score: r.score }))} margin={{ top: 0, right: 0, bottom: 0, left: -32 }}>
                  <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 8, fontSize: 11 }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                    {rows.map((r) => (
                      <Cell
                        key={r.number}
                        fill={r.score === 0 ? "#22C55E" : r.score <= 10 ? "#60A5FA" : r.score >= 30 ? "#EF4444" : "#F59E0B"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-2">
            {rows.map((r) => {
              const dangerTotal = r.total > 100;
              const critTotal = r.total >= 85;
              const warnTotal = r.total >= 70;
              return (
                <div
                  key={r.number}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                    dangerTotal ? "bg-red-500/10 border border-red-500/20"
                    : critTotal ? "bg-orange-500/10 border border-orange-500/20"
                    : warnTotal ? "bg-amber-500/10 border border-amber-500/20"
                    : "bg-elevated border border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-40 w-6 tabular-nums">#{r.number}</span>
                    {r.closed && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-success/20 text-success">🏁 Closed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm tabular-nums">
                    <span className="opacity-60">+{r.score}</span>
                    <span className={`font-bold ${dangerTotal ? "text-danger" : critTotal ? "text-orange-400" : warnTotal ? "text-warning" : ""}`}>
                      → {r.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </motion.div>
    </>
  );
}
