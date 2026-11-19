import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

setupNav();
const form = document.getElementById("profile-form");
const message = document.getElementById("page-message");
let currentUser = null;

function showMessage(text, error = false) {
  if (!message) return;
  message.textContent = text;
  message.classList.remove("hidden", "error");
  if (error) message.classList.add("error");
}
function splitSkills(value) {
  return [...new Set(value.split(",").map(s => s.trim()).filter(Boolean))].slice(0, 20);
}
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    if (form) form.classList.add("hidden");
    showMessage("Please log in to create or edit your profile.", true);
    return;
  }
  if (!form) return;
  form.classList.remove("hidden");
  try {
    const snap = await getDoc(doc(db, "students", user.uid));
    const data = snap.exists() ? snap.data() : {};
    const put = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };
    put("name", data.name || user.displayName);
    put("course", data.course);
    put("bio", data.bio);
    put("teach", (data.teach || []).join(", "));
    put("learn", (data.learn || []).join(", "));
  } catch (error) { showMessage(friendlyError(error), true); }
});
form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) return showMessage("Please log in first.", true);
  const name = document.getElementById("name").value.trim();
  if (!name) return showMessage("Please enter your name.", true);
  const teach = splitSkills(document.getElementById("teach").value);
  const learn = splitSkills(document.getElementById("learn").value);
  const course = document.getElementById("course").value.trim();
  const bio = document.getElementById("bio").value.trim();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = "Saving…";
  try {
    await setDoc(doc(db, "students", currentUser.uid), {
      uid: currentUser.uid, name, email: currentUser.email || "", course, bio, teach, learn,
      updatedAt: serverTimestamp()
    }, { merge: true });
    showMessage("Profile saved successfully.");
  } catch (error) { showMessage(friendlyError(error), true); }
  finally { button.disabled = false; button.textContent = "Save profile"; }
});
