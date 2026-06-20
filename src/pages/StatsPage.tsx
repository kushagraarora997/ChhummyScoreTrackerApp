import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db, Player } from "../db";

interface PlayerStats {
  player: Player;
  wins: number;
  closes: number;
  eliminations: number;
  avgScore: number;
  roundsPlayed: number;
  bestStreak: number;
}

export default function StatsPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<PlayerStats[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [statsRow, allPlayers] = await Promise.all([
        db.stats.get("global"),
        db.players.toArray(),
      ]);

      if (!statsRow || allPlayers.length === 0) {
        setLoaded(true);
        return;
      }

      const t = statsRow.totals;
      const knownIds = new Set([
        ...Object.keys(t.wins),
        ...Object.keys(t.closes),
        ...Object.keys(t.eliminations),
      ]);

      const result: PlayerStats[] = [];
      for (const p of allPlayers) {
        if (!knownIds.has(p.id)) continue;
        result.push({
          player: p,
          wins: t.wins[p.id] || 0,
          closes: t.closes[p.id] || 0,
          eliminations: t.eliminations[p.id] || 0,
          avgScore: t.averageScore[p.id] || 0,
          roundsPlayed: t.survivalRounds[p.id] || 0,
          bestStreak: t.streaks.bestCloseStreak[p.id] || 0,
        });
      }

      result.sort((a, b) => b.wins - a.wins || b.closes - a.closes);
      setRows(result);
      setLoaded(true);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-background text-text p-4 pb-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-card border border-white/10"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Stats</h1>
        </div>

        {!loaded ? (
          <div className="text-center opacity-50 mt-20">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="text-center opacity-50 mt-20 italic">
            Abhi koi stats nahi. Pehle khelke aao! 🃏
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r, i) => (
              <div
                key={r.player.id}
                className="rounded-2xl bg-card border border-white/5 p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-3xl">{r.player.emoji ?? "🙂"}</div>
                  <div>
                    <div className="font-semibold text-lg">{r.player.name}</div>
                    {i === 0 && r.wins > 0 && (
                      <div className="text-xs text-amber-400 font-bold tracking-wide uppercase">
                        👑 Champion
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <StatBox label="Wins" value={r.wins} highlight={r.wins > 0} />
                  <StatBox label="Closes" value={r.closes} />
                  <StatBox label="Elim." value={r.eliminations} tone="danger" />
                  <StatBox label="Avg Score" value={r.avgScore} />
                  <StatBox label="Rounds" value={r.roundsPlayed} />
                  <StatBox label="Best Streak" value={r.bestStreak} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function StatBox({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl bg-elevated p-2">
      <div
        className={`text-xl font-bold ${
          highlight ? "text-success" : tone === "danger" ? "text-danger" : ""
        }`}
      >
        {value}
      </div>
      <div className="text-[10px] opacity-50 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}
