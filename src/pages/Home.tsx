import { motion } from "framer-motion";
import { useAppStore } from "../store/useAppStore";

export default function Home({
  onStartNew,
  onResume,
}: {
  onStartNew: () => void;
  onResume: () => void;
}) {
  const active = useAppStore((s) => s.activeSession);

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
            className="w-full py-4 rounded-2xl bg-card text-text border border-white/5 shadow-glow"
          >
            🔥 Start New Game
          </button>
        </div>

        <div className="mt-8 rounded-2xl bg-card p-4 border border-white/5">
          <div className="text-lg font-semibold">Quick Stats</div>
          <div className="mt-6 rounded-3xl bg-elevated border border-white/5 p-5">
  <div className="text-xl font-bold">
    🏆 Hall of Fame
  </div>

  <div className="mt-3 space-y-2 text-sm opacity-80">
    <div>👑 Mom — 12 wins</div>
    <div>🔥 Pops — 9 clutches</div>
    <div>😭 Hanz — most eliminations</div>
    <div>😂 Nanz — tum ho kaun Barkhurdar?</div>
  </div>
</div>
        </div>
        <div className="text-center text-[11px] opacity-40 mt-6 italic">
  “Ghar toot jaaye, par score yaad rehna chahiye.”
</div>
      </motion.div>
    </div>
  );
}
