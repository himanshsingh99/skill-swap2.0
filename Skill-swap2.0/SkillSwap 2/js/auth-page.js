import { registerUser, loginUser, googleSignIn, friendlyError, firebaseConfigured } from "./auth.js";

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

function showMessage(text, error = false) {
  message.textContent = text;
  message.classList.remove("hidden", "error");
  if (error) message.classList.add("error");
}
function updateMode() {
  const isRegister = mode === "register";
  title.textContent = isRegister ? "Create your account" : "Welcome back";
  nameWrap.classList.toggle("hidden", !isRegister);
  nameInput.required = isRegister;
  passwordInput.autocomplete = isRegister ? "new-password" : "current-password";
  submitButton.textContent = isRegister ? "Create account" : "Login";
  switchText.textContent = isRegister ? "Already have an account?" : "New to SkillSwap?";
  switchButton.textContent = isRegister ? "Login" : "Create account";
}
switchButton.addEventListener("click", () => { mode = mode === "login" ? "register" : "login"; updateMode(); });
document.querySelector("form")?.addEventListener("submit", e => e.preventDefault());
submitButton.addEventListener("click", async () => {
  const email = emailInput.value.trim(), password = passwordInput.value;
  if (!email || !password || (mode === "register" && !nameInput.value.trim())) return showMessage("Please complete all required fields.", true);
  submitButton.disabled = true;
  try {
    if (mode === "register") await registerUser({ name: nameInput.value, email, password });
    else await loginUser({ email, password });
    location.href = "profile.html";
  } catch (error) { showMessage(friendlyError(error), true); }
  finally { submitButton.disabled = false; }
});
googleButton.addEventListener("click", async () => {
  googleButton.disabled = true;
  try { await googleSignIn(); location.href = "profile.html"; }
  catch (error) { showMessage(friendlyError(error), true); }
  finally { googleButton.disabled = false; }
});
if (!firebaseConfigured) showMessage("Setup needed: add your Firebase Web App config in js/firebase-config.js before using login.", true);
updateMode();
