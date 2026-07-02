/* =============================================================================
   main.js  —  Shared front-end behaviour for every page.

   WHY THIS FILE EXISTS
   --------------------
   Small bits of interactivity that every page needs (mobile menu, highlighting
   the current nav link, the footer year) live here so they are written ONCE and
   behave identically everywhere.

   It also exports a reusable showFeedback() helper. Your CRUD feature pages will
   call this after talking to your back-end API, so that every page shows
   success/error messages in exactly the same style — which the rubric rewards as
   "consistent and clear feedback to users".

   CONVENTIONS (so you can explain them at the demo)
   -------------------------------------------------
   - Functions and variables use camelCase (showFeedback, navToggle).
   - We wait for DOMContentLoaded before touching the DOM, so the script can be
     loaded with <script defer> in <head> and still find every element.
============================================================================= */

/* -----------------------------------------------------------------------------
   showFeedback(message, type, targetId)
   Writes a styled message into an .alert container on the page.

   @param {string} message  - the text to show the user.
   @param {string} type     - 'success' | 'error' | 'info' (controls colour).
   @param {string} targetId - id of the .alert element to write into.
                              Defaults to 'feedback'.

   Example (you'll use this later on a feature page):
     showFeedback('Stall added successfully.', 'success');
     showFeedback('Name is required.', 'error');
----------------------------------------------------------------------------- */
function showFeedback(message, type = "info", targetId = "feedback") {
  const box = document.getElementById(targetId);
  if (!box) return; // Page has no feedback container — nothing to do.

  // A small icon per message type, kept text-based so no icon library is needed.
  const icons = { success: "\u2713", error: "\u2715", info: "\u2139" };

  // Reset the box to a clean .alert of the requested type, then fill it.
  box.className = `alert alert--${type}`;
  box.innerHTML =
    `<span class="alert__icon" aria-hidden="true">${icons[type] || icons.info}</span>` +
    `<span class="alert__text">${message}</span>`;

  // Make the message announced to screen readers as soon as it appears.
  box.setAttribute("role", type === "error" ? "alert" : "status");

  // Bring the message into view if the user has scrolled away from it.
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* clearFeedback(targetId) — hide any current message. */
function clearFeedback(targetId = "feedback") {
  const box = document.getElementById(targetId);
  if (box) box.className = "alert is-hidden";
}

/* -----------------------------------------------------------------------------
   initTabs()
   Powers any tabbed panel on the site (the login card here; the Customer,
   Vendor and Operator hubs later) — all from the same code, no per-page JS.

   HOW THE MARKUP CONNECTS (data attributes do the wiring):
     <div class="tabs" data-tabs>
       <button class="tab" data-tab="signin">Sign in</button>   ← a tab button
       <button class="tab" data-tab="register">Register</button>
     </div>
     <div class="tab-panel" data-panel="signin"> ... </div>      ← matching panel
     <div class="tab-panel" data-panel="register"> ... </div>

   Clicking a [data-tab] shows the [data-panel] whose value matches, and hides
   the rest. The first tab in each group is shown by default.
----------------------------------------------------------------------------- */
function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((group) => {
    const tabs = group.querySelectorAll(".tab");
    const scope = group.closest("[data-tab-scope]") || document;

    function activate(name) {
      // Toggle the active styling on the buttons.
      tabs.forEach((tab) =>
        tab.classList.toggle("is-active", tab.dataset.tab === name)
      );
      // Show only the matching panel; hide the others.
      scope.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("is-hidden", panel.dataset.panel !== name);
      });
    }

    tabs.forEach((tab) =>
      tab.addEventListener("click", () => activate(tab.dataset.tab))
    );

    // Start on the first tab so a panel is always visible on load.
    if (tabs.length) activate(tabs[0].dataset.tab);
  });
}

/* switchTab(name) — programmatically jump to a tab (e.g. after registering,
   send the user to the "Sign in" tab). Exposed for page scripts like auth.js. */
function switchTab(name) {
  const btn = document.querySelector(`.tab[data-tab="${name}"]`);
  if (btn) btn.click();
}

/* -----------------------------------------------------------------------------
   Page setup — runs once the HTML is parsed.
----------------------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  /* (a) Mobile navigation: toggle the menu open/closed when the hamburger is
     tapped, and update aria-expanded for assistive technology. */
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  /* (b) Active link: compare each nav link's filename against the current page
     and mark the match with .is-active so users always know where they are. */
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__link").forEach((link) => {
    const linkPage = link.getAttribute("href").split("/").pop();
    if (linkPage === currentPage) link.classList.add("is-active");
  });

  /* (c) Footer year: keep the copyright year current without editing HTML. */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* (d) Tabs: wire up any tabbed panels found on the page. */
  initTabs();
});