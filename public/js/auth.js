/* =============================================================================
   auth.js  —  Page logic for index.html (the login gate). Loaded ONLY here.

   WHAT IT DOES
   ------------
   1. Validates the sign-in and register forms in the browser, giving instant
      feedback through the shared showFeedback() helper (from main.js).
   2. Sends the real API requests your back-end will answer:
         POST /api/auth/login      → returns the user's role (and a token)
         POST /api/auth/register   → creates an account
   3. On a successful login, redirects the user to their role's home page.

   FRONT-END / BACK-END BOUNDARY
   -----------------------------
   This file is the front-end's SIDE of the contract — it calls the endpoints.
   Building those endpoints is back-end work for a later chat. Until they exist,
   submitting the form will show a friendly "couldn't reach the server" message
   (proving the error-handling path works); use the developer quick links on the
   page to move around the site in the meantime.

   EXPECTED API SHAPES (so the back-end has a clear target to build to)
   --------------------------------------------------------------------
     LOGIN  request : { "email": "...", "password": "..." }
            success : { "role": "customer", "token": "<jwt>" }
     REGISTER req   : { "name": "...", "email": "...", "password": "...", "role": "customer" }
            success : { "message": "Account created" }
============================================================================= */

// Where each role goes after a successful login. Paths are relative to
// index.html (which sits at the public/ root), matching the folder structure.
const ROLE_HOME = {
  customer: "./customer/stalls.html",
  vendor: "./vendor/vendor.html",
  nea: "./nea/nea.html",
  operator: "./operator/operator.html",
};

/* Wires every password field: the Show/Hide toggle, and a Caps-Lock hint that
   appears only while Caps Lock is on. Driven by data-attributes in the markup
   so no per-field code is needed. */
function initPasswordFields() {
  // Show / hide toggles
  document.querySelectorAll("[data-password-toggle]").forEach((toggle) => {
    const input = toggle.parentElement.querySelector("input");
    if (!input) return;
    toggle.addEventListener("click", () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      toggle.textContent = reveal ? "Hide" : "Show";
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
  });

  // Caps-Lock hint (shows the [data-caps-hint] in the same .field)
  document.querySelectorAll('input[type="password"]').forEach((input) => {
    const hint = input.closest(".field")?.querySelector("[data-caps-hint]");
    if (!hint) return;
    const update = (event) => {
      const capsOn = event.getModifierState && event.getModifierState("CapsLock");
      hint.classList.toggle("is-hidden", !capsOn);
    };
    input.addEventListener("keydown", update);
    input.addEventListener("keyup", update);
  });
}

// A simple email sanity check — good enough for front-end UX. The back-end
// still validates properly (with Joi) since client checks can be bypassed.
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  /* ---------------------------------------------------------------------------
     SIGN IN
  --------------------------------------------------------------------------- */
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Stop the browser's default page reload.
      clearFeedback("login-feedback");

      // Read and trim the inputs.
      // Read via form.elements[...] — robust even when a field is named
      // "name"/"role", which otherwise clash with built-in form properties.
      const email = loginForm.elements.email.value.trim();
      const password = loginForm.elements.password.value;

      // Client-side validation with clear, specific messages.
      if (!email || !password) {
        showFeedback("Enter your email and password.", "error", "login-feedback");
        return;
      }
      if (!isValidEmail(email)) {
        showFeedback("That email doesn't look right.", "error", "login-feedback");
        return;
      }

      showFeedback("Signing you in…", "info", "login-feedback");

      try {
        // The real request. Your back-end answers this in a later chat.
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        // Non-2xx status → show the server's message (e.g. wrong password).
        if (!res.ok) {
          showFeedback(data.message || "Login failed.", "error", "login-feedback");
          return;
        }

        // Success: keep the token for authenticated requests, then route by role.
        if (data.token) localStorage.setItem("token", data.token);
        const destination = ROLE_HOME[data.role];
        if (destination) {
          window.location.href = destination;
        } else {
          showFeedback("Unknown account role.", "error", "login-feedback");
        }
      } catch (err) {
        // Network/server unreachable (e.g. back-end not running yet).
        showFeedback(
          "Couldn't reach the server. Is the back-end running?",
          "error",
          "login-feedback"
        );
      }
    });
  }

  /* ---------------------------------------------------------------------------
     REGISTER
  --------------------------------------------------------------------------- */
  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback("register-feedback");

      // form.elements[...] avoids the reserved-name trap: registerForm.name
      // and registerForm.role would return the form's own properties, not the
      // inputs, so we read every field through the elements collection.
      const name = registerForm.elements.name.value.trim();
      const email = registerForm.elements.email.value.trim();
      const password = registerForm.elements.password.value;
      const confirm = registerForm.elements.confirm.value;
      const role = registerForm.elements.role.value;

      // Validate every field with its own specific message.
      if (!name || !email || !password || !confirm) {
        showFeedback("Please fill in all fields.", "error", "register-feedback");
        return;
      }
      if (!isValidEmail(email)) {
        showFeedback("Enter a valid email address.", "error", "register-feedback");
        return;
      }
      if (password.length < 8) {
        showFeedback("Password must be at least 8 characters.", "error", "register-feedback");
        return;
      }
      if (password !== confirm) {
        showFeedback("Passwords don't match.", "error", "register-feedback");
        return;
      }

      showFeedback("Creating your account…", "info", "register-feedback");

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });
        const data = await res.json();

        if (!res.ok) {
          showFeedback(data.message || "Registration failed.", "error", "register-feedback");
          return;
        }

        // Success: tell the user, clear the form, and send them to Sign in.
        showFeedback("Account created. You can sign in now.", "success", "register-feedback");
        registerForm.reset();
        switchTab("signin"); // helper from main.js
      } catch (err) {
        showFeedback(
          "Couldn't reach the server. Is the back-end running?",
          "error",
          "register-feedback"
        );
      }
    });
  }
});