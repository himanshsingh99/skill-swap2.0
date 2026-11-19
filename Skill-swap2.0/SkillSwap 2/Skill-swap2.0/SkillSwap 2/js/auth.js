import { auth, db, googleProvider, firebaseConfigured } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, signOut, onAuthStateChanged, updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp, collection, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { initTheme } from "./theme.js";
import { showToast } from "./ui.js";

export { auth, db, firebaseConfigured, onAuthStateChanged };

export function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "This email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters long.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account found with this email. Please create an account.",
    "auth/popup-closed-by-user": "Google sign-in popup was closed before completing.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Google sign-in popup was blocked by your browser. Please allow popups for this site.",
    "auth/unauthorized-domain": "Netlify domain not authorized! Please add your Netlify domain in Firebase Console → Authentication → Settings → Authorized domains.",
    "auth/missing-email": "Please enter your email address.",
    "auth/too-many-requests": "Too many failed attempts. Please wait a moment before trying again.",
    "permission-denied": "You do not have permission to perform this action."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}

/**
 * Ensures student documents exist in Firestore:
 * 1. Public document in `students/{uid}` (NO email for privacy, only initialized if not exists)
 * 2. Private document in `studentsPrivate/{uid}` (contains email, owner-only)
 */
export async function ensureStudentDocument(user, name = "") {
  if (!user?.uid) return;

  // 1. Public profile (visible to signed-in students in discovery)
  const studentRef = doc(db, "students", user.uid);
  const existingSnap = await getDoc(studentRef);

  if (!existingSnap.exists()) {
    const profileName = name || user.displayName || (user.email || "").split("@")[0] || "Student";
    await setDoc(studentRef, {
      uid: user.uid,
      name: profileName,
      course: "",
      bio: "",
      teach: [],
      learn: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // 2. Private profile (contains email; locked by security rules)
  const privateRef = doc(db, "studentsPrivate", user.uid);
  await setDoc(privateRef, {
    email: user.email || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function registerUser({ name, email, password }) {
  if (!firebaseConfigured) throw new Error("Please configure your Firebase credentials in js/firebase-config.js.");
  const cleanEmail = email.trim();
  const cleanName = name.trim();
  const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);
  await updateProfile(result.user, { displayName: cleanName });
  await ensureStudentDocument(result.user, cleanName);
  return result.user;
}

export async function loginUser({ email, password }) {
  if (!firebaseConfigured) throw new Error("Please configure your Firebase credentials in js/firebase-config.js.");
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureStudentDocument(result.user);
  return result.user;
}

export async function googleSignIn() {
  if (!firebaseConfigured) throw new Error("Please configure your Firebase credentials in js/firebase-config.js.");
  googleProvider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, googleProvider);
  await ensureStudentDocument(result.user);
  return result.user;
}

export async function resetPassword(email) {
  if (!firebaseConfigured) throw new Error("Please configure your Firebase credentials in js/firebase-config.js.");
  const cleanEmail = email.trim();
  if (!cleanEmail) throw new Error("Please enter your email address first.");
  await sendPasswordResetEmail(auth, cleanEmail);
}

export async function logoutUser() {
  await signOut(auth);
}

/**
 * Universal Navigation Setup
 * Manages Auth State, User Name, Login/Logout buttons,
 * Theme Toggler, Mobile Navigation Drawer, and Live Pending Request Badge.
 */
let pendingBadgeUnsub = null;

export function setupNav() {
  initTheme();

  const userLabel = document.getElementById("nav-user");
  const authLink = document.getElementById("auth-link");
  const logoutButton = document.getElementById("logout-btn");
  const hamburgerBtn = document.getElementById("hamburger-btn");
  const mobileDrawer = document.getElementById("mobile-nav-drawer");
  const pendingBadges = document.querySelectorAll(".nav-pending-count");

  // Mobile drawer toggle
  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener("click", () => {
      const isOpen = mobileDrawer.classList.toggle("open");
      hamburgerBtn.setAttribute("aria-expanded", isOpen);
    });

    // Close drawer when clicking a navigation link inside it
    mobileDrawer.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => mobileDrawer.classList.remove("open"));
    });
  }

  // Logout handler
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      try {
        await logoutUser();
        showToast("Logged out successfully.", "info");
        setTimeout(() => { location.href = "index.html"; }, 400);
      } catch (error) {
        showToast(friendlyError(error), "error");
      }
    });
  }

  // Reactive Auth State
  onAuthStateChanged(auth, user => {
    // 1. Update User Label
    if (userLabel) {
      if (user) {
        const displayName = user.displayName || user.email?.split("@")[0] || "Student";
        userLabel.textContent = displayName;
        userLabel.classList.remove("hidden");
      } else {
        userLabel.textContent = "";
        userLabel.classList.add("hidden");
      }
    }

    // 2. Toggle Login vs Logout buttons
    if (authLink) authLink.classList.toggle("hidden", !!user);
    if (logoutButton) logoutButton.classList.toggle("hidden", !user);

    // 3. Live Pending Requests Badge
    if (pendingBadgeUnsub) {
      pendingBadgeUnsub();
      pendingBadgeUnsub = null;
    }

    if (user && pendingBadges.length > 0) {
      const q = query(
        collection(db, "requests"),
        where("participants", "array-contains", user.uid)
      );

      pendingBadgeUnsub = onSnapshot(q, snap => {
        const count = snap.docs.filter(d => {
          const data = d.data();
          return data.toUid === user.uid && data.status === "pending";
        }).length;

        pendingBadges.forEach(badge => {
          if (count > 0) {
            badge.textContent = count;
            badge.classList.remove("hidden");
          } else {
            badge.textContent = "";
            badge.classList.add("hidden");
          }
        });
      }, err => {
        console.warn("Could not load pending badge count:", err);
      });
    } else {
      pendingBadges.forEach(badge => badge.classList.add("hidden"));
    }
  });
}
