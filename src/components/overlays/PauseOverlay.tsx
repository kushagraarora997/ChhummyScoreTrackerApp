import { useState } from "react";
import FullOverlay from "../FullOverlay";
import { useAppStore } from "../../store/useAppStore";

export default function PauseOverlay({ onExit }: { onExit: () => void }) {
  const store = useAppStore();
  const [confirm, setConfirm] = useState(false);

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
            onClick={() => setConfirm(true)}
            className="w-full py-3 rounded-2xl bg-card border border-danger/40 text-danger"
          >
            End Game
          </button>
        </div>
      )}
    </FullOverlay>
  );
}
