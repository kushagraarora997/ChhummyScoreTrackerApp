import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";
import type { Player } from "../db";
import { getGlobalStats, getPlayers } from "../db/operations";

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
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const [statsRow, allPlayers] = await Promise.all([
        getGlobalStats(),
        getPlayers(),
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
            className="w-full py-3 rounded-2xl bg-card text-text border border-white/10 text-base font-medium"
          >
            📊 Stats &amp; History
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-card p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">🏆 Hall of Fame</div>
            {hall && hall.totalGames > 0 && (
              <div className="text-xs opacity-40">{hall.totalGames} game{hall.totalGames !== 1 ? "s" : ""}</div>
            )}
          </div>

          {hall && hall.totalGames > 0 ? (
            <div className="space-y-2">
              {hall.topWinner && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-yellow-500/8 border border-yellow-500/15">
                  <span className="text-xl">{hall.topWinner.emoji ?? "👑"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{hall.topWinner.name}</div>
                    <div className="text-xs text-yellow-400 font-medium">{hall.topWinner.count} win{hall.topWinner.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-xs text-yellow-500 font-bold uppercase tracking-wide">Champion</span>
                </div>
              )}
              {hall.topCloser && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-amber-500/8 border border-amber-500/15">
                  <span className="text-xl">🎯</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{hall.topCloser.name}</div>
                    <div className="text-xs text-amber-400">{hall.topCloser.count} close{hall.topCloser.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-xs text-amber-500 font-bold uppercase tracking-wide">Closer</span>
                </div>
              )}
              {hall.mostEliminated && (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-red-500/8 border border-red-500/15">
                  <span className="text-xl">💀</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{hall.mostEliminated.name}</div>
                    <div className="text-xs text-red-400">{hall.mostEliminated.count} elimination{hall.mostEliminated.count !== 1 ? "s" : ""}</div>
                  </div>
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wide">Patsy</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm opacity-50 italic">
              Koi data nahi abhi. Pehle khelke aao! 🃏
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-card border border-white/5 overflow-hidden">
          <button
            onClick={() => setRulesOpen((o) => !o)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="text-sm font-semibold">📖 How to Close</div>
            <div className="text-xs opacity-40">{rulesOpen ? "▲" : "▼"}</div>
          </button>
          {rulesOpen && (
            <div className="px-4 pb-4 space-y-2 text-sm opacity-70 border-t border-white/5 pt-3">
              <div>🃏 1 pure sequence (3 cards) mandatory</div>
              <div>✌️ Remaining deadwood ≤ 5 to close</div>
              <div>💀 100+ points = eliminated</div>
              <div>🏆 Last player under 100 wins</div>
            </div>
          )}
        </div>

        <div className="text-center text-sm opacity-60 mt-6 italic">
          "Ghar toot jaaye, par score yaad rehna chahiye."
        </div>
      </motion.div>
    </div>
  );
}
