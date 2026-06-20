import { motion } from "framer-motion";

export default function FullOverlay({
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
              : tone === "success"
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
          <div className="text-center text-xl font-semibold">{title}</div>
        </div>
        <div className="pb-10">{children}</div>
      </motion.div>
    </motion.div>
  );
}
