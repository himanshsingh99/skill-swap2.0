import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import {
  addDoc, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp,
  getDocs, limit
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  showToast, getAvatarStyle, formatRelativeTime, renderEmptyState,
  renderSkeletonCards, escapeHtml, showContactModal
} from "./ui.js";

setupNav();

/**
 * Creates a new skill exchange request in the `requests` collection.
 * Enforces:
 * 1. User must be logged in.
 * 2. Cannot send to self.
 * 3. No duplicate pending requests.
 * 4. No duplicate if already accepted (connected).
 * 5. Securely stores `fromEmail` for accepted contact unlock.
 */
export async function sendSkillRequest({ fromUser, toStudent, message }) {
  if (!fromUser) throw new Error("Please log in before sending a request.");
  if (!toStudent?.uid || toStudent.uid === fromUser.uid) {
    throw new Error("You cannot send an exchange request to yourself.");
  }

  // 1. Check if already connected (status == "accepted")
  const acceptedQuery = query(
    collection(db, "requests"),
    where("participants", "array-contains", fromUser.uid),
    limit(25)
  );
  const acceptedSnap = await getDocs(acceptedQuery);
  const alreadyConnected = acceptedSnap.docs.some(d => {
    const data = d.data();
    return data.status === "accepted" && data.participants && data.participants.includes(toStudent.uid);
  });
  if (alreadyConnected) {
    throw new Error("You are already connected with this student! Check your Requests page.");
  }

  // 2. Check duplicate pending request
  const duplicateQuery = query(
    collection(db, "requests"),
    where("participants", "array-contains", fromUser.uid)
  );
  const duplicates = await getDocs(duplicateQuery);
  const hasPending = duplicates.docs.some(d => {
    const data = d.data();
    return data.fromUid === fromUser.uid && data.toUid === toStudent.uid && data.status === "pending";
  });
  if (hasPending) {
    throw new Error("You already have a pending request sent to this student.");
  }

  // 3. Create request with fromEmail
  await addDoc(collection(db, "requests"), {
    fromUid: fromUser.uid,
    fromName: fromUser.displayName || fromUser.email?.split("@")[0] || "Student",
    fromEmail: fromUser.email || "",
    toUid: toStudent.uid,
    toName: toStudent.name || "Student",
    message: message.trim(),
    status: "pending",
    participants: [fromUser.uid, toStudent.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// -------------------------------------------------------------
// Requests Page Controller
// -------------------------------------------------------------
const incomingEl = document.getElementById("incoming-requests");
const outgoingEl = document.getElementById("outgoing-requests");
const pageMessage = document.getElementById("page-message");
const tabIncomingBtn = document.getElementById("tab-incoming-btn");
const tabOutgoingBtn = document.getElementById("tab-outgoing-btn");
const incomingPanel = document.getElementById("incoming-panel");
const outgoingPanel = document.getElementById("outgoing-panel");

let unsubscribeRequests = null;
let currentUser = null;
let activeTab = "incoming";

function notify(text, isError = false) {
  if (pageMessage) {
    pageMessage.textContent = text;
    pageMessage.classList.remove("hidden", "error");
    if (isError) pageMessage.classList.add("error");
  }
  showToast(text, isError ? "error" : "success");
}

function switchTab(tab) {
  activeTab = tab;
  if (tab === "incoming") {
    tabIncomingBtn?.classList.add("active");
    tabOutgoingBtn?.classList.remove("active");
    incomingPanel?.classList.remove("hidden");
    outgoingPanel?.classList.add("hidden");
  } else {
    tabOutgoingBtn?.classList.add("active");
    tabIncomingBtn?.classList.remove("active");
    outgoingPanel?.classList.remove("hidden");
    incomingPanel?.classList.add("hidden");
  }
}

tabIncomingBtn?.addEventListener("click", () => switchTab("incoming"));
tabOutgoingBtn?.addEventListener("click", () => switchTab("outgoing"));

function renderRequestCard(item, direction, currentUid) {
  const isIncoming = direction === "incoming";
  const partnerName = isIncoming ? item.fromName : item.toName;
  const avatar = getAvatarStyle(partnerName);
  const relativeTime = formatRelativeTime(item.createdAt);
  const status = item.status || "pending";
  const isAccepted = status === "accepted";

  // Partner Email is ONLY visible if status is "accepted"
  const partnerEmail = isAccepted ? (isIncoming ? item.fromEmail : item.toEmail) : null;

  // Pre-filled email links for seamless coordination
  const subject = encodeURIComponent("SkillSwap: Let's start our skill exchange!");
  const body = encodeURIComponent(
    `Hi ${partnerName},\n\nI'm excited to connect on SkillSwap for our skill exchange! When would be a good time to coordinate our first session?\n\nBest regards,\n`
  );
  const mailtoLink = partnerEmail ? `mailto:${encodeURIComponent(partnerEmail)}?subject=${subject}&body=${body}` : "#";
  const gmailLink = partnerEmail ? `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(partnerEmail)}&su=${subject}&body=${body}` : "#";

  return `
    <article class="request-item ${status}" id="req-${escapeHtml(item.id)}">
      <div class="request-header">
        <div class="request-person-wrap">
          <div class="avatar" style="background:${avatar.background}; width:44px; height:44px; font-size:1.05rem;">
            ${avatar.initial}
          </div>
          <div>
            <h3>${escapeHtml(partnerName || "Student")}</h3>
            <span class="request-meta-time">${isIncoming ? "Received" : "Sent"} ${relativeTime}</span>
          </div>
        </div>
        <span class="status-badge ${status}">${escapeHtml(status)}</span>
      </div>

      <div class="request-message-box">
        <strong>${isIncoming ? "Proposal Message:" : "Your Proposal:"}</strong>
        <p style="margin:4px 0 0;">${escapeHtml(item.message || "No custom message provided.")}</p>
      </div>

      ${isAccepted && partnerEmail ? `
      <div class="unlocked-contact-box">
        <div class="unlocked-header">
          <span>🎉 Contact Unlocked — Both of you can now coordinate!</span>
        </div>
        <div class="unlocked-details">
          <div>
            <span class="contact-label" style="font-size:0.8rem; display:block;">Partner Email:</span>
            <span class="email-display-text">${escapeHtml(partnerEmail)}</span>
          </div>
          <button type="button" class="button small secondary copy-email-btn" data-email="${escapeHtml(partnerEmail)}">
            📋 Copy Email
          </button>
        </div>
        <div class="unlocked-action-row">
          <a href="${mailtoLink}" class="button small">
            ✉️ Send Email
          </a>
          <a href="${gmailLink}" class="button small secondary" target="_blank" rel="noopener">
            Open in Gmail
          </a>
        </div>
      </div>
      ` : ""}

      ${isIncoming && status === "pending" ? `
      <div class="request-action-row">
        <button type="button" class="button small accept-btn" data-id="${escapeHtml(item.id)}" data-name="${escapeHtml(partnerName)}">
          ✓ Accept Exchange
        </button>
        <button type="button" class="button small secondary danger reject-btn" data-id="${escapeHtml(item.id)}">
          ✕ Decline
        </button>
      </div>
      ` : ""}
    </article>
  `;
}

async function updateRequest(id, newStatus) {
  if (!currentUser) return;
  const isAccepting = newStatus === "accepted";

  try {
    const updatePayload = {
      status: newStatus,
      updatedAt: serverTimestamp()
    };

    if (isAccepting) {
      updatePayload.acceptedAt = serverTimestamp();
      updatePayload.toEmail = currentUser.email || "";
    }

    await updateDoc(doc(db, "requests", id), updatePayload);
    notify(isAccepting ? "Request accepted! Contact information is now unlocked 🎉" : "Request declined.", false);
  } catch (error) {
    notify(friendlyError(error), true);
  }
}

function attachActionListeners(container) {
  if (!container) return;

  container.querySelectorAll(".accept-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.disabled = true;
      btn.textContent = "Accepting…";
      updateRequest(btn.dataset.id, "accepted");
    });
  });

  container.querySelectorAll(".reject-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (confirm("Are you sure you want to decline this skill exchange request?")) {
        btn.disabled = true;
        btn.textContent = "Declining…";
        updateRequest(btn.dataset.id, "rejected");
      }
    });
  });
}

