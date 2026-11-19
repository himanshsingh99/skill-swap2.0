import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { sendSkillRequest } from "./requests.js";
import {
  showToast, getAvatarStyle, renderSkeletonCards, renderEmptyState,
  showRequestModal, showContactModal, escapeHtml
} from "./ui.js";

setupNav();

const grid = document.getElementById("students-grid");
const searchInput = document.getElementById("search-input");
const skillFilter = document.getElementById("skill-filter");
const quickChipsContainer = document.getElementById("quick-chips-container");
const countEl = document.getElementById("student-count");
const message = document.getElementById("page-message");

// Live stats elements in Hero
const statStudentsEl = document.getElementById("stat-students");
const statSkillsEl = document.getElementById("stat-skills");
const statConnectionsEl = document.getElementById("stat-connections");

let allStudents = [];
let currentUser = null;
let currentUserProfile = null;
let activeConnections = new Map(); // targetUid -> { status, partnerEmail, reqId }
let selectedFilterChip = "";

function renderTags(skills, isLearn = false) {
  if (!skills || !skills.length) {
    return `<span class="text-dim" style="font-size:0.8rem;">Not listed yet</span>`;
  }
  return skills.map(s => `<span class="tag ${isLearn ? "want" : ""}">${escapeHtml(s)}</span>`).join("");
}

/**
 * Checks if current user's learning goals match this student's teaching skills,
 * or current user's teaching skills match what this student wants to learn.
 */
function isGreatMatch(student) {
  if (!currentUserProfile) return false;
  const myLearn = (currentUserProfile.learn || []).map(s => s.toLowerCase());
  const myTeach = (currentUserProfile.teach || []).map(s => s.toLowerCase());
  const studentTeach = (student.teach || []).map(s => s.toLowerCase());
  const studentLearn = (student.learn || []).map(s => s.toLowerCase());

  const learnMatch = studentTeach.some(st => myLearn.includes(st));
  const teachMatch = studentLearn.some(sl => myTeach.includes(sl));
  return learnMatch || teachMatch;
}

function updateHeroStats(studentsList) {
  if (statStudentsEl) {
    statStudentsEl.textContent = studentsList.length || 0;
  }
  if (statSkillsEl) {
    const allUniqueSkills = new Set();
    studentsList.forEach(s => {
      (s.teach || []).forEach(x => allUniqueSkills.add(x.trim().toLowerCase()));
      (s.learn || []).forEach(x => allUniqueSkills.add(x.trim().toLowerCase()));
    });
    statSkillsEl.textContent = allUniqueSkills.size || 0;
  }
}

function populateDynamicFilters(studentsList) {
  const skillCountMap = new Map();
  studentsList.forEach(s => {
    (s.teach || []).forEach(skill => {
      const clean = skill.trim();
      if (clean) skillCountMap.set(clean, (skillCountMap.get(clean) || 0) + 1);
    });
  });

  // Sort by popularity
  const sortedSkills = Array.from(skillCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // 1. Update dropdown
  if (skillFilter) {
    const currentVal = skillFilter.value;
    skillFilter.innerHTML = `<option value="">All skills</option>` +
      sortedSkills.map(s => `<option value="${escapeHtml(s)}" ${s.toLowerCase() === currentVal.toLowerCase() ? "selected" : ""}>${escapeHtml(s)}</option>`).join("");
  }

  // 2. Render quick clickable chips (top 6 skills)
  if (quickChipsContainer) {
    const topSkills = sortedSkills.slice(0, 6);
    if (!topSkills.length) {
      quickChipsContainer.innerHTML = "";
      return;
    }
    quickChipsContainer.innerHTML = `
      <span class="quick-chips-label">Popular:</span>
      <button type="button" class="chip-btn ${selectedFilterChip === "" ? "active" : ""}" data-skill="">All</button>
      ${topSkills.map(s => `
        <button type="button" class="chip-btn ${selectedFilterChip.toLowerCase() === s.toLowerCase() ? "active" : ""}" data-skill="${escapeHtml(s)}">
          ${escapeHtml(s)}
        </button>
      `).join("")}
    `;

    quickChipsContainer.querySelectorAll(".chip-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedFilterChip = btn.dataset.skill || "";
        quickChipsContainer.querySelectorAll(".chip-btn").forEach(b => b.classList.toggle("active", b === btn));
        if (skillFilter) skillFilter.value = selectedFilterChip;
        renderGrid();
      });
    });
  }
}

