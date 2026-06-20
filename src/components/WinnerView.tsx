import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { useAppStore } from "../store/useAppStore";

export default function WinnerView({ onClose }: { onClose: () => void }) {
  const s = useAppStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const { winnerId, summary } =
    s.ui.overlay.type === "winner"
      ? s.ui.overlay
      : { winnerId: "", summary: { rounds: 0, closes: 0, final: 0 } };

  const winner = s.players.find((p) => p.id === winnerId);

  async function handleShare() {
    if (!cardRef.current || sharing) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
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
          a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, "image/png");
    } catch {
      setSharing(false);
    }
  }

  return (
    <div className="text-center">
      {/* Visible result card (also captured by html2canvas) */}
      <div ref={cardRef} className="rounded-2xl bg-[#050505] p-6 mb-4">
        <div className="text-5xl mb-3">{winner?.emoji ?? "👑"}</div>
        <div className="text-3xl font-black tracking-tight">
          {winner?.name} SURVIVES
        </div>
        <div className="mt-2 text-sm opacity-60 uppercase tracking-widest font-semibold">
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
            <div className="text-[10px] opacity-50 uppercase tracking-wide">Final Score</div>
          </div>
        </div>
        <div className="mt-5 text-sm italic opacity-60">"Clutch maar diya" 🃏</div>
      </div>

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
          Close
        </button>
      </div>
    </div>
  );
}
