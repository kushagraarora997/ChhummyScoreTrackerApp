import { useEffect, useState } from "react";
import { db, Player } from "../db";
import { useAppStore } from "../store/useAppStore";
import { nanoid } from "../utils/nanoid";

const EMOJIS = [
  "😎",
  "😂",
  "🔥",
  "👑",
  "🐯",
  "🦁",
  "🦅",
  "🕶️",
  "🥷",
  "🧠",
  "⚡",
  "🎯",
  "🎭",
];

export default function PlayerSetup({
  onReady,
  onBack,
}: {
  onReady: () => void;
  onBack: () => void;
}) {
  const [available, setAvailable] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player[]>([]);

  const newSession = useAppStore((s) => s.newSession);

  useEffect(() => {
    db.players.toArray().then((players) => {
      setAvailable(players);
    });
  }, []);

  const toggle = (p: Player) => {
    setSelected((cur) => {
      const exists = cur.find((x) => x.id === p.id);

      if (exists) {
        return cur.filter((x) => x.id !== p.id);
      }

      if (cur.length >= 6) {
        return cur;
      }

      return [...cur, p];
    });
  };

  const addQuick = async () => {
    const name = window.prompt("Enter player name");

    if (!name?.trim()) return;

    const emoji =
      EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

    const player: Player = {
      id: nanoid(),
      name: name.trim(),
      emoji,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    };

    await db.players.add(player);

    setAvailable((prev) => [player, ...prev]);

    setSelected((prev) =>
      [...prev, player].slice(0, 6)
    );
  };

  const start = async () => {
    if (selected.length < 2) return;

    await newSession(
      selected.map((p) => p.id)
    );

    for (const p of selected) {
      await db.players.update(p.id, {
        lastUsedAt: Date.now(),
      });
    }

    onReady();
  };

  return (
    <div className="min-h-screen bg-background text-text p-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-xl bg-card border border-white/10"
        >
          Back
        </button>

        <h2 className="text-2xl font-semibold">
          Add Players
        </h2>
      </div>

      {/* Selected Count */}
      <div className="mt-2 text-sm opacity-70">
        Select 2–6 players
      </div>

      {/* Players */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {available.map((p) => {
          const active = selected.some(
            (s) => s.id === p.id
          );

          return (
            <button
              key={p.id}
              onClick={() => toggle(p)}
              className={`
                h-20
                rounded-2xl
                border
                transition
                active:scale-[0.98]
                flex
                flex-col
                items-center
                justify-center
                ${
                  active
                    ? "bg-success text-black border-success shadow-green"
                    : "bg-elevated border-white/5"
                }
              `}
            >
              <div className="text-3xl">
                {p.emoji ?? "🙂"}
              </div>

              <div className="mt-1 text-base font-medium">
                {p.name}
              </div>
            </button>
          );
        })}

        {/* Add Player */}
        <button
          onClick={addQuick}
          className="
            h-20
            rounded-2xl
            bg-card
            border
            border-dashed
            border-white/20
            text-lg
            active:scale-[0.98]
            transition
          "
        >
          + Add Player
        </button>
      </div>

      {/* Bottom CTA */}
      <div className="fixed left-0 right-0 bottom-0 p-4 safe bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={start}
          disabled={selected.length < 2}
          className={`
            w-full
            py-4
            rounded-2xl
            text-lg
            font-semibold
            transition
            ${
              selected.length >= 2
                ? "bg-success text-black shadow-green"
                : "bg-card text-white/40"
            }
          `}
        >
          Start Session ({selected.length}/6)
        </button>
      </div>
    </div>
  );
}