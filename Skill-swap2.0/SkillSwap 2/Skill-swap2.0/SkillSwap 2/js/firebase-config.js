// 1. Firebase Console -> Project settings -> Your apps -> Web app -> SDK setup.
// 2. Replace every placeholder below with the config from your own Firebase project.
// Do not put service-account/private Admin SDK credentials in frontend code.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAl61-j6bgv0bhMp0C3BbEPFJJWzQxx1ic",
  authDomain: "skill-20ca6.firebaseapp.com",
  projectId: "skill-20ca6",
  storageBucket: "skill-20ca6.firebasestorage.app",
  messagingSenderId: "459762104640",
  appId: "1:459762104640:web:45152361944523459262a5",
  measurementId: "G-TL6JKV7FBT"
};
export const firebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_"));
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
