import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";
import { AnimatePresence } from "framer-motion";
import Home from "../pages/Home";
import LiveGame from "../pages/LiveGame";
import PlayerSetup from "../pages/PlayerSetup";
import Splash from "../pages/Splash";

type Route = "splash" | "home" | "setup" | "live";

export default function App() {
  const init = useAppStore((s) => s.init);
  const pause = useAppStore((s) => s.pause);
  const activeSession = useAppStore((s) => s.activeSession);
  const [route, setRoute] = useState<Route>("splash");

  useEffect(() => {
    init().then(() => {
      setTimeout(() => setRoute("home"), 900);
    });
  }, [init]);

  // Autopause when phone locks or user switches apps
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
        {route === "home" && <Home key="home" onStartNew={() => setRoute("setup")} onResume={() => setRoute("live")} />}
        {route === "setup" && <PlayerSetup key="setup" onReady={() => setRoute("live")} onBack={() => setRoute("home")} />}
        {route === "live" && <LiveGame key="live" onExit={() => setRoute("home")} />}
      </AnimatePresence>
    </div>
  );
}
