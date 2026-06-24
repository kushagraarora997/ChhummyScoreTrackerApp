import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { AnimatePresence } from "framer-motion";
import Home from "../pages/Home";
import LiveGame from "../pages/LiveGame";
import PlayerSetup from "../pages/PlayerSetup";
import Splash from "../pages/Splash";
import StatsPage from "../pages/StatsPage";
import { getRoomCode } from "../lib/roomCode";
import { pullFromCloud } from "../lib/firebaseSync";

type Route = "splash" | "home" | "setup" | "live" | "stats";

export default function App() {
  const init = useAppStore((s) => s.init);
  const pause = useAppStore((s) => s.pause);
  const activeSession = useAppStore((s) => s.activeSession);
  const [route, setRoute] = useState<Route>("splash");

  useEffect(() => {
    async function startup() {
      await init();
      const code = getRoomCode();
      await Promise.all([
        // Minimum 900ms splash so the animation completes
        new Promise<void>((r) => setTimeout(r, 900)),
        // Pull latest state from cloud in parallel so Device B sees Device A's game
        code
          ? pullFromCloud(code)
              .then(() => init())
              .catch((e) => console.warn("[firebase] startup pull failed", e))
          : Promise.resolve(),
      ]);
      setRoute("home");
    }
    startup();
  }, [init]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && route === "live" && activeSession?.status === "active") {
        pause();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [route, activeSession, pause]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050816] via-[#09090f] to-black text-white">
      <AnimatePresence mode="wait">
        {route === "splash" && <Splash key="splash" onDone={() => setRoute("home")} />}
        {route === "home" && (
          <Home
            key="home"
            onStartNew={() => setRoute("setup")}
            onResume={() => setRoute("live")}
            onStats={() => setRoute("stats")}
          />
        )}
        {route === "setup" && <PlayerSetup key="setup" onReady={() => setRoute("live")} onBack={() => setRoute("home")} />}
        {route === "live" && <LiveGame key="live" onExit={() => setRoute("home")} />}
        {route === "stats" && <StatsPage key="stats" onBack={() => setRoute("home")} />}
      </AnimatePresence>
    </div>
  );
}
