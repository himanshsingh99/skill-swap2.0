import {
  registerUser, loginUser, googleSignIn, resetPassword,
  friendlyError, firebaseConfigured, setupNav
} from "./auth.js";
import { showToast } from "./ui.js";

setupNav();

const title = document.getElementById("auth-title");
const nameWrap = document.getElementById("name-wrap");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordWrap = document.getElementById("confirm-password-wrap");
const confirmPasswordInput = document.getElementById("confirm-password");
const passwordMatchMsg = document.getElementById("password-match-msg");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
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

function checkPasswordMatch() {
  if (mode !== "register" || !passwordMatchMsg) return;
  const pass = passwordInput?.value || "";
  const confirm = confirmPasswordInput?.value || "";

  if (!confirm) {
    passwordMatchMsg.classList.add("hidden");
    return;
  }

  passwordMatchMsg.classList.remove("hidden");
  if (pass === confirm) {
    passwordMatchMsg.textContent = "✓ Passwords match";
    passwordMatchMsg.className = "password-match-indicator match";
  } else {
    passwordMatchMsg.textContent = "✕ Passwords do not match";
    passwordMatchMsg.className = "password-match-indicator mismatch";
  }
}

passwordInput?.addEventListener("input", checkPasswordMatch);
confirmPasswordInput?.addEventListener("input", checkPasswordMatch);

function updateMode() {
  const isRegister = mode === "register";
  if (title) title.textContent = isRegister ? "Create your account" : "Welcome back";
  if (nameWrap) nameWrap.classList.toggle("hidden", !isRegister);
  if (nameInput) nameInput.required = isRegister;

  // Confirm password field for register mode
  if (confirmPasswordWrap) confirmPasswordWrap.classList.toggle("hidden", !isRegister);
  if (confirmPasswordInput) {
    confirmPasswordInput.required = isRegister;
    confirmPasswordInput.value = "";
  }
  if (passwordMatchMsg) passwordMatchMsg.classList.add("hidden");

  // Forgot password button only visible in login mode
  if (forgotPasswordBtn) forgotPasswordBtn.classList.toggle("hidden", isRegister);

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
  const confirmPassword = confirmPasswordInput?.value || "";

  if (!email || !password) {
    showNotice("Please enter your email and password.", true);
    return;
  }

  if (mode === "register") {
    if (!nameInput?.value.trim()) {
      showNotice("Please enter your full name.", true);
      nameInput?.focus();
      return;
    }
    if (password.length < 6) {
      showNotice("Password must be at least 6 characters long.", true);
      passwordInput?.focus();
      return;
    }
    if (password !== confirmPassword) {
      showNotice("Passwords do not match! Please recheck and confirm your password.", true);
      confirmPasswordInput?.focus();
      return;
    }
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

// Forgot Password Feature
forgotPasswordBtn?.addEventListener("click", async () => {
  const email = emailInput?.value.trim() || "";
  if (!email) {
    showNotice("Please enter your email address in the field above to reset your password.", true);
    emailInput?.focus();
    return;
  }

  forgotPasswordBtn.disabled = true;
  forgotPasswordBtn.textContent = "Sending…";

  try {
    await resetPassword(email);
    showNotice(`Password reset link sent to ${email}! Please check your email inbox and spam folder.`);
  } catch (error) {
    showNotice(friendlyError(error), true);
  } finally {
    forgotPasswordBtn.disabled = false;
    forgotPasswordBtn.textContent = "Forgot password?";
  }
});

// Google Sign-In Feature
googleButton?.addEventListener("click", async () => {
  googleButton.disabled = true;
  const originalHtml = googleButton.innerHTML;
  googleButton.innerHTML = "Connecting to Google…";

  try {
    await googleSignIn();
    showNotice("Signed in with Google successfully! Redirecting…");
    setTimeout(() => {
      location.href = "profile.html";
    }, 600);
  } catch (error) {
    showNotice(friendlyError(error), true);
  } finally {
    googleButton.disabled = false;
    googleButton.innerHTML = originalHtml;
  }
});

if (!firebaseConfigured) {
  showNotice("Setup needed: add your Firebase credentials in js/firebase-config.js before logging in.", true);
}

updateMode();
