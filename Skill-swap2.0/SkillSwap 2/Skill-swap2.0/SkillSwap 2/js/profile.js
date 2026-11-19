import { auth, db, onAuthStateChanged, friendlyError, setupNav } from "./auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast, getAvatarStyle, escapeHtml } from "./ui.js";

setupNav();

const form = document.getElementById("profile-form");
const message = document.getElementById("page-message");

// Inputs
const nameInput = document.getElementById("name");
const courseInput = document.getElementById("course");
const bioInput = document.getElementById("bio");
const phoneInput = document.getElementById("phone");
const submitButton = form?.querySelector('button[type="submit"]');

// Chip input containers and state
let teachSkills = [];
let learnSkills = [];
let currentUser = null;

// Chip Manager Helper
function setupChipInput({ containerId, textInputId, initialSkills, onChange, isLearn = false }) {
  const container = document.getElementById(containerId);
  const textInput = document.getElementById(textInputId);
  if (!container || !textInput) return { getSkills: () => [], setSkills: () => {} };

  let skills = [...initialSkills];

  function renderChips() {
    // Keep textInput, remove old chips
    container.querySelectorAll(".input-chip").forEach(c => c.remove());
    skills.forEach((skill, index) => {
      const chip = document.createElement("span");
      chip.className = `input-chip ${isLearn ? "learn-chip" : ""}`;
      chip.innerHTML = `
        <span>${escapeHtml(skill)}</span>
        <button type="button" class="chip-remove" aria-label="Remove skill">&times;</button>
      `;
      chip.querySelector(".chip-remove").addEventListener("click", () => {
        skills.splice(index, 1);
        renderChips();
        onChange(skills);
      });
      container.insertBefore(chip, textInput);
    });
  }

  function addSkill(value) {
    const trimmed = value.trim().replace(/^,+|,+$/g, "");
    if (!trimmed) return;
    // Split on comma if user pasted multiple
    const parts = trimmed.split(",").map(p => p.trim()).filter(Boolean);
    parts.forEach(p => {
      if (skills.length < 20 && !skills.some(s => s.toLowerCase() === p.toLowerCase())) {
        skills.push(p);
      }
    });
    textInput.value = "";
    renderChips();
    onChange(skills);
  }

  textInput.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(textInput.value);
    } else if (e.key === "Backspace" && !textInput.value && skills.length > 0) {
      skills.pop();
      renderChips();
      onChange(skills);
    }
  });

  textInput.addEventListener("blur", () => {
    if (textInput.value) addSkill(textInput.value);
  });

  return {
    getSkills: () => skills,
    setSkills: newSkills => {
      skills = [...new Set(newSkills.map(s => s.trim()).filter(Boolean))].slice(0, 20);
      renderChips();
      onChange(skills);
    }
  };
}

// Live Profile Preview Manager
function updateLivePreview() {
  const previewAvatar = document.getElementById("preview-avatar");
  const previewName = document.getElementById("preview-name");
  const previewCourse = document.getElementById("preview-course");
  const previewBio = document.getElementById("preview-bio");
  const previewTeach = document.getElementById("preview-teach");
  const previewLearn = document.getElementById("preview-learn");

  const nameVal = nameInput?.value.trim() || "Your Name";
  const courseVal = courseInput?.value.trim() || "Your course or field";
  const bioVal = bioInput?.value.trim() || "Add a friendly bio introducing what you enjoy learning and building.";

  const avatar = getAvatarStyle(nameVal);
  if (previewAvatar) {
    previewAvatar.style.background = avatar.background;
    previewAvatar.textContent = avatar.initial;
  }
  if (previewName) previewName.textContent = nameVal;
  if (previewCourse) previewCourse.textContent = courseVal;
  if (previewBio) previewBio.textContent = bioVal;

  if (previewTeach) {
    previewTeach.innerHTML = teachSkills.length
      ? teachSkills.map(s => `<span class="tag">${escapeHtml(s)}</span>`).join("")
      : '<span class="text-dim" style="font-size:0.84rem;">No teaching skills added yet</span>';
  }

  if (previewLearn) {
    previewLearn.innerHTML = learnSkills.length
      ? learnSkills.map(s => `<span class="tag want">${escapeHtml(s)}</span>`).join("")
      : '<span class="text-dim" style="font-size:0.84rem;">No learning skills added yet</span>';
  }
}

// Initialize Chip Inputs
const teachChipManager = setupChipInput({
  containerId: "teach-chips-container",
  textInputId: "teach-chip-input",
  initialSkills: [],
  onChange: skills => {
    teachSkills = skills;
    updateLivePreview();
  },
  isLearn: false
});

const learnChipManager = setupChipInput({
  containerId: "learn-chips-container",
  textInputId: "learn-chip-input",
  initialSkills: [],
  onChange: skills => {
    learnSkills = skills;
    updateLivePreview();
  },
  isLearn: true
});

// Real-time input listeners for preview
nameInput?.addEventListener("input", updateLivePreview);
courseInput?.addEventListener("input", updateLivePreview);
bioInput?.addEventListener("input", updateLivePreview);

// Load user data on Auth Change
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    if (form) form.classList.add("hidden");
    if (message) {
      message.textContent = "Please log in to manage your SkillSwap profile.";
      message.classList.remove("hidden", "error");
    }
    return;
  }

  if (!form) return;
  form.classList.remove("hidden");

  try {
    // 1. Fetch public profile (students/{uid})
    const publicSnap = await getDoc(doc(db, "students", user.uid));
    const publicData = publicSnap.exists() ? publicSnap.data() : {};

    if (nameInput) nameInput.value = publicData.name || user.displayName || "";
    if (courseInput) courseInput.value = publicData.course || "";
    if (bioInput) bioInput.value = publicData.bio || "";

    teachChipManager.setSkills(publicData.teach || []);
    learnChipManager.setSkills(publicData.learn || []);

    // 2. Fetch private data (phone, email) from studentsPrivate/{uid}
    const privateSnap = await getDoc(doc(db, "studentsPrivate", user.uid));
    if (privateSnap.exists()) {
      const privateData = privateSnap.data();
      if (phoneInput) phoneInput.value = privateData.phone || "";
    }

    updateLivePreview();
  } catch (error) {
    showToast(friendlyError(error), "error");
  }
});

// Handle Form Submit
form?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!currentUser) {
    showToast("Please log in first.", "error");
    return;
  }

  const name = nameInput?.value.trim() || "";
  if (!name) {
    showToast("Please enter your name.", "warning");
    nameInput?.focus();
    return;
  }

  const course = courseInput?.value.trim() || "";
  const bio = bioInput?.value.trim() || "";
  const phone = phoneInput?.value.trim() || "";
  const teach = teachChipManager.getSkills();
  const learn = learnChipManager.getSkills();

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Saving profile…";
  }

  try {
    // 1. Save Public Profile: students/{uid} (WITHOUT EMAIL for privacy)
    await setDoc(doc(db, "students", currentUser.uid), {
      uid: currentUser.uid,
      name,
      course,
      bio,
      teach,
      learn,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2. Save Private Profile: studentsPrivate/{uid} (email & optional phone)
    await setDoc(doc(db, "studentsPrivate", currentUser.uid), {
      email: currentUser.email || "",
      phone,
      updatedAt: serverTimestamp()
    }, { merge: true });

    showToast("Profile saved successfully! ✨", "success");
    if (message) {
      message.textContent = "Profile updated successfully.";
      message.classList.remove("hidden", "error");
    }
  } catch (error) {
    showToast(friendlyError(error), "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Save Profile";
    }
  }
});
