import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import {
  addDoc, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp,
  getDocs, limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

setupNav();

export async function sendSkillRequest({ fromUser, toStudent, message }) {
  if (!fromUser) throw new Error("Please log in before sending a request.");
  if (!toStudent?.uid || toStudent.uid === fromUser.uid) throw new Error("You cannot send a request to yourself.");
  const duplicateQuery = query(
    collection(db, "requests"),
    where("fromUid", "==", fromUser.uid),
    where("toUid", "==", toStudent.uid),
    where("status", "==", "pending"),
    limit(1)
  );
  const duplicates = await getDocs(duplicateQuery);
  if (!duplicates.empty) throw new Error("You already have a pending request to this student.");
  await addDoc(collection(db, "requests"), {
    fromUid: fromUser.uid,
    fromName: fromUser.displayName || fromUser.email || "Student",
    toUid: toStudent.uid,
    toName: toStudent.name || "Student",
    message,
    status: "pending",
    participants: [fromUser.uid, toStudent.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

const incomingEl = document.getElementById("incoming-requests");
const outgoingEl = document.getElementById("outgoing-requests");
const pageMessage = document.getElementById("page-message");
let unsubscribeIncoming = null, unsubscribeOutgoing = null;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function notify(text, error = false) {
  if (!pageMessage) return;
  pageMessage.textContent = text;
  pageMessage.classList.remove("hidden", "error");
  if (error) pageMessage.classList.add("error");
}
function statusLabel(status) { return `<span class="status ${escapeHtml(status)}">${escapeHtml(status || "pending")}</span>`; }
function requestHtml(item, direction) {
  const person = direction === "incoming" ? item.fromName : item.toName;
  const actions = direction === "incoming" && item.status === "pending"
    ? `<div class="request-buttons"><button class="button accept-btn" data-id="${escapeHtml(item.id)}">Accept</button><button class="button secondary reject-btn" data-id="${escapeHtml(item.id)}">Reject</button></div>`
    : "";
  return `<article class="request-item"><div><h3>${escapeHtml(person || "Student")} ${statusLabel(item.status)}</h3><p>${escapeHtml(item.message || "No message added.")}</p><p>Created: ${item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : "Just now"}</p></div>${actions}</article>`;
}
function attachActions(container) {
  container?.querySelectorAll(".accept-btn").forEach(b => b.addEventListener("click", () => updateRequest(b.dataset.id, "accepted")));
  container?.querySelectorAll(".reject-btn").forEach(b => b.addEventListener("click", () => updateRequest(b.dataset.id, "rejected")));
}
async function updateRequest(id, status) {
  try {
    await updateDoc(doc(db, "requests", id), { status, updatedAt: serverTimestamp() });
    notify(`Request ${status}.`);
  } catch (error) { notify(friendlyError(error), true); }
}
function showList(container, docs, direction) {
  if (!container) return;
  container.innerHTML = docs.length ? docs.map(d => requestHtml({ id: d.id, ...d.data() }, direction)).join("") : '<div class="empty-state">No requests yet.</div>';
  attachActions(container);
}
onAuthStateChanged(auth, user => {
  if (!incomingEl || !outgoingEl) return;
  unsubscribeIncoming?.(); unsubscribeOutgoing?.();
  if (!user) {
    incomingEl.innerHTML = outgoingEl.innerHTML = '<div class="empty-state">Please log in to view requests.</div>';
    return;
  }
  const incomingQ = query(collection(db, "requests"), where("toUid", "==", user.uid));
  const outgoingQ = query(collection(db, "requests"), where("fromUid", "==", user.uid));
  unsubscribeIncoming = onSnapshot(incomingQ, snap => showList(incomingEl, snap.docs, "incoming"), error => notify(friendlyError(error), true));
  unsubscribeOutgoing = onSnapshot(outgoingQ, snap => showList(outgoingEl, snap.docs, "outgoing"), error => notify(friendlyError(error), true));
});