function renderGrid() {
  if (!grid) return;

  const search = (searchInput?.value || "").trim().toLowerCase();
  const filter = (selectedFilterChip || skillFilter?.value || "").toLowerCase();

  const filtered = allStudents.filter(s => {
    // Hide self
    if (currentUser && s.uid === currentUser.uid) return false;

    const searchable = [
      s.name || "",
      s.course || "",
      s.bio || "",
      ...(s.teach || []),
      ...(s.learn || [])
    ].join(" ").toLowerCase();

    const matchesSearch = !search || searchable.includes(search);
    const matchesSkill = !filter || [
      ...(s.teach || []),
      ...(s.learn || [])
    ].some(x => x.toLowerCase().includes(filter));

    return matchesSearch && matchesSkill;
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} student${filtered.length === 1 ? "" : "s"}`;
  }

  if (!filtered.length) {
    grid.innerHTML = renderEmptyState({
      icon: "🔍",
      title: "No students match your criteria",
      description: "Try adjusting your search terms or clearing the skill filter.",
      actionText: "Clear filters",
      actionHref: "javascript:void(0)"
    });
    grid.querySelector("a")?.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (skillFilter) skillFilter.value = "";
      selectedFilterChip = "";
      populateDynamicFilters(allStudents);
      renderGrid();
    });
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const avatar = getAvatarStyle(s.name);
    const greatMatch = isGreatMatch(s);
    const connection = activeConnections.get(s.uid);
    const isConnected = connection?.status === "accepted";
    const isPending = connection?.status === "pending";

    return `
      <article class="student-card" id="student-${escapeHtml(s.uid)}">
        <div class="student-top">
          <div class="avatar" style="background:${avatar.background}">${avatar.initial}</div>
          <div class="student-meta">
            <h3>${escapeHtml(s.name || "Student")}</h3>
            <div class="course">${escapeHtml(s.course || "SkillSwap Member")}</div>
          </div>
        </div>

        <div class="card-badge-row">
          ${greatMatch ? `<span class="match-badge">🎯 Great match</span>` : ""}
          ${isConnected ? `<span class="connected-badge">Connected ✓</span>` : ""}
        </div>

        <p class="student-bio">${escapeHtml(s.bio || "This student is ready to connect and trade knowledge.")}</p>

        <div class="skill-section-label">🎓 Can teach</div>
        <div class="tag-row">${renderTags(s.teach)}</div>

        <div class="skill-section-label">🎯 Wants to learn</div>
        <div class="tag-row">${renderTags(s.learn, true)}</div>

        <div class="card-actions">
          ${isConnected ? `
            <button type="button" class="button secondary view-contact-btn" data-uid="${escapeHtml(s.uid)}" data-name="${escapeHtml(s.name)}" data-email="${escapeHtml(connection.partnerEmail || "")}">
              Connected ✓ — View contact
            </button>
          ` : isPending ? `
            <button type="button" class="button secondary" disabled style="opacity:0.8;">
              Request pending ⏳
            </button>
          ` : `
            <button type="button" class="button request-btn" data-uid="${escapeHtml(s.uid)}">
              Request exchange
            </button>
          `}
        </div>
      </article>
    `;
  }).join("");

  // Attach Send Request Modal listeners
  grid.querySelectorAll(".request-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!currentUser) {
        showToast("Please log in to send skill exchange proposals.", "info");
        setTimeout(() => { location.href = "login.html"; }, 600);
        return;
      }

      const targetUid = btn.dataset.uid;
      const targetStudent = allStudents.find(s => s.uid === targetUid);
      if (!targetStudent) return;

      const modalResult = await showRequestModal({ toStudent: targetStudent, currentUser });
      if (!modalResult.confirmed || !modalResult.value) return;

      btn.disabled = true;
      btn.textContent = "Sending…";

      try {
        await sendSkillRequest({
          fromUser: currentUser,
          toStudent: targetStudent,
          message: modalResult.value
        });
        showToast("Skill exchange request sent! 🎉", "success");
        activeConnections.set(targetUid, { status: "pending" });
        renderGrid();
      } catch (err) {
        showToast(friendlyError(err), "error");
        btn.disabled = false;
        btn.textContent = "Request exchange";
      }
    });
  });

  // Attach View Contact Unlocked Modal listeners
  grid.querySelectorAll(".view-contact-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const studentName = btn.dataset.name || "Student";
      const email = btn.dataset.email;
      if (!email) {
        showToast("Contact details are available on your Requests page.", "info");
        setTimeout(() => { location.href = "requests.html"; }, 400);
        return;
      }
      showContactModal({ partnerName: studentName, email });
    });
  });
}

async function loadExistingConnections(uid) {
  activeConnections.clear();
  try {
    const q = query(
      collection(db, "requests"),
      where("participants", "array-contains", uid)
    );
    const snap = await getDocs(q);
    let acceptedCount = 0;

    snap.docs.forEach(docSnap => {
      const d = docSnap.data();
      const otherUid = d.fromUid === uid ? d.toUid : d.fromUid;
      const partnerEmail = d.fromUid === uid ? d.toEmail : d.fromEmail;

      if (d.status === "accepted") {
        acceptedCount++;
        activeConnections.set(otherUid, { status: "accepted", partnerEmail, reqId: docSnap.id });
      } else if (d.status === "pending" && d.fromUid === uid) {
        // Pending request sent by currentUser
        activeConnections.set(otherUid, { status: "pending", reqId: docSnap.id });
      }
    });

    if (statConnectionsEl) {
      statConnectionsEl.textContent = acceptedCount;
    }
  } catch (err) {
    console.warn("Could not load connection status:", err);
  }
}

async function loadStudents() {
  if (!grid) return;
  grid.innerHTML = renderSkeletonCards(6);

  try {
    const q = query(collection(db, "students"), orderBy("name"));
    const snap = await getDocs(q);
    allStudents = snap.docs.map(d => ({ uid: d.id, ...d.data() }));

    updateHeroStats(allStudents);
    populateDynamicFilters(allStudents);
    renderGrid();
  } catch (error) {
    grid.innerHTML = renderEmptyState({
      icon: "⚠️",
      title: "Could not load students",
      description: "Please check your network and verify your Firebase Firestore rules are published."
    });
    showToast(friendlyError(error), "error");
  }
}

// Search and filter input events
searchInput?.addEventListener("input", renderGrid);
skillFilter?.addEventListener("change", () => {
  selectedFilterChip = skillFilter.value;
  if (quickChipsContainer) {
    quickChipsContainer.querySelectorAll(".chip-btn").forEach(btn => {
      btn.classList.toggle("active", (btn.dataset.skill || "").toLowerCase() === selectedFilterChip.toLowerCase());
    });
  }
  renderGrid();
});

// Auth state initialization
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    try {
      const profileSnap = await getDoc(doc(db, "students", user.uid));
      currentUserProfile = profileSnap.exists() ? profileSnap.data() : null;
      await loadExistingConnections(user.uid);
    } catch (e) {
      console.warn("Could not fetch user profile for matching:", e);
    }
  } else {
    currentUserProfile = null;
    activeConnections.clear();
  }
  loadStudents();
});
