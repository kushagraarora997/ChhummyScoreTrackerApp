import {
  doc, setDoc, deleteDoc,
  getDocs, collection, query, where, limit,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { db } from "../db";
import type { Player, Session, Round } from "../db";

function base(familyId: string) {
  return `families/${familyId}`;
}

// ── Write helpers (fire-and-forget, Dexie is source of truth) ────────────────

export function syncPlayer(familyId: string, player: Player): Promise<void> {
  return setDoc(doc(firestore, base(familyId), "players", player.id), player)
    .catch((e) => console.warn("[firebase] syncPlayer failed", e));
}

export function syncSession(familyId: string, session: Session): Promise<void> {
  return setDoc(doc(firestore, base(familyId), "sessions", session.id), session)
    .catch((e) => console.warn("[firebase] syncSession failed", e));
}

export function syncRound(familyId: string, round: Round): Promise<void> {
  return setDoc(doc(firestore, base(familyId), "rounds", round.id), round)
    .catch((e) => console.warn("[firebase] syncRound failed", e));
}

export function deleteRoundFromCloud(familyId: string, roundId: string): Promise<void> {
  return deleteDoc(doc(firestore, base(familyId), "rounds", roundId))
    .catch((e) => console.warn("[firebase] deleteRoundFromCloud failed", e));
}

export function deletePlayerFromCloud(familyId: string, playerId: string): Promise<void> {
  return deleteDoc(doc(firestore, base(familyId), "players", playerId))
    .catch((e) => console.warn("[firebase] deletePlayerFromCloud failed", e));
}

// ── Pull from cloud (on room join) ────────────────────────────────────────────

export async function pullFromCloud(familyId: string): Promise<{
  playerCount: number;
  hasActiveSession: boolean;
}> {
  const [playersSnap, sessionsSnap] = await Promise.all([
    getDocs(collection(firestore, base(familyId), "players")),
    getDocs(
      query(
        collection(firestore, base(familyId), "sessions"),
        where("status", "==", "active"),
        limit(1),
      )
    ),
  ]);

  const players = playersSnap.docs.map((d) => d.data() as Player);
  if (players.length > 0) await db.players.bulkPut(players);

  let hasActiveSession = false;
  if (!sessionsSnap.empty) {
    const session = sessionsSnap.docs[0].data() as Session;
    await db.sessions.put(session);
    hasActiveSession = true;

    const roundsSnap = await getDocs(
      query(
        collection(firestore, base(familyId), "rounds"),
        where("sessionId", "==", session.id),
      )
    );
    const rounds = roundsSnap.docs.map((d) => d.data() as Round);
    if (rounds.length > 0) await db.rounds.bulkPut(rounds);
  }

  return { playerCount: players.length, hasActiveSession };
}
