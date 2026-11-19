import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { sendSkillRequest } from "./requests.js";

setupNav();
const grid = document.getElementById("students-grid");
const searchInput = document.getElementById("search-input");
const skillFilter = document.getElementById("skill-filter");
const count = document.getElementById("student-count");
const message = document.getElementById("page-message");
let allStudents = [];
let currentUser = null;

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function tags(skills, cls = "") {
  if (!skills?.length) return '<span class="muted">Not added yet</span>';
  return skills.map(s => `<span class="tag ${cls}">${esc(s)}</span>`).join("");
}
function render() {
  if (!grid) return;
  const search = (searchInput?.value || "").trim().toLowerCase();
  const filter = (skillFilter?.value || "").toLowerCase();
  const list = allStudents.filter(s => {
    if (currentUser && s.uid === currentUser.uid) return false;
    const searchable = [s.name, s.course, s.bio, ...(s.teach || []), ...(s.learn || [])].join(" ").toLowerCase();
    const skillMatches = !filter || [...(s.teach || []), ...(s.learn || [])].some(x => x.toLowerCase().includes(filter));
    return searchable.includes(search) && skillMatches;
  });
  if (count) count.textContent = `${list.length} student${list.length === 1 ? "" : "s"}`;
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state">No students match yet. Try another search, or add skills to your profile.</div>';
    return;
  }
  grid.innerHTML = list.map(s => `
    <article class="student-card">
      <div class="student-top"><div class="avatar">${esc((s.name || "S").trim().slice(0,1).toUpperCase())}</div><div><h3>${esc(s.name || "Student")}</h3><div class="course">${esc(s.course || "Course not added")}</div></div></div>
      <p>${esc(s.bio || "This student has not added a bio yet.")}</p>
      <strong>Can teach</strong><div class="tag-row">${tags(s.teach)}</div>
      <strong>Wants to learn</strong><div class="tag-row">${tags(s.learn, "want")}</div>
      <div class="card-actions"><button class="button request-btn" data-uid="${esc(s.uid)}" data-name="${esc(s.name || "Student")}">Request exchange</button></div>
    </article>`).join("");
  grid.querySelectorAll(".request-btn").forEach(button => button.addEventListener("click", async () => {
    if (!currentUser) { location.href = "login.html"; return; }
    const target = button.dataset.uid;
    const student = allStudents.find(s => s.uid === target);
    const skill = prompt(`Which skill would you like to exchange with ${student?.name || "this student"}? Mention what you can teach and what you want to learn.`);
    if (!skill || !skill.trim()) return;
    button.disabled = true; button.textContent = "Sending…";
    try {
      await sendSkillRequest({ fromUser: currentUser, toStudent: student, message: skill.trim() });
      button.textContent = "Request sent";
      if (message) { message.textContent = "Skill exchange request sent."; message.classList.remove("hidden", "error"); }
    } catch (error) {
      alert(friendlyError(error));
      button.disabled = false; button.textContent = "Request exchange";
    }
  }));
}
async function loadStudents() {
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state">Loading students…</div>';
  try {
    const snap = await getDocs(query(collection(db, "students"), orderBy("name")));
    allStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    render();
  } catch (error) {
    grid.innerHTML = '<div class="empty-state">Unable to load students. Sign in and confirm your Firebase configuration and Firestore rules are set up.</div>';
    if (message) { message.textContent = friendlyError(error); message.classList.remove("hidden"); message.classList.add("error"); }
  }
}
searchInput?.addEventListener("input", render);
skillFilter?.addEventListener("change", render);
onAuthStateChanged(auth, user => { currentUser = user; loadStudents(); });
