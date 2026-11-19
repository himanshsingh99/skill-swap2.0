// UI Components & Helpers for SkillSwap 2.0
// Includes Toast notifications, Custom Modals, Deterministic Avatars,
// Relative Time Formatter, and Shimmer Skeletons.

// -------------------------------------------------------------
// 1. Toast Notifications
// -------------------------------------------------------------
let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer = Object.assign(toastContainer, {
        id: "toast-container",
        className: "toast-container",
        role: "status",
        ariaLive: "polite"
      });
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

export function showToast(message, type = "info", duration = 3500) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icons = {
    success: `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>`,
    error: `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`
  };

  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="toast-content">${escapeHtml(message)}</div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  const removeToast = () => {
    toast.classList.add("toast-hiding");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  };

  toast.querySelector(".toast-close")?.addEventListener("click", removeToast);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(removeToast, duration);
  }
}

// -------------------------------------------------------------
// 2. Deterministic Vibrant Avatar Gradients
// -------------------------------------------------------------
const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #10b981 0%, #047857 100%)", // Emerald
  "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", // Indigo
  "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)", // Sky
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", // Purple
  "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)", // Amber
  "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", // Pink
  "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)", // Teal
  "linear-gradient(135deg, #f97316 0%, #c2410c 100%)", // Orange
  "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"  // Blue
];

export function getAvatarStyle(name = "Student") {
  const cleanName = (name || "Student").trim();
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  const initial = (cleanName[0] || "S").toUpperCase();
  return {
    background: AVATAR_GRADIENTS[index],
    initial
  };
}

// -------------------------------------------------------------
// 3. Custom Modal Manager (Request exchange & Contact Unlock)
// -------------------------------------------------------------
export function showModal({ title, subtitle, contentHtml, onConfirm, confirmText = "Confirm", confirmClass = "button", cancelText = "Cancel", showCancel = true }) {
  return new Promise(resolve => {
    // Remove existing modal if any
    document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");

    backdrop.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div>
            <h3 class="modal-title">${escapeHtml(title)}</h3>
            ${subtitle ? `<p class="modal-subtitle">${escapeHtml(subtitle)}</p>` : ""}
          </div>
          <button class="modal-close" aria-label="Close dialog">&times;</button>
        </div>
        <div class="modal-body">${contentHtml}</div>
        <div class="modal-footer">
          ${showCancel ? `<button type="button" class="button secondary modal-cancel-btn">${escapeHtml(cancelText)}</button>` : ""}
          <button type="button" class="${confirmClass} modal-confirm-btn">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    // Prevent background scroll
    document.body.style.overflow = "hidden";

    // Trigger open animation
    requestAnimationFrame(() => backdrop.classList.add("modal-open"));

    const closeModal = (confirmed = false, value = null) => {
      backdrop.classList.remove("modal-open");
      document.body.style.overflow = "";
      backdrop.addEventListener("animationend", () => backdrop.remove(), { once: true });
      resolve({ confirmed, value });
    };

    backdrop.querySelector(".modal-close")?.addEventListener("click", () => closeModal(false));
    backdrop.querySelector(".modal-cancel-btn")?.addEventListener("click", () => closeModal(false));
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop) closeModal(false);
    });

    const confirmBtn = backdrop.querySelector(".modal-confirm-btn");
    confirmBtn?.addEventListener("click", async () => {
      if (onConfirm) {
        confirmBtn.disabled = true;
        try {
          const result = await onConfirm(backdrop);
          if (result !== false) closeModal(true, result);
        } catch (err) {
          showToast(err.message || "Action failed", "error");
        } finally {
          confirmBtn.disabled = false;
        }
      } else {
        closeModal(true);
      }
    });

    // Escape key
    const onKey = e => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        closeModal(false);
      }
    };
    document.addEventListener("keydown", onKey);
  });
}

// Specialized Skill Request Proposal Modal
export function showRequestModal({ toStudent, currentUser }) {
  const avatar = getAvatarStyle(toStudent.name);
  const teachList = (toStudent.teach || []).slice(0, 4).join(", ") || "various topics";
  const learnList = (toStudent.learn || []).slice(0, 4).join(", ") || "new skills";

  const defaultMessage = `Hi ${toStudent.name || "there"}, I saw you can teach ${teachList}. I'd love to exchange skills and teach what I know!`;

  const contentHtml = `
    <div class="modal-student-summary">
      <div class="avatar" style="background:${avatar.background}">${avatar.initial}</div>
      <div>
        <strong>${escapeHtml(toStudent.name || "Student")}</strong>
        <p class="muted">${escapeHtml(toStudent.course || "SkillSwap Member")}</p>
      </div>
    </div>
    <div class="modal-skill-chips-row">
      <div class="summary-pill teach"><strong>Teaches:</strong> ${escapeHtml(teachList)}</div>
      <div class="summary-pill learn"><strong>Wants:</strong> ${escapeHtml(learnList)}</div>
    </div>
    <div class="field" style="margin-top:16px;">
      <label for="modal-request-message">Proposal Message</label>
      <textarea id="modal-request-message" maxlength="500" rows="4" placeholder="Mention what you want to learn and what you can teach in return...">${escapeHtml(defaultMessage)}</textarea>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
        <small class="muted">Clear and friendly proposals get accepted faster!</small>
        <small id="char-counter" class="muted">0 / 500</small>
      </div>
    </div>
  `;

  return showModal({
    title: "Request Skill Exchange",
    subtitle: `Send a proposal to connect and exchange knowledge.`,
    contentHtml,
    confirmText: "Send Request 🚀",
    confirmClass: "button",
    onConfirm: backdrop => {
      const input = backdrop.querySelector("#modal-request-message");
      const msg = input?.value.trim();
      if (!msg) {
        showToast("Please enter a message for your proposal.", "warning");
        return false;
      }
      return msg;
    }
  });
}

