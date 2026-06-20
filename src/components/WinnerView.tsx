import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useAppStore } from "../store/useAppStore";

export default function WinnerView({ onClose }: { onClose: () => void }) {
  const s = useAppStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const { winnerId, summary } =
    s.ui.overlay.type === "winner"
      ? s.ui.overlay
      : { winnerId: "", summary: { rounds: 0, closes: 0, final: 0 } };

  const winner = s.players.find((p) => p.id === winnerId);

  async function handleShare() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    setShareErr(null);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        logging: false,
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

  return (
    <div className="text-center">
      {/* Result card — captured by html2canvas */}
      <div ref={cardRef} style={{ backgroundColor: "#050505" }} className="rounded-2xl p-6 mb-4">
        <div className="text-5xl mb-3">{winner?.emoji ?? "👑"}</div>
        <div className="text-3xl font-black tracking-tight">
          {winner?.name} SURVIVES
        </div>
        <div className="mt-2 text-sm text-amber-400 uppercase tracking-widest font-semibold">
          Always Agitated Aroras
        </div>
        <div className="mt-5 flex justify-center gap-6 text-center">
          <div>
            <div className="text-2xl font-bold">{summary.rounds}</div>
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Rounds</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.closes}</div>
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Closes</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{summary.final}</div>
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Final</div>
          </div>
        </div>
        <div className="mt-5 text-sm italic opacity-60">"Clutch maar diya" 🃏</div>
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
    </div>
  );
}
