import { auth, db, googleProvider, firebaseConfigured } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

export { auth, db, firebaseConfigured, onAuthStateChanged };

export function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/popup-closed-by-user": "Google sign-in was closed before finishing.",
    "auth/unauthorized-domain": "Add this website domain in Firebase Authentication → Settings → Authorized domains."
  };
  return messages[error?.code] || error?.message || "Something went wrong. Please try again.";
}

async function ensureStudentDocument(user, name = "") {
  const studentRef = doc(db, "students", user.uid);
  const profileName = name || user.displayName || (user.email || "").split("@")[0] || "Student";
  await setDoc(studentRef, {
    uid: user.uid,
    name: profileName,
    email: user.email || "",
    course: "",
    bio: "",
    teach: [],
    learn: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function registerUser({ name, email, password }) {
  if (!firebaseConfigured) throw new Error("First add your Firebase Web App config in js/firebase-config.js.");
  const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(result.user, { displayName: name.trim() });
  await ensureStudentDocument(result.user, name.trim());
  return result.user;
}
export async function loginUser({ email, password }) {
  if (!firebaseConfigured) throw new Error("First add your Firebase Web App config in js/firebase-config.js.");
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureStudentDocument(result.user);
  return result.user;
}
export async function googleSignIn() {
  if (!firebaseConfigured) throw new Error("First add your Firebase Web App config in js/firebase-config.js.");
  const result = await signInWithPopup(auth, googleProvider);
  await ensureStudentDocument(result.user);
  return result.user;
}
export async function logoutUser() { await signOut(auth); }

export function setupNav() {
  const userLabel = document.getElementById("nav-user");
  const authLink = document.getElementById("auth-link");
  const logoutButton = document.getElementById("logout-btn");
  if (!userLabel && !authLink && !logoutButton) return;
  onAuthStateChanged(auth, user => {
    if (userLabel) userLabel.textContent = user ? (user.displayName || user.email || "Signed in") : "";
    if (authLink) authLink.classList.toggle("hidden", !!user);
    if (logoutButton) logoutButton.classList.toggle("hidden", !user);
  });
  logoutButton?.addEventListener("click", async () => {
    try { await logoutUser(); location.href = "index.html"; }
    catch (error) { alert(friendlyError(error)); }
  });
}
