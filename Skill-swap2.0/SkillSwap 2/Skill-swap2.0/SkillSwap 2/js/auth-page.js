import { registerUser, loginUser, googleSignIn, friendlyError, firebaseConfigured, setupNav } from "./auth.js";
import { showToast } from "./ui.js";

setupNav();

const title = document.getElementById("auth-title");
const nameWrap = document.getElementById("name-wrap");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit-btn");
const googleButton = document.getElementById("google-btn");
const switchButton = document.getElementById("switch-mode");
const switchText = document.getElementById("switch-text");
const message = document.getElementById("page-message");

let mode = "login";

function showNotice(text, isError = false) {
  if (message) {
    message.textContent = text;
    message.classList.remove("hidden", "error");
    if (isError) message.classList.add("error");
  }
  showToast(text, isError ? "error" : "success");
}

function updateMode() {
  const isRegister = mode === "register";
  if (title) title.textContent = isRegister ? "Create your account" : "Welcome back";
  if (nameWrap) nameWrap.classList.toggle("hidden", !isRegister);
  if (nameInput) nameInput.required = isRegister;
  if (passwordInput) passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
  if (submitButton) submitButton.textContent = isRegister ? "Create account" : "Login";
  if (switchText) switchText.textContent = isRegister ? "Already have an account?" : "New to SkillSwap?";
  if (switchButton) switchButton.textContent = isRegister ? "Login instead" : "Create account";
}

switchButton?.addEventListener("click", () => {
  mode = mode === "login" ? "register" : "login";
  updateMode();
});

document.querySelector("form")?.addEventListener("submit", e => e.preventDefault());

submitButton?.addEventListener("click", async () => {
  const email = emailInput?.value.trim() || "";
  const password = passwordInput?.value || "";

  if (!email || !password || (mode === "register" && !nameInput?.value.trim())) {
    showNotice("Please fill in all required fields.", true);
    return;
  }

  submitButton.disabled = true;
  const originalText = submitButton.textContent;
  submitButton.textContent = mode === "register" ? "Creating account…" : "Logging in…";

  try {
    if (mode === "register") {
      await registerUser({ name: nameInput.value, email, password });
      showNotice("Account created successfully! Welcome to SkillSwap.");
    } else {
      await loginUser({ email, password });
      showNotice("Logged in successfully! Welcome back.");
    }
    setTimeout(() => {
      location.href = "profile.html";
    }, 600);
  } catch (error) {
    showNotice(friendlyError(error), true);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
});

googleButton?.addEventListener("click", async () => {
  googleButton.disabled = true;
  try {
    await googleSignIn();
    showNotice("Signed in with Google successfully!");
    setTimeout(() => {
      location.href = "profile.html";
    }, 600);
  } catch (error) {
    showNotice(friendlyError(error), true);
  } finally {
    googleButton.disabled = false;
  }
});

if (!firebaseConfigured) {
  showNotice("Setup needed: add your Firebase credentials in js/firebase-config.js before logging in.", true);
}

updateMode();