function updateTabCounts(incomingCount, outgoingCount) {
  const incBadge = document.getElementById("incoming-tab-count");
  const outBadge = document.getElementById("outgoing-tab-count");
  if (incBadge) incBadge.textContent = incomingCount;
  if (outBadge) outBadge.textContent = outgoingCount;
}

let lastIncomingDocs = [];
let lastOutgoingDocs = [];

function renderAll() {
  if (!currentUser) return;

  if (incomingEl) {
    if (!lastIncomingDocs.length) {
      incomingEl.innerHTML = renderEmptyState({
        icon: "📬",
        title: "No received requests yet",
        description: "When other students want to exchange skills with you, their proposals will appear here."
      });
    } else {
      incomingEl.innerHTML = lastIncomingDocs.map(item => renderRequestCard(item, "incoming", currentUser.uid)).join("");
      attachActionListeners(incomingEl);
    }
  }

  if (outgoingEl) {
    if (!lastOutgoingDocs.length) {
      outgoingEl.innerHTML = renderEmptyState({
        icon: "🚀",
        title: "No sent requests yet",
        description: "Browse the community and send an exchange proposal to start learning together!",
        actionText: "Discover Students",
        actionHref: "index.html"
      });
    } else {
      outgoingEl.innerHTML = lastOutgoingDocs.map(item => renderRequestCard(item, "outgoing", currentUser.uid)).join("");
    }
  }

  updateTabCounts(lastIncomingDocs.length, lastOutgoingDocs.length);
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (!incomingEl || !outgoingEl) return;

  if (unsubscribeRequests) {
    unsubscribeRequests();
    unsubscribeRequests = null;
  }

  if (!user) {
    incomingEl.innerHTML = outgoingEl.innerHTML = renderEmptyState({
      icon: "🔒",
      title: "Please log in",
      description: "You must be signed in to view your skill exchange requests.",
      actionText: "Log in now",
      actionHref: "login.html"
    });
    return;
  }

  incomingEl.innerHTML = renderSkeletonCards(2);
  outgoingEl.innerHTML = renderSkeletonCards(2);

  // Use "participants array-contains" query which directly satisfies Firestore security rules
  const reqQuery = query(
    collection(db, "requests"),
    where("participants", "array-contains", user.uid)
  );

  unsubscribeRequests = onSnapshot(reqQuery, snap => {
    // Clear any previous error notification
    if (pageMessage) pageMessage.classList.add("hidden");

    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Sort by latest first
    all.sort((a, b) => {
      const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return tB - tA;
    });

    lastIncomingDocs = all.filter(d => d.toUid === user.uid);
    lastOutgoingDocs = all.filter(d => d.fromUid === user.uid);
    renderAll();
  }, error => {
    console.error("Requests listener error:", error);
    notify(friendlyError(error), true);
  });
});
