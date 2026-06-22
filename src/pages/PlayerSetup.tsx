import { useEffect, useRef, useState } from "react";
import { Player } from "../db";
import { useAppStore } from "../store/useAppStore";
import { nanoid } from "../utils/nanoid";
import {
  getPlayers, addPlayer, updatePlayerLastUsed, updatePlayer, deletePlayer,
} from "../db/operations";

const EMOJIS = [
  "😎", "😂", "🔥", "👑", "🐯", "🦁", "🦅",
  "🕶️", "🥷", "🧠", "⚡", "🎯", "🎭",
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
  const [addModal, setAddModal] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const newSession = useAppStore((s) => s.newSession);

  useEffect(() => {
    getPlayers().then((all) => {
      all.sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0));
      setAvailable(all);
    });
  }, []);

  useEffect(() => {
    if (addModal) setTimeout(() => inputRef.current?.focus(), 100);
  }, [addModal]);

  const toggle = (p: Player) => {
    setSelected((cur) => {
      const exists = cur.find((x) => x.id === p.id);
      if (exists) return cur.filter((x) => x.id !== p.id);
      if (cur.length >= 6) return cur;
      return [...cur, p];
    });
  };

  const commitAdd = async () => {
    const name = draftName.trim();
    if (!name) return;
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const player: Player = {
      id: nanoid(), name, emoji,
      createdAt: Date.now(), lastUsedAt: Date.now(),
    };
    await addPlayer(player);
    setAvailable((prev) => [player, ...prev]);
    setSelected((prev) => [...prev, player].slice(0, 6));
    setDraftName("");
    setAddModal(false);
  };

  function openEdit(p: Player) {
    setEditingPlayer(p);
    setEditName(p.name);
    setEditEmoji(p.emoji ?? "🙂");
  }

  const commitEdit = async () => {
    if (!editingPlayer || !editName.trim()) return;
    const name = editName.trim();
    const emoji = editEmoji;
    await updatePlayer(editingPlayer.id, { name, emoji });
    const updated = { ...editingPlayer, name, emoji };
    setAvailable((prev) => prev.map((p) => p.id === editingPlayer.id ? updated : p));
    setSelected((prev) => prev.map((p) => p.id === editingPlayer.id ? updated : p));
    setEditingPlayer(null);
  };

  const commitDelete = async () => {
    if (!editingPlayer) return;
    await deletePlayer(editingPlayer.id);
    setAvailable((prev) => prev.filter((p) => p.id !== editingPlayer.id));
    setSelected((prev) => prev.filter((p) => p.id !== editingPlayer.id));
    setEditingPlayer(null);
  };

  const start = async () => {
    if (selected.length < 2) return;
    navigator.vibrate?.([40, 20, 80]);
    await newSession(selected.map((p) => p.id));
    for (const p of selected) {
      await updatePlayerLastUsed(p.id);
    }
    onReady();
  };

  return (
    <div className="min-h-screen bg-background text-text p-4 pb-28">
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-xl bg-card border border-white/10"
        >
          Back
        </button>
        <h2 className="text-2xl font-semibold">Add Players</h2>
      </div>

      <div className="mt-2 text-sm opacity-70">Select 2–6 players · Long-tap ✏️ to edit</div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {available.length === 0 && (
          <div className="col-span-2 text-center py-6">
            <div className="text-base font-semibold opacity-60">Sab ko add karo! 👇</div>
          </div>
        )}
        {available.map((p) => {
          const active = selected.some((s) => s.id === p.id);
          return (
            <div
              key={p.id}
              onClick={() => toggle(p)}
              className={`
                relative h-20 rounded-2xl border transition active:scale-[0.98] cursor-pointer
                flex flex-col items-center justify-center
                ${active
                  ? "bg-success text-black border-success shadow-green"
                  : "bg-elevated border-white/5"}
              `}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-2xl ${active ? "bg-black/20" : "bg-white/10"}`}>
                {p.emoji ?? "🙂"}
              </div>
              <div className="mt-1 text-base font-medium">{p.name}</div>
              <button
                onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-[11px] flex items-center justify-center transition ${
                  active ? "bg-black/15 opacity-60 hover:opacity-100" : "bg-white/8 opacity-40 hover:opacity-80"
                }`}
              >
                ✏️
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setAddModal(true)}
          className={`h-20 rounded-2xl bg-card border border-dashed border-white/20 text-lg active:scale-[0.98] transition ${available.length === 0 ? "col-span-2" : ""}`}
        >
          + Add Player
        </button>
      </div>

      <div className="fixed left-0 right-0 bottom-0 p-4 safe bg-gradient-to-t from-background via-background to-transparent">
        <button
          onClick={start}
          disabled={selected.length < 2}
          className={`
            w-full py-4 rounded-2xl text-lg font-semibold transition
            ${selected.length >= 2
              ? "bg-success text-black shadow-green"
              : "bg-card text-white/40"}
          `}
        >
          Start Session ({selected.length}/6)
        </button>
      </div>

      {/* Add Player Modal */}
      {addModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => { setAddModal(false); setDraftName(""); }}
        >
          <div
            className="w-full rounded-t-3xl bg-elevated border-t border-white/10 p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="text-xl font-semibold text-center mb-5">Player ka naam?</div>
            <input
              ref={inputRef}
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitAdd()}
              placeholder="Naam likhna yahan..."
              maxLength={20}
              className="w-full py-4 px-4 rounded-2xl bg-card border border-white/10 text-lg placeholder:opacity-30 outline-none focus:border-success/60 transition"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setAddModal(false); setDraftName(""); }}
                className="py-3 rounded-2xl bg-card border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={commitAdd}
                disabled={!draftName.trim()}
                className={`py-3 rounded-2xl font-semibold transition ${
                  draftName.trim() ? "bg-success text-black" : "bg-card text-white/30"
                }`}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end"
          onClick={() => setEditingPlayer(null)}
        >
          <div
            className="w-full rounded-t-3xl bg-elevated border-t border-white/10 p-6 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-5" />
            <div className="text-xl font-semibold text-center mb-4">Player Edit</div>

            {/* Emoji picker */}
            <div className="flex flex-wrap gap-2 justify-center mb-5">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  onClick={() => setEditEmoji(em)}
                  className={`w-11 h-11 rounded-full text-2xl flex items-center justify-center transition ${
                    editEmoji === em
                      ? "bg-success/25 border-2 border-success"
                      : "bg-white/8 border-2 border-transparent"
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Name input */}
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitEdit()}
              maxLength={20}
              placeholder="Player name..."
              className="w-full py-4 px-4 rounded-2xl bg-card border border-white/10 text-lg placeholder:opacity-30 outline-none focus:border-success/60 transition mb-4"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={commitDelete}
                className="py-3 rounded-2xl bg-danger/15 text-danger border border-danger/30 font-semibold"
              >
                🗑 Delete
              </button>
              <button
                onClick={commitEdit}
                disabled={!editName.trim()}
                className={`py-3 rounded-2xl font-semibold transition ${
                  editName.trim() ? "bg-success text-black" : "bg-card text-white/30"
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
