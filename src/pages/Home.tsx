import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import { db, Player } from "../db";

interface HallEntry {
  name: string;
  emoji?: string;
  count: number;
}

interface HallData {
  topWinner: HallEntry | null;
  topCloser: HallEntry | null;
  mostEliminated: HallEntry | null;
  totalGames: number;
}

function findTop(record: Record<string, number>, playerMap: Map<string, Player>): HallEntry | null {
  let topId = "";
  let topCount = 0;
  for (const [id, count] of Object.entries(record)) {
    if (count > topCount) { topId = id; topCount = count; }
  }
  if (!topId) return null;
  const p = playerMap.get(topId);
  return { name: p?.name ?? "Unknown", emoji: p?.emoji, count: topCount };
}

export default function Home({
  onStartNew,
  onResume,
  onStats,
}: {
  onStartNew: () => void;
  onResume: () => void;
  onStats: () => void;
}) {
  const active = useAppStore((s) => s.activeSession);
  const [hall, setHall] = useState<HallData | null>(null);

  useEffect(() => {
    async function load() {
      const [statsRow, allPlayers] = await Promise.all([
        db.stats.get("global"),
        db.players.toArray(),
      ]);
      if (!statsRow) return;
      const t = statsRow.totals;
      const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
      const totalGames = Object.values(t.wins).reduce((s, v) => s + v, 0);
      setHall({
        topWinner: findTop(t.wins, playerMap),
        topCloser: findTop(t.closes, playerMap),
        mostEliminated: findTop(t.eliminations, playerMap),
        totalGames,
      });
    }
    load();
  }, []);

  return (
    <div className="p-4 pt-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black tracking-tight">Let's Play CHHUMMYYYY!!!</h1>
        <p className="text-sm opacity-60">Family battles. Legendary grudges.</p>

        <div className="mt-6 grid gap-3">
          {active?.status === "active" && (
            <button
              onClick={onResume}
              className="w-full py-4 rounded-2xl bg-elevated text-text shadow-glow active:scale-98 transition"
            >
              🎯 Continue Battle
            </button>
          )}
          <button
            onClick={onStartNew}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-lg shadow-amber active:scale-[0.98] transition"
          >
            🔥 Start New Game
          </button>
          <button
            onClick={onStats}
            className="w-full py-3 rounded-2xl bg-card text-text border border-white/5 text-sm opacity-80"
          >
            📊 Stats &amp; History
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-card p-4 border border-white/5">
          <div className="text-lg font-semibold">🏆 Hall of Fame</div>

          {hall && hall.totalGames > 0 ? (
            <div className="mt-3 space-y-2 text-sm opacity-80">
              {hall.topWinner && (
                <div>{hall.topWinner.emoji ?? "👑"} {hall.topWinner.name} — {hall.topWinner.count} win{hall.topWinner.count !== 1 ? "s" : ""}</div>
              )}
              {hall.topCloser && (
                <div>🎯 {hall.topCloser.name} — {hall.topCloser.count} close{hall.topCloser.count !== 1 ? "s" : ""}</div>
              )}
              {hall.mostEliminated && (
                <div>💀 {hall.mostEliminated.name} — {hall.mostEliminated.count} elimination{hall.mostEliminated.count !== 1 ? "s" : ""}</div>
              )}
              <div className="pt-1 opacity-50 text-xs">{hall.totalGames} game{hall.totalGames !== 1 ? "s" : ""} played total</div>
            </div>
          ) : (
            <div className="mt-3 text-sm opacity-50 italic">
              Koi data nahi abhi. Pehle khelke aao! 🃏
            </div>
          )}
        </div>

        {(!hall || hall.totalGames === 0) && (
          <div className="mt-4 rounded-2xl bg-card p-4 border border-white/5">
            <div className="text-sm font-semibold mb-3">📖 How to Close</div>
            <div className="space-y-2 text-sm opacity-70">
              <div>🃏 1 pure sequence (3 cards) mandatory</div>
              <div>✌️ Remaining deadwood ≤ 5 to close</div>
              <div>💀 100+ points = eliminated</div>
              <div>🏆 Last player under 100 wins</div>
            </div>
          </div>
        )}

        <div className="text-center text-[11px] opacity-40 mt-6 italic">
          "Ghar toot jaaye, par score yaad rehna chahiye."
        </div>
      </motion.div>
    </div>
  );
}
