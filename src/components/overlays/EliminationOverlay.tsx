import FullOverlay from "../FullOverlay";
import { useAppStore } from "../../store/useAppStore";

export default function EliminationOverlay() {
  const store = useAppStore();
  const overlay = store.ui.overlay;
  if (overlay.type !== "eliminated") return null;

  return (
    <FullOverlay title="Eliminated" tone="danger">
      <div className="text-center">
        <div className="text-2xl font-bold mb-1">💀 {overlay.name}</div>
        <div className="text-7xl font-black text-danger my-4">{overlay.total}</div>
        <div className="text-sm opacity-60 mb-4 uppercase tracking-wider">points — OUT</div>
        <div className="italic opacity-70 text-sm">"Ye dukh kahe khatam nahi hota 😭"</div>
        <button
          onClick={store.closeOverlay}
          className="mt-6 w-full py-3 rounded-2xl bg-card border border-white/10"
        >
          Continue
        </button>
      </div>
    </FullOverlay>
  );
}
