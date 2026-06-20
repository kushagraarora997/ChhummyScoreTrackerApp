import { motion } from "framer-motion";

export default function Splash({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <motion.div
        className="text-center px-8"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        onAnimationComplete={() => setTimeout(onDone, 900)}
      >
        <div className="text-8xl mb-4">🃏</div>
        <div className="text-4xl font-bold tracking-tight">Chhummy Tracker</div>
        <div className="mt-3 text-sm font-semibold tracking-[0.25em] uppercase text-amber-400">
          Always Agitated Aroras
        </div>
      </motion.div>
    </div>
  );
}
