import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Firebase web API keys are public identifiers, not secrets.
// Security is enforced by Firestore rules (families/{familyId}/**).
const firebaseConfig = {
  apiKey: "AIzaSyCZDaVKefU0UwBy-y8Kj5FE2t3eJKhW1gs",
  authDomain: "chummyscoretracker.firebaseapp.com",
  projectId: "chummyscoretracker",
  storageBucket: "chummyscoretracker.firebasestorage.app",
  messagingSenderId: "633100813203",
  appId: "1:633100813203:web:12248cd2d4df357ac5de66",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
