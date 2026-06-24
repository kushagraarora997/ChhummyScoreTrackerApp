import {
  doc, setDoc, deleteDoc,
  getDocs, getDoc, collection, query, where, onSnapshot, orderBy, limit,
} from "firebase/firestore";
import { firestore } from "./firebase";
import { db } from "../db";
import type { Player, Session, Round, Stats, Achievement } from "../db";

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
  // Composite key prevents two devices from creating duplicate Round-N docs
  const docId = `${round.sessionId}_${round.number}`;
  return setDoc(doc(firestore, base(familyId), "rounds", docId), round)
    .catch((e) => console.warn("[firebase] syncRound failed", e));
}

export function deleteRoundFromCloud(familyId: string, sessionId: string, roundNumber: number): Promise<void> {
  const docId = `${sessionId}_${roundNumber}`;
  return deleteDoc(doc(firestore, base(familyId), "rounds", docId))
    .catch((e) => console.warn("[firebase] deleteRoundFromCloud failed", e));
}

export function deletePlayerFromCloud(familyId: string, playerId: string): Promise<void> {
  return deleteDoc(doc(firestore, base(familyId), "players", playerId))
    .catch((e) => console.warn("[firebase] deletePlayerFromCloud failed", e));
}

export function syncStats(familyId: string, stats: Stats): Promise<void> {
  return setDoc(doc(firestore, base(familyId), "stats", "global"), stats)
    .catch((e) => console.warn("[firebase] syncStats failed", e));
}

export function syncAchievement(familyId: string, achievement: Achievement): Promise<void> {
  return setDoc(doc(firestore, base(familyId), "achievements", achievement.id), achievement)
    .catch((e) => console.warn("[firebase] syncAchievement failed", e));
}

// ── Push all local data to cloud (used when creating a room with existing local data) ──

export async function pushToCloud(familyId: string): Promise<void> {
  const [players, sessions, rounds, statsRow, achievements] = await Promise.all([
    db.players.toArray(),
    db.sessions.toArray(),
    db.rounds.toArray(),
    db.stats.get("global"),
    db.achievements.toArray(),
  ]);
  const writes: Promise<void>[] = [
    ...players.map((p) => syncPlayer(familyId, p)),
    ...sessions.map((s) => syncSession(familyId, s)),
    ...rounds.map((r) => syncRound(familyId, r)),
    ...achievements.map((a) => syncAchievement(familyId, a)),
  ];
  if (statsRow) writes.push(syncStats(familyId, statsRow));
  await Promise.all(writes);
}

// ── Pull from cloud (on room join) ────────────────────────────────────────────

export async function pullFromCloud(familyId: string): Promise<{
  playerCount: number;
  hasActiveSession: boolean;
}> {
  // Fetch players, last 30 completed sessions, active session, stats, achievements.
  // completedSnap uses orderBy which requires a composite index — isolate its failure so
  // the active session (critical for Device B sync) is never blocked by a missing index.
  const [playersSnap, completedSnap, activeSnap, statsSnap, achievementsSnap] = await Promise.all([
    getDocs(collection(firestore, base(familyId), "players")),
    getDocs(query(
      collection(firestore, base(familyId), "sessions"),
      where("status", "==", "completed"),
      orderBy("startedAt", "desc"),
      limit(30),
    // Isolate failure: composite index may not exist yet; don't block the active session fetch
    )).catch((): { docs: [] } => ({ docs: [] })),
    getDocs(query(
      collection(firestore, base(familyId), "sessions"),
      where("status", "==", "active"),
    )),
    getDoc(doc(firestore, base(familyId), "stats", "global")),
    getDocs(collection(firestore, base(familyId), "achievements")),
  ]);

  const players = playersSnap.docs.map((d) => d.data() as Player);
  if (players.length > 0) await db.players.bulkPut(players);

  const allSessions = [
    ...completedSnap.docs.map((d) => d.data() as Session),
    ...activeSnap.docs.map((d) => d.data() as Session),
  ];
  if (allSessions.length > 0) await db.sessions.bulkPut(allSessions);

  // Only eagerly fetch rounds for the active session (to keep join fast)
  const activeSession = activeSnap.docs[0]?.data() as Session | undefined;
  let hasActiveSession = false;
  if (activeSession) {
    hasActiveSession = true;
    const roundsSnap = await getDocs(
      query(
        collection(firestore, base(familyId), "rounds"),
        where("sessionId", "==", activeSession.id),
      )
    );
    const rounds = roundsSnap.docs.map((d) => d.data() as Round);
    if (rounds.length > 0) await db.rounds.bulkPut(rounds);
  }

  if (statsSnap.exists()) await db.stats.put(statsSnap.data() as Stats);

  const achievements = achievementsSnap.docs.map((d) => d.data() as Achievement);
  if (achievements.length > 0) await db.achievements.bulkPut(achievements);

  return { playerCount: players.length, hasActiveSession };
}

// On-demand round fetch for History expand on joined devices
export async function fetchRoundsForSession(familyId: string, sessionId: string): Promise<Round[]> {
  const snap = await getDocs(
    query(collection(firestore, base(familyId), "rounds"), where("sessionId", "==", sessionId))
  );
  return snap.docs.map((d) => d.data() as Round);
}

// Re-pull stats + achievements after a game ends (for joined devices)
export async function pullStatsFromCloud(familyId: string): Promise<void> {
  const [statsSnap, achievementsSnap] = await Promise.all([
    getDoc(doc(firestore, base(familyId), "stats", "global")),
    getDocs(collection(firestore, base(familyId), "achievements")),
  ]);
  if (statsSnap.exists()) await db.stats.put(statsSnap.data() as Stats);
  const achievements = achievementsSnap.docs.map((d) => d.data() as Achievement);
  if (achievements.length > 0) await db.achievements.bulkPut(achievements);
}

// ── Real-time subscriptions (Phase 2) ─────────────────────────────────────────

export function subscribeToRounds(
  familyId: string,
  sessionId: string,
  onRound: (round: Round) => void,
  onRoundRemoved?: (round: Round) => void,
): () => void {
  const q = query(
    collection(firestore, base(familyId), "rounds"),
    where("sessionId", "==", sessionId)
  );
  return onSnapshot(
    q,
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          onRound(change.doc.data() as Round);
        } else if (change.type === "removed" && onRoundRemoved) {
          onRoundRemoved(change.doc.data() as Round);
        }
      });
    },
    (e) => console.warn("[firebase] subscribeToRounds error", e)
  );
}

export function subscribeToPlayers(
  familyId: string,
  onPlayer: (player: Player) => void,
): () => void {
  return onSnapshot(
    collection(firestore, base(familyId), "players"),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          onPlayer(change.doc.data() as Player);
        }
      });
    },
    (e) => console.warn("[firebase] subscribeToPlayers error", e)
  );
}

export function subscribeToSession(
  familyId: string,
  sessionId: string,
  onSession: (session: Session) => void
): () => void {
  return onSnapshot(
    doc(firestore, base(familyId), "sessions", sessionId),
    (snap) => {
      if (snap.exists()) onSession(snap.data() as Session);
    },
    (e) => console.warn("[firebase] subscribeToSession error", e)
  );
}
