import { useRef, useState } from "react";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { useAppStore } from "../store/useAppStore";

export default function WinnerView({ onClose }: { onClose: () => void }) {
  const s = useAppStore();
  const hiddenCardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const { winnerId, summary } =
    s.ui.overlay.type === "winner"
      ? s.ui.overlay
      : { winnerId: "", summary: { rounds: 0, closes: 0, final: 0 } };

  const winner = s.players.find((p) => p.id === winnerId);
  const totals = s.getTotals();
  const sessionPlayers = s.players.filter((p) => s.activeSession?.playerIds.includes(p.id));
  const ranked = [...sessionPlayers].sort((a, b) => (totals[a.id] ?? 0) - (totals[b.id] ?? 0));

  async function handleShare() {
    if (!hiddenCardRef.current || sharing) return;
    setSharing(true);
    setShareErr(null);
    try {
      const canvas = await html2canvas(hiddenCardRef.current, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: hiddenCardRef.current.offsetWidth,
        height: hiddenCardRef.current.offsetHeight,
      });

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error("Canvas capture failed")); return; }
          try {
            const file = new File([blob], "chhummy-result.png", { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `${winner?.name} wins Chhummy!`,
                text: `${summary.rounds} rounds • ${summary.closes} closes • Always Agitated Aroras 🃏`,
              });
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "chhummy-result.png";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            resolve();
          } catch (e) {
            reject(e);
          }
        }, "image/png");
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Share failed";
      if (!msg.includes("AbortError") && !msg.includes("cancel")) {
        setShareErr("Share nahi ho raha. Screenshot le lo manually 📸");
      }
    } finally {
      setSharing(false);
    }
  }

  const font = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <div className="text-center">
      {/* Visible card — Tailwind, for display only */}
      <div style={{ backgroundColor: "#050505" }} className="rounded-2xl p-6 mb-4">
        <motion.div
          className="text-5xl mb-3"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.35, 1.0], opacity: 1 }}
          transition={{ duration: 0.55, times: [0, 0.6, 1], ease: "easeOut" }}
        >
          {winner?.emoji ?? "👑"}
        </motion.div>
        <motion.div
          className="text-3xl font-black tracking-tight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {winner?.name} — Chhummy Champion
        </motion.div>
        <div className="mt-2 text-sm text-amber-400 uppercase tracking-widest font-semibold">
          Always Agitated Aroras
        </div>

        <div className="mt-5 space-y-2">
          {ranked.map((p, i) => {
            const total = totals[p.id] ?? 0;
            const isWinner = p.id === winnerId;
            const isElim = total >= 100;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between px-3 py-2 rounded-xl ${
                  isWinner
                    ? "bg-yellow-500/15 border border-yellow-500/30"
                    : isElim
                    ? "bg-red-500/10 border border-red-500/20 opacity-70"
                    : "bg-white/5 border border-white/8"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs opacity-50 w-4">{i + 1}</span>
                  <span className="text-lg">{p.emoji ?? "🙂"}</span>
                  <span className={`text-sm font-semibold ${isWinner ? "text-yellow-300" : ""}`}>{p.name}</span>
                  {isElim && <span className="text-xs text-red-400">💀</span>}
                </div>
                <span className={`text-sm font-bold tabular-nums ${isWinner ? "text-yellow-300" : isElim ? "text-red-400" : "opacity-80"}`}>
                  {total} pts
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center gap-6 text-center pt-3 border-t border-white/8">
          <div>
            <div className="text-xl font-bold">{summary.rounds}</div>
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Rounds</div>
          </div>
          <div>
            <div className="text-xl font-bold">{summary.closes}</div>
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Closes</div>
          </div>
        </div>
        <div className="mt-4 text-sm italic opacity-60">"Clutch maar diya" 🃏</div>
      </div>

      {shareErr && (
        <div className="mb-3 text-sm text-warning text-center">{shareErr}</div>
      )}

      <div className="grid gap-2">
        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full py-3 rounded-2xl bg-success text-black font-semibold disabled:opacity-50"
        >
          {sharing ? "Saving..." : "📤 Share Result Card"}
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-card border border-white/10"
        >
          Back to Home
        </button>
      </div>

      {/* Off-screen card for html2canvas — NO flexbox (html2canvas doesn't support it); use tables + floats */}
      <div
        ref={hiddenCardRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "320px",
          backgroundColor: "#050505",
          padding: "24px",
          borderRadius: "20px",
          fontFamily: font,
          color: "#F5F5F5",
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{winner?.emoji ?? "👑"}</div>
          <div style={{ fontSize: "26px", fontWeight: 900, letterSpacing: "-0.5px" }}>
            {winner?.name} — Chhummy Champion
          </div>
          <div style={{ fontSize: "11px", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "3px", fontWeight: 700, marginTop: "6px" }}>
            Always Agitated Aroras
          </div>
        </div>

        {/* Player rows — table layout so html2canvas handles left/right columns correctly */}
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", marginBottom: "10px" }}>
          <tbody>
            {ranked.map((p, i) => {
              const total = totals[p.id] ?? 0;
              const isWinner = p.id === winnerId;
              const isElim = total >= 100;
              const nameColor = isWinner ? "#FDE68A" : "#F5F5F5";
              const ptsColor = isWinner ? "#FDE68A" : isElim ? "#F87171" : "rgba(255,255,255,0.8)";
              return (
                <tr key={p.id}>
                  <td
                    colSpan={2}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "12px",
                      backgroundColor: isWinner ? "rgba(234,179,8,0.15)" : isElim ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isWinner ? "rgba(234,179,8,0.30)" : isElim ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.08)"}`,
                      opacity: isElim ? 0.7 : 1,
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ width: "20px", fontSize: "11px", color: "rgba(255,255,255,0.4)", verticalAlign: "middle" }}>{i + 1}</td>
                          <td style={{ width: "26px", fontSize: "20px", verticalAlign: "middle" }}>{p.emoji ?? "🙂"}</td>
                          <td style={{ fontSize: "14px", fontWeight: 600, color: nameColor, verticalAlign: "middle" }}>
                            {p.name}{isElim ? " 💀" : ""}
                          </td>
                          <td style={{ fontSize: "14px", fontWeight: 700, color: ptsColor, textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            {total} pts
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Stats row — table for side-by-side layout */}
        <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginTop: "4px" }}>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", paddingTop: "12px" }}>
                <div style={{ fontSize: "22px", fontWeight: 700 }}>{summary.rounds}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>Rounds</div>
              </td>
              <td style={{ textAlign: "center", paddingTop: "12px" }}>
                <div style={{ fontSize: "22px", fontWeight: 700 }}>{summary.closes}</div>
                <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>Closes</div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ textAlign: "center", fontSize: "13px", color: "rgba(255,255,255,0.55)", fontStyle: "italic", marginTop: "14px" }}>
          "Clutch maar diya" 🃏
        </div>
      </div>
    </div>
  );
}
