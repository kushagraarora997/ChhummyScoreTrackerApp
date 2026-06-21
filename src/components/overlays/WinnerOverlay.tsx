import FullOverlay from "../FullOverlay";
import WinnerView from "../WinnerView";
import { useAppStore } from "../../store/useAppStore";

export default function WinnerOverlay({ onExit }: { onExit: () => void }) {
  const store = useAppStore();
  return (
    <FullOverlay title="Session Winner" tone="success">
      <WinnerView
        onClose={() => {
          store.closeOverlay();
          onExit();
        }}
      />
    </FullOverlay>
  );
}
