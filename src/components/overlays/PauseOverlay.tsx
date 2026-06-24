import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import FullOverlay from "../FullOverlay";
import { useAppStore } from "../../store/useAppStore";

export default function PauseOverlay({ onExit }: { onExit: () => void }) {
  const store = useAppStore();
  const [confirm, setConfirm] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);

  const session = store.activeSession;
  const totals = store.getTotals();
  const players = store.players.filter((p) => session?.playerIds.includes(p.id));
  const roundNumber = store.rounds.length + 1;
  const font = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const ranked = [...players].sort((a, b) => {
    const ta = totals[a.id] ?? 0;
    const tb = totals[b.id] ?? 0;
    if (ta > 100 && tb <= 100) return 1;
    if (tb > 100 && ta <= 100) return -1;
    return ta - tb;
  });

  async function handleShare() {
    if (!hiddenRef.current || sharing) return;
    setSharing(true);
    setShareErr(null);
    try {
      const canvas = await html2canvas(hiddenRef.current, {
        backgroundColor: "#050505",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: hiddenRef.current.offsetWidth,
        height: hiddenRef.current.offsetHeight,
      });
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error("Canvas capture failed")); return; }
          try {
            const file = new File([blob], "chhummy-standings.png", { type: "image/png" });
            if (navigator.canShare?.({ files: [file] })) {
              await navigator.share({ files: [file], title: "Chhummy Standings", text: `Round ${roundNumber - 1} standings • Always Agitated Aroras 🃏` });
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "chhummy-standings.png";
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }
            resolve();
          } catch (e) { reject(e); }
        }, "image/png");
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Share failed";
      if (!msg.includes("AbortError") && !msg.includes("cancel")) {
        setShareErr("Share nahi ho raha. Screenshot le lo 📸");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <FullOverlay title={confirm ? "End Game?" : "Game Paused ⏸"}>
      {confirm ? (
        <div className="grid gap-3">
          <p className="text-center text-sm opacity-60 mb-1">
            Session band ho jayega. Scores ud jayenge.
          </p>
          <button
            onClick={() => { onExit(); store.abandonSession(); }}
            className="w-full py-4 rounded-2xl bg-danger text-white text-lg font-semibold"
          >
            Haan, band karo
          </button>
          <button
            onClick={() => setConfirm(false)}
            className="w-full py-3 rounded-2xl bg-card border border-white/10"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            onClick={() => { setConfirm(false); store.closeOverlay(); }}
            className="w-full py-4 rounded-2xl bg-green-500 text-black text-lg font-semibold"
          >
            Resume Game
          </button>
          <button
            onClick={handleShare}
            disabled={sharing || store.rounds.length === 0}
            className="w-full py-3 rounded-2xl bg-elevated border border-white/10 font-semibold disabled:opacity-40"
          >
            {sharing ? "Capturing..." : "📊 Share Standings"}
          </button>
          {shareErr && <div className="text-sm text-warning text-center">{shareErr}</div>}
          <button
            onClick={() => setConfirm(true)}
            className="w-full py-3 rounded-2xl bg-card border border-danger/40 text-danger"
          >
            End Game
          </button>
        </div>
      )}

      {/* Off-screen standings card for html2canvas */}
      {/* Outer div has NO padding so offsetWidth = exactly the specified width, preventing right-edge clipping */}
      <div
        ref={hiddenRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "340px",
          backgroundColor: "#050505",
          borderRadius: "20px",
          fontFamily: font,
          color: "#F5F5F5",
          fontSize: "14px",
          lineHeight: "1.4",
          overflow: "hidden",
        }}
      >
      <div style={{ padding: "20px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "18px", fontWeight: 900, letterSpacing: "-0.5px" }}>
            Standings after Round {roundNumber - 1}
          </div>
          <div style={{ fontSize: "11px", color: "#F59E0B", textTransform: "uppercase", letterSpacing: "3px", fontWeight: 700, marginTop: "4px" }}>
            Always Agitated Aroras
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 5px" }}>
          <tbody>
            {ranked.map((p, i) => {
              const total = totals[p.id] ?? 0;
              const elim = total > 100;
              const warn = total >= 70 && total < 100;
              const crit = total >= 85 && total < 100;
              const nameColor = elim ? "rgba(248,113,113,0.8)" : crit ? "#F87171" : warn ? "#F59E0B" : "#F5F5F5";
              const ptsColor = elim ? "#F87171" : crit ? "#F87171" : warn ? "#F59E0B" : "rgba(255,255,255,0.8)";
              return (
                <tr key={p.id}>
                  <td colSpan={2} style={{
                    padding: "7px 10px",
                    borderRadius: "10px",
                    backgroundColor: elim ? "rgba(239,68,68,0.10)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${elim ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`,
                    opacity: elim ? 0.7 : 1,
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <tbody>
                        <tr>
                          <td style={{ width: "18px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{i + 1}</td>
                          <td style={{ width: "24px", fontSize: "18px" }}>{p.emoji ?? "🙂"}</td>
                          <td style={{ fontSize: "13px", fontWeight: 600, color: nameColor }}>{p.name}{elim ? " 💀" : ""}</td>
                          <td style={{ fontSize: "14px", fontWeight: 700, color: ptsColor, textAlign: "right", whiteSpace: "nowrap" }}>{total} pts</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ textAlign: "center", fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "12px", fontStyle: "italic" }}>
          🃏 chhummy-tracker
        </div>
      </div>
      </div>
    </FullOverlay>
  );
}
