import { useRef, useState } from "react";
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
        <div className="text-5xl mb-3">{winner?.emoji ?? "👑"}</div>
        <div className="text-3xl font-black tracking-tight">{winner?.name} SURVIVES</div>
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

      {/* Off-screen card for html2canvas — explicit inline styles, no Tailwind opacity modifiers */}
      <div
        ref={hiddenCardRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "320px",
          backgroundColor: "#050505",
          padding: "24px",
          borderRadius: "16px",
          fontFamily: font,
          color: "#F5F5F5",
          fontSize: "14px",
          lineHeight: "1.4",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "48px", marginBottom: "8px" }}>{winner?.emoji ?? "👑"}</div>
          <div style={{ fontSize: "22px", fontWeight: 900, letterSpacing: "-0.5px" }}>
            {winner?.name} SURVIVES
          </div>
          <div style={{ fontSize: "10px", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700, marginTop: "4px" }}>
            Always Agitated Aroras
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
          {ranked.map((p, i) => {
            const total = totals[p.id] ?? 0;
            const isWinner = p.id === winnerId;
            const isElim = total >= 100;
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: isWinner ? "rgba(234,179,8,0.15)" : isElim ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${isWinner ? "rgba(234,179,8,0.30)" : isElim ? "rgba(239,68,68,0.20)" : "rgba(255,255,255,0.08)"}`,
                  opacity: isElim ? 0.7 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "10px", opacity: 0.5, width: "16px" }}>{i + 1}</span>
                  <span style={{ fontSize: "18px" }}>{p.emoji ?? "🙂"}</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: isWinner ? "#FDE68A" : "#F5F5F5" }}>
                    {p.name}
                  </span>
                  {isElim && <span style={{ fontSize: "12px", color: "#F87171" }}>💀</span>}
                </div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: isWinner ? "#FDE68A" : isElim ? "#F87171" : "rgba(255,255,255,0.8)", fontVariantNumeric: "tabular-nums" as const }}>
                  {total} pts
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "32px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{summary.rounds}</div>
            <div style={{ fontSize: "10px", opacity: 0.5, textTransform: "uppercase", letterSpacing: "1px" }}>Rounds</div>
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>{summary.closes}</div>
            <div style={{ fontSize: "10px", opacity: 0.5, textTransform: "uppercase", letterSpacing: "1px" }}>Closes</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "12px", opacity: 0.6, fontStyle: "italic" }}>
          "Clutch maar diya" 🃏
        </div>
      </div>
    </div>
  );
}
