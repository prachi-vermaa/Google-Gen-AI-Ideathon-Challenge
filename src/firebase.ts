import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase App singleton
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth
export const auth: Auth = getAuth(app);

// Initialize Firestore with specific database ID if provided
const firestoreDbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const db: Firestore = firestoreDbId
  ? getFirestore(app, firestoreDbId)
  : getFirestore(app);

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

/**
 * Strict Undefined-Stripping Utility (Zero-Crash Payload Hygiene)
 * Strips all undefined fields before passing to Firestore setDoc/updateDoc/addDoc
 */
export function sanitizePayload<T>(payload: T): T {
  return JSON.parse(
    JSON.stringify(payload, (_key, value) => (value === undefined ? null : value))
  );
}