// Specialized Contact Details Modal (Unlocked when request is accepted)
export function showContactModal({ partnerName, email, phone = "", myRole = "partner" }) {
  const subject = encodeURIComponent("SkillSwap: Let's start our skill exchange!");
  const body = encodeURIComponent(
    `Hi ${partnerName},\n\nI'm so glad we connected on SkillSwap! When is a good time for us to coordinate our first session?\n\nLooking forward to learning together,\n`
  );
  const mailtoLink = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
  const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
  const cleanPhone = (phone || "").replace(/[^0-9+]/g, "");
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(`Hi ${partnerName}, connected via SkillSwap!`)}` : null;

  const contentHtml = `
    <div class="unlocked-contact-card">
      <div class="unlocked-banner">
        <span class="unlocked-icon">🎉</span>
        <div>
          <strong>Connection Confirmed!</strong>
          <p>Both of you have agreed to swap skills. Reach out to coordinate.</p>
        </div>
      </div>

      <div class="contact-detail-row">
        <span class="contact-label">Student:</span>
        <span class="contact-value font-bold">${escapeHtml(partnerName)}</span>
      </div>

      <div class="contact-detail-row">
        <span class="contact-label">Email:</span>
        <div class="contact-copy-wrap">
          <span class="contact-value" id="partner-email-display">${escapeHtml(email)}</span>
          <button type="button" class="button small secondary copy-email-btn" data-email="${escapeHtml(email)}">
            📋 Copy
          </button>
        </div>
      </div>

      ${cleanPhone ? `
      <div class="contact-detail-row">
        <span class="contact-label">Phone / WhatsApp:</span>
        <span class="contact-value">${escapeHtml(phone)}</span>
      </div>` : ""}

      <div class="contact-action-grid">
        <a href="${mailtoLink}" class="button" target="_blank" rel="noopener">
          ✉️ Send Email
        </a>
        <a href="${gmailLink}" class="button secondary" target="_blank" rel="noopener">
          <img src="https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_32dp.png" alt="Gmail" width="16" height="16" style="vertical-align:middle;margin-right:6px;"> Open in Gmail
        </a>
        ${waLink ? `
        <a href="${waLink}" class="button secondary wa-btn" target="_blank" rel="noopener" style="background:#25D36622; color:#128C7E;">
          💬 Chat on WhatsApp
        </a>` : ""}
      </div>
    </div>
  `;

  return showModal({
    title: `Contact ${partnerName}`,
    subtitle: "Coordinate your skill exchange sessions via email or chat.",
    contentHtml,
    confirmText: "Done",
    showCancel: false,
    onConfirm: backdrop => {
      // Setup copy listener if needed inside modal
      return true;
    }
  });
}

// -------------------------------------------------------------
// 4. Relative Time Formatter
// -------------------------------------------------------------
export function formatRelativeTime(timestamp) {
  if (!timestamp) return "Recently";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) {
    const mins = Math.max(1, Math.floor(diffSec / 60));
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours}h ago`;
  }
  if (diffSec < 172800) return "Yesterday";
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// -------------------------------------------------------------
// 5. Skeleton Shimmers & Empty States
// -------------------------------------------------------------
export function renderSkeletonCards(count = 6) {
  return Array.from({ length: count }).map(() => `
    <article class="student-card skeleton-card" aria-hidden="true">
      <div class="student-top">
        <div class="skeleton-avatar"></div>
        <div class="skeleton-header-text">
          <div class="skeleton-line title"></div>
          <div class="skeleton-line subtitle"></div>
        </div>
      </div>
      <div class="skeleton-line text"></div>
      <div class="skeleton-line text short"></div>
      <div class="skeleton-tag-row">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
      </div>
      <div class="skeleton-line button"></div>
    </article>
  `).join("");
}

export function renderEmptyState({ icon = "🔍", title = "No results found", description = "Try adjusting your search or filters.", actionText = "", actionHref = "" }) {
  return `
    <div class="empty-state-card">
      <div class="empty-state-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p class="muted">${escapeHtml(description)}</p>
      ${actionText && actionHref ? `<a href="${escapeHtml(actionHref)}" class="button small" style="margin-top:16px;">${escapeHtml(actionText)}</a>` : ""}
    </div>
  `;
}

// -------------------------------------------------------------
// 6. Utility Functions
// -------------------------------------------------------------
export function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

// Global delegated listener for copy buttons
document.addEventListener("click", async e => {
  const copyBtn = e.target.closest(".copy-email-btn");
  if (copyBtn) {
    const email = copyBtn.dataset.email;
    if (email) {
      try {
        await navigator.clipboard.writeText(email);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✓ Copied!";
        copyBtn.classList.add("btn-copied");
        showToast("Email copied to clipboard!", "success");
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
          copyBtn.classList.remove("btn-copied");
        }, 2000);
      } catch (err) {
        showToast("Could not copy automatically. Please copy manually.", "warning");
      }
    }
  }
});
