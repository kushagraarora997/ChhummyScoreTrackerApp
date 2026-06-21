import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { db, Player, Session, Round } from "../db";

interface H2HRecord {
  playerA: Player;
  playerB: Player;
  winsA: number;
  winsB: number;
  total: number;
}

type Tab = "stats" | "history" | "charts";

interface PlayerStats {
  player: Player;
  wins: number;
  closes: number;
  eliminations: number;
  avgScore: number;
  roundsPlayed: number;
  bestStreak: number;
  achievements: Record<string, number>;
}

interface SessionRow {
  session: Session;
  winnerName: string;
  winnerEmoji: string;
  playerNames: string[];
  roundCount: number;
}

const ACHIEVEMENT_META: Record<string, { emoji: string; label: string }> = {
  ICE_COLD:     { emoji: "🥶", label: "Ice Cold" },
  UNTOUCHABLE:  { emoji: "🛡️", label: "Untouchable" },
  SURVIVOR:     { emoji: "💪", label: "Survivor" },
  CLUTCH_MASTER:{ emoji: "🎯", label: "Clutch Master" },
  PATSY:        { emoji: "🤡", label: "Patsy" },
};

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function StatsPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("stats");
  const [rows, setRows] = useState<PlayerStats[]>([]);
  const [history, setHistory] = useState<SessionRow[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Round[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map());
  const [h2h, setH2h] = useState<H2HRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      const [statsRow, allPlayers, allAchievements, completedSessions] = await Promise.all([
        db.stats.get("global"),
        db.players.toArray(),
        db.achievements.toArray(),
        db.sessions.where("status").equals("completed").sortBy("startedAt"),
      ]);

      const pMap = new Map(allPlayers.map((p) => [p.id, p]));
      setPlayerMap(pMap);

      // ── Stats rows ──────────────────────────────────────────────────
      const achievesByPlayer: Record<string, Record<string, number>> = {};
      for (const a of allAchievements) {
        if (!achievesByPlayer[a.playerId]) achievesByPlayer[a.playerId] = {};
        achievesByPlayer[a.playerId][a.key] = (achievesByPlayer[a.playerId][a.key] || 0) + 1;
      }

      if (statsRow) {
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
            achievements: achievesByPlayer[p.id] || {},
          });
        }
        result.sort((a, b) => b.wins - a.wins || b.closes - a.closes);
        setRows(result);
      }

      // ── History rows ─────────────────────────────────────────────────
      const sessionsDesc = [...completedSessions].reverse();
      const roundCounts = await Promise.all(
        sessionsDesc.map((s) =>
          db.rounds.where("sessionId").equals(s.id).count()
        )
      );
      setHistory(
        sessionsDesc.map((s, i) => {
          const w = s.winnerId ? pMap.get(s.winnerId) : undefined;
          return {
            session: s,
            winnerName: w?.name ?? "Unknown",
            winnerEmoji: w?.emoji ?? "👑",
            playerNames: s.playerIds.map((id) => pMap.get(id)?.name ?? "?"),
            roundCount: roundCounts[i],
          };
        })
      );

      // ── Head-to-Head ────────────────────────────────────────────────
      const pairMap: Record<string, { winsA: number; winsB: number; total: number }> = {};
      for (const s of completedSessions) {
        if (!s.winnerId) continue;
        const ids = [...s.playerIds].sort();
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const key = `${ids[i]}__${ids[j]}`;
            if (!pairMap[key]) pairMap[key] = { winsA: 0, winsB: 0, total: 0 };
            pairMap[key].total++;
            if (s.winnerId === ids[i]) pairMap[key].winsA++;
            else if (s.winnerId === ids[j]) pairMap[key].winsB++;
          }
        }
      }
      const h2hRows: H2HRecord[] = [];
      for (const [key, rec] of Object.entries(pairMap)) {
        if (rec.total < 2) continue;
        const [idA, idB] = key.split("__");
        const pA = pMap.get(idA);
        const pB = pMap.get(idB);
        if (pA && pB) h2hRows.push({ playerA: pA, playerB: pB, ...rec });
      }
      h2hRows.sort((a, b) => b.total - a.total);
      setH2h(h2hRows);

      setLoaded(true);
    }
    load();
  }, []);

  async function expandSession(sessionId: string) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }
    const rounds = await db.rounds
      .where("sessionId")
      .equals(sessionId)
      .sortBy("number");
    setExpandedRounds(rounds);
    setExpandedSession(sessionId);
  }

  const chartData = rows.map((r) => ({
    name: r.player.name,
    Wins: r.wins,
    Closes: r.closes,
    Eliminations: r.eliminations,
  }));

  const winsChartData = chartData.filter((d) => d.Wins > 0);

  return (
    <div className="min-h-screen bg-background text-text pb-12">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 pt-6 pb-3">
          <button
            onClick={onBack}
            className="px-3 py-2 rounded-xl bg-card border border-white/10"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Stats</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mb-4">
          {(["stats", "history", "charts"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition ${
                tab === t
                  ? "bg-success text-black"
                  : "bg-card border border-white/10 opacity-60"
              }`}
            >
              {t === "stats" ? "Players" : t === "history" ? "History" : "Charts"}
            </button>
          ))}
        </div>

        {!loaded ? (
          <div className="text-center opacity-50 mt-20">Loading...</div>
        ) : (
          <div className="px-4">
            {/* ── STATS TAB ── */}
            {tab === "stats" && (
              rows.length === 0 ? (
                <div className="text-center opacity-50 mt-20 italic">
                  Khelke aao pehle! 🃏
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.map((r, i) => (
                    <div key={r.player.id} className="rounded-2xl bg-card border border-white/5 p-4">
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

                      <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <StatBox label="Wins" value={r.wins} highlight={r.wins > 0} />
                        <StatBox label="Closes" value={r.closes} />
                        <StatBox label="Elim." value={r.eliminations} tone="danger" />
                        <StatBox label="Avg Score" value={Number.isInteger(r.avgScore) ? r.avgScore : r.avgScore.toFixed(1)} />
                        <StatBox label="Rounds" value={r.roundsPlayed} />
                        <StatBox label="Best Streak" value={r.bestStreak} />
                      </div>

                      {Object.keys(r.achievements).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {Object.entries(r.achievements).map(([key, count]) => {
                            const meta = ACHIEVEMENT_META[key];
                            if (!meta) return null;
                            return (
                              <span
                                key={key}
                                className="px-2 py-1 rounded-full text-xs bg-elevated border border-white/10"
                              >
                                {meta.emoji} {meta.label}{count > 1 ? ` ×${count}` : ""}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── HEAD-TO-HEAD (shown in Players tab) ── */}
            {tab === "stats" && h2h.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-semibold mb-3 opacity-70 uppercase tracking-wide">
                  Head-to-Head
                </div>
                <div className="space-y-3">
                  {h2h.map((r) => {
                    const totalWins = r.winsA + r.winsB;
                    const fracA = totalWins > 0 ? r.winsA / totalWins : 0.5;
                    const leadA = r.winsA > r.winsB;
                    const leadB = r.winsB > r.winsA;
                    return (
                      <div key={`${r.playerA.id}__${r.playerB.id}`} className="rounded-2xl bg-card border border-white/5 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`flex items-center gap-2 ${leadA ? "" : "opacity-60"}`}>
                            <span className="text-2xl">{r.playerA.emoji ?? "🙂"}</span>
                            <div>
                              <div className="text-sm font-semibold">{r.playerA.name}</div>
                              <div className={`text-lg font-black ${leadA ? "text-success" : ""}`}>{r.winsA}W</div>
                            </div>
                          </div>
                          <div className="text-xs opacity-40 font-semibold">{r.total} games</div>
                          <div className={`flex items-center gap-2 text-right ${leadB ? "" : "opacity-60"}`}>
                            <div>
                              <div className="text-sm font-semibold">{r.playerB.name}</div>
                              <div className={`text-lg font-black ${leadB ? "text-success" : ""}`}>{r.winsB}W</div>
                            </div>
                            <span className="text-2xl">{r.playerB.emoji ?? "🙂"}</span>
                          </div>
                        </div>
                        {/* Win bar */}
                        <div className="h-2 rounded-full bg-elevated overflow-hidden flex">
                          <div className="h-full bg-success/70 rounded-l-full transition-all" style={{ width: `${fracA * 100}%` }} />
                          <div className="h-full bg-white/20 rounded-r-full flex-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── HISTORY TAB ── */}
            {tab === "history" && (
              history.length === 0 ? (
                <div className="text-center opacity-50 mt-20 italic">
                  Koi game complete nahi hua abhi! 🃏
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.session.id} className="rounded-2xl bg-card border border-white/5">
                      <button
                        className="w-full p-4 text-left"
                        onClick={() => expandSession(h.session.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold">
                              {h.winnerEmoji} {h.winnerName} won
                            </div>
                            <div className="text-xs opacity-50 mt-0.5">
                              {h.playerNames.join(", ")} • {h.roundCount} rounds
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs opacity-50">
                              {formatDate(h.session.startedAt)}
                            </div>
                            <div className="text-xs opacity-40 mt-1">
                              {expandedSession === h.session.id ? "▲" : "▼"}
                            </div>
                          </div>
                        </div>
                      </button>

                      {expandedSession === h.session.id && (
                        <div className="border-t border-white/5 px-4 pb-4 pt-3">
                          <div className="space-y-2">
                            {expandedRounds.map((r) => {
                              const closer = playerMap.get(r.closerId);
                              return (
                                <div key={r.id} className="rounded-xl bg-elevated p-3">
                                  <div className="text-xs font-semibold mb-2 opacity-70">
                                    Round {r.number} — closed by {closer?.emoji} {closer?.name}
                                  </div>
                                  <div className="space-y-1">
                                    {h.session.playerIds.map((pid) => {
                                      const p = playerMap.get(pid);
                                      const score = r.scores[pid] ?? 0;
                                      const total = r.totals[pid] ?? 0;
                                      const elim = total >= 100;
                                      return (
                                        <div key={pid} className="flex items-center justify-between text-xs">
                                          <span className="opacity-60">{p?.emoji} {p?.name}</span>
                                          <span className={elim ? "text-danger font-semibold" : total >= 85 ? "text-orange-400" : total >= 70 ? "text-warning" : "opacity-80"}>
                                            +{score} → {total}{elim ? " 💀" : ""}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ── CHARTS TAB ── */}
            {tab === "charts" && (
              chartData.length === 0 ? (
                <div className="text-center opacity-50 mt-20 italic">
                  Data nahi hai abhi! 🃏
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl bg-card border border-white/5 p-4">
                    <div className="text-sm font-semibold mb-4 opacity-70 uppercase tracking-wide">
                      Wins per Player
                    </div>
                    {winsChartData.length === 0 ? (
                      <div className="text-center opacity-40 py-8 text-sm italic">No wins yet</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={winsChartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                          <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, Math.max(...winsChartData.map(d => d.Wins), 1) + 1]} />
                          <Tooltip
                            contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12, fontSize: 12 }}
                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          />
                          <Bar dataKey="Wins" radius={[6, 6, 0, 0]}>
                            {winsChartData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? "#22C55E" : "#374151"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="rounded-2xl bg-card border border-white/5 p-4">
                    <div className="text-sm font-semibold mb-4 opacity-70 uppercase tracking-wide">
                      Closes vs Eliminations
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                        <XAxis dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: "#111", border: "1px solid #333", borderRadius: 12, fontSize: 12 }}
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11, opacity: 0.6 }} />
                        <Bar dataKey="Closes" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Eliminations" fill="#EF4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            )}
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
  value: number | string;
  highlight?: boolean;
  tone?: "danger";
}) {
  return (
    <div className="rounded-xl bg-elevated p-2">
      <div className={`text-xl font-bold ${highlight ? "text-success" : tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </div>
      <div className="text-[10px] opacity-50 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}
