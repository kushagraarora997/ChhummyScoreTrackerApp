import { motion } from "framer-motion";

export default function Splash({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        onAnimationComplete={() => setTimeout(onDone, 700)}
      >
        <div className="text-6xl">🃏</div>
        <div className="mt-3 text-2xl font-semibold">Chhummy Tracker</div>
        <div className="mt-1 text-sm opacity-70">Always Agitated Aroras</div>
      </motion.div>
    </div>
  );
}
