# SkillSwap 2.0 — Student Skill Exchange Platform

SkillSwap 2.0 is a modern, privacy-first peer-to-peer web application where college students exchange technical and creative skills 1-on-1. Built with Vanilla HTML5, modern CSS3, and modern JavaScript (ES Modules), backed by Firebase Authentication and Cloud Firestore.

---

## 🌟 What's New in SkillSwap 2.0

### Part A — Premium UI & UX Upgrade
- **Modern Design & Glassmorphism:** Clean green brand identity (`#176b4d`), subtle gradients, soft glassmorphism sticky topbar, consistent 8px spacing scale, and smooth micro-interactions.
- **Dark Mode Support:** Full dark mode with CSS custom properties. Respects `prefers-color-scheme`, includes a navbar toggle, and saves preferences to `localStorage`.
- **Responsive Layout & Mobile Drawer:** Mobile-first responsive layout with collapsible mobile navigation drawer.
- **Smart Skill Matching:** Displays a `🎯 Great match` badge on student cards whenever another student's skills match what you want to learn (or vice-versa).
- **Dynamic Avatars:** Deterministic, vibrant avatar gradients generated from each student's name initials.
- **Custom Modals & Floating Toasts:** Replaced browser `prompt()` and `alert()` with custom accessible glassmorphism modals (proposal textarea + character counter) and animated floating toast notifications.
- **Interactive Chip Inputs:** In `profile.html`, skills to teach and learn are entered as removable tag pills (press Enter or comma to create, click `×` to remove).
- **Live Side-by-Side Profile Preview:** Watch your student card update in real-time as you type your name, bio, course, and skills.
- **Live Hero Stats Strip:** Live counts of active students, unique skills offered, and connections made directly from Cloud Firestore.
- **Dynamic Filters:** Popular skill chips and dynamic dropdown populated directly from real skills in the database.
- **Tabs & Pending Badge:** Tabbed interface on `requests.html` (Received vs Sent), relative timestamps ("2h ago", "Yesterday"), and live pending request count badge in the navbar.
- **Loading Skeletons:** Animated shimmer skeleton cards instead of static loading text.

### Part B — Privacy-First Contact Unlocking
- **Public Profile Privacy:** Student email addresses have been completely removed from public `students/{uid}` documents.
- **Private Subcollections:** Emails and optional phone numbers are stored in `studentsPrivate/{uid}`, accessible only by the account owner.
- **Secure Email Exchange:** When student A sends a proposal, their verified email is securely attached to the request doc. When student B accepts, their email is attached, unlocking:
  - 🎉 **"Contact Unlocked"** banner on both sides.
  - One-click **Copy Email** button with instant feedback.
  - **"Send Email"** (`mailto:`) button with pre-filled subject and body.
  - **"Open in Gmail"** button for direct webmail composition.
  - Direct WhatsApp link if phone number is provided.
- **Discovery Card States:** If already connected with a student, the discovery card displays `Connected ✓ — View contact` to open their contact info anytime. Duplicate requests to already connected or pending students are blocked.

---

## 📁 File Structure

```text
SkillSwap 2/
├── index.html            # Discovery page with search, filters & live stats
├── login.html            # Auth page (Email/Password + Google Sign-In)
├── profile.html          # Profile editor with chip input & live preview
├── requests.html         # Real-time exchange requests dashboard (Received / Sent)
├── style.css             # Complete modern stylesheet (Light/Dark themes)
├── firestore.rules       # Cloud Firestore security rules with privacy enforcement
├── README.md             # Documentation
└── js/
    ├── firebase-config.js # Firebase app initialization (DO NOT COMMIT SECRETS)
    ├── theme.js           # Light / Dark theme manager
    ├── ui.js              # Toasts, Modals, Avatars, Skeletons & Relative Time
    ├── auth.js            # Auth functions, student doc setup & nav logic
    ├── auth-page.js       # Login / Register page controller
    ├── profile.js         # Profile management with interactive chips
    ├── students.js        # Community discovery, matching algorithm & live filters
    └── requests.js        # Request exchange, real-time sync & contact unlocking
```

---

## 🚀 How to Run Locally

Because SkillSwap 2.0 uses **JavaScript ES Modules** (`import` / `export`), browsers require it to run over an HTTP/HTTPS server (not direct `file://` URLs).

### Option 1: VS Code Live Server (Recommended)
1. Open the folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **"Open with Live Server"**.

### Option 2: Python HTTP Server
Open your terminal in the `SkillSwap 2` directory:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

### Option 3: Node `serve`
```bash
npx serve .
```

---

## 🔐 Publishing Firestore Security Rules

To enforce privacy and secure contact exchange:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Build → Firestore Database → Rules**.
3. Replace the existing rules with the contents of `firestore.rules`.
4. Click **Publish**.

---

## 👥 Privacy Model Summary

| Data Collection | Read Permission | Write Permission | Contents |
| :--- | :--- | :--- | :--- |
| **`students/{uid}`** | Any signed-in user | Owner only (`auth.uid == uid`) | `name`, `course`, `bio`, `teach[]`, `learn[]` (No Email) |
| **`studentsPrivate/{uid}`** | Owner only | Owner only | `email`, `phone` |
| **`requests/{id}`** | Participants only (`auth.uid in participants`) | Sender (create), Receiver (update to accepted/rejected) | Proposal message, status, unlocked emails upon acceptance |
