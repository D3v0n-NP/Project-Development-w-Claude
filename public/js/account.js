/* =============================================================================
   account.js — drives customer/account.html (settings + order history).
   Depends on showFeedback() from main.js (loaded first).

   FLOW:
     1) Wire the settings-nav tab switching (Account / Orders / Payment).
     2) Fetch the signed-in customer's profile and last 10 orders.
     3) Profile form: validates, then PUT /api/customers/me on save.
     4) Delete account: confirmation prompt, then DELETE /api/customers/me.

   BACK-END CONTRACT (mapped fully in the back-end blueprint message):
     GET    /api/customers/me           → customer profile
     PUT    /api/customers/me           → update name/email/phone
     PUT    /api/customers/me/password  → change password (confirmation flow)
     DELETE /api/customers/me           → delete the account
     GET    /api/customers/me/orders    → last 10 order groups (with fan-out)
============================================================================= */

/* ---------- TEMPORARY mock data — swap for real fetch() once endpoints exist ---------- */
const MOCK_PROFILE = {
  customerId: 42,
  firstName: "Wei Ming",
  lastName: "Tan",
  email: "weiming.tan@example.com",
  phone: "9123 4567",
  memberSince: "2026-03-14",
};
const MOCK_ORDERS = [
  {
    orderGroupId: 482,
    placedAt: "2026-06-22T11:42:00Z",
    orders: [
      { stallId: 2, stallName: "Loo's Hainanese Curry Rice", itemCount: 2, subtotal: 11.00, status: "collected" },
      { stallId: 7, stallName: "Roti Prata House",            itemCount: 2, subtotal: 4.20,  status: "collected" },
    ],
    total: 15.20,
  },
  {
    orderGroupId: 471,
    placedAt: "2026-06-18T19:05:00Z",
    orders: [
      { stallId: 1, stallName: "Ah Hock Chicken Rice", itemCount: 1, subtotal: 5.00, status: "collected" },
    ],
    total: 5.00,
  },
  {
    orderGroupId: 463,
    placedAt: "2026-06-15T12:30:00Z",
    orders: [
      { stallId: 5, stallName: "Selera Rasa Nasi Lemak", itemCount: 3, subtotal: 13.50, status: "cancelled" },
    ],
    total: 13.50,
  },
];

let profile = null;
let orders = [];

/* ----- helpers ----- */

function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}

/* Format an ISO date as "22 Jun 2026, 11:42 AM" — readable, ordering-friendly. */
function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("en-SG", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

/* Format an ISO date as just the date — used for "Member since". */
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" });
}

/* ----- tab switching ----- */

function switchTab(tabName) {
  // Update nav buttons
  document.querySelectorAll(".settings-nav__item").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.tab === tabName);
  });
  // Show only the matching panel section
  document.querySelectorAll(".settings-section").forEach((section) => {
    section.classList.toggle("is-hidden", section.dataset.section !== tabName);
  });
}

/* ----- profile ----- */

function renderProfile(p) {
  document.getElementById("first-name").value = p.firstName;
  document.getElementById("last-name").value  = p.lastName;
  document.getElementById("email").value      = p.email;
  document.getElementById("phone").value      = p.phone;
  document.getElementById("member-since").textContent = fmtDate(p.memberSince);
}

function validateProfileForm(form) {
  const errors = {};
  const first  = form.elements.firstName.value.trim();
  const last   = form.elements.lastName.value.trim();
  const email  = form.elements.email.value.trim();
  const phone  = form.elements.phone.value.trim();

  if (first.length < 1) errors.firstName = "Enter your first name.";
  if (last.length < 1)  errors.lastName  = "Enter your last name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Enter a valid email.";
  if (!/^[0-9 +()-]{6,}$/.test(phone))           errors.phone = "Enter a valid phone number.";

  // Toggle .is-invalid on each .field wrapper
  for (const [key, name] of [["firstName", "first-name"], ["lastName", "last-name"], ["email", "email"], ["phone", "phone"]]) {
    const input = document.getElementById(name);
    const wrap  = input.closest(".field");
    const bad   = Boolean(errors[key]);
    wrap.classList.toggle("is-invalid", bad);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
  }
  return errors;
}

async function saveProfile(event) {
  event.preventDefault();
  const form = document.getElementById("profile-form");
  const button = document.getElementById("save-profile");

  const errors = validateProfileForm(form);
  if (Object.keys(errors).length > 0) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Saving…";

  const payload = {
    firstName: form.elements.firstName.value.trim(),
    lastName:  form.elements.lastName.value.trim(),
    email:     form.elements.email.value.trim(),
    phone:     form.elements.phone.value.trim(),
  };

  try {
    // --- TEMPORARY: mock save ---
    await new Promise((r) => setTimeout(r, 500));
    Object.assign(profile, payload);

    // --- REAL (enable once endpoint exists) ---
    // const res = await fetch("/api/customers/me", {
    //   method: "PUT",
    //   headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
    //   body: JSON.stringify(payload),
    // });
    // if (!res.ok) throw new Error((await res.json()).message || "Save failed");
    // profile = (await res.json()).data;

    showFeedback("Profile updated.", "success");
  } catch (err) {
    showFeedback("Could not save your profile. Please try again.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save changes";
  }
}

/* ----- password change ----- */

function changePassword() {
  // Real implementation: open a modal with three fields (current / new / confirm),
  // then PUT /api/customers/me/password. For the demo we stub it as a feedback line.
  showFeedback("Password change flow will open here. (Stubbed for the demo.)", "info");
}

/* ----- delete account ----- */

async function deleteAccount() {
  const confirmed = window.confirm(
    "Delete your account permanently? Your profile and order history will be removed. This cannot be undone."
  );
  if (!confirmed) return;

  try {
    // --- TEMPORARY: mock delete ---
    await new Promise((r) => setTimeout(r, 400));

    // --- REAL ---
    // const res = await fetch("/api/customers/me", {
    //   method: "DELETE",
    //   headers: { "Authorization": `Bearer ${getToken()}` },
    // });
    // if (!res.ok) throw new Error("Delete failed");

    // Clear local session + redirect
    localStorage.removeItem("hawkerHub.token");
    localStorage.removeItem("hawkerHub.cart");
    window.location.href = "/login.html?deleted=1";
  } catch (err) {
    showFeedback("Could not delete your account. Please try again.", "error");
  }
}

/* ----- order history ----- */

/* Map an order status to its pill modifier class. */
function statusClass(status) {
  return "status-pill--" + String(status).toLowerCase();
}

/* Build one order-group row. Per-stall fan-out is shown inline below the headline,
   honestly reflecting that one cart placed two orders. */
function orderRowHTML(group) {
  // Use the "primary" status (the most severe) for the headline pill.
  // Cancelled > preparing > confirmed > collected. Adjust to your business rules later.
  const allStatuses = group.orders.map((o) => o.status);
  const headlineStatus =
    allStatuses.includes("cancelled") ? "cancelled" :
    allStatuses.includes("preparing") ? "preparing" :
    allStatuses.includes("confirmed") ? "confirmed" : "collected";

  // Per-stall list
  const stallLines = group.orders.map((o) => `
    <li class="order-row__stall">
      <span class="order-row__stall-name">${esc(o.stallName)}</span>
      <span class="order-row__stall-meta">${o.itemCount} item${o.itemCount === 1 ? "" : "s"} · ${fmtPrice(o.subtotal)}</span>
      <span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span>
    </li>`).join("");

  return `
    <article class="order-row" data-order-group-id="${group.orderGroupId}">
      <div class="order-row__head">
        <div>
          <p class="order-row__date">${fmtDateTime(group.placedAt)}</p>
          <p class="order-row__id">Order #${group.orderGroupId}</p>
        </div>
        <div class="order-row__totals">
          <span class="status-pill status-pill--lg ${statusClass(headlineStatus)}">${esc(headlineStatus)}</span>
          <span class="order-row__total">${fmtPrice(group.total)}</span>
        </div>
      </div>
      <ul class="order-row__stalls">${stallLines}</ul>
    </article>`;
}

function renderOrders(list) {
  const container = document.getElementById("orders-list");
  const meta = document.getElementById("orders-meta");
  const foot = document.getElementById("orders-foot");

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p class="empty__title">No orders yet.</p>
        <p class="empty__sub">Once you place an order, it'll show up here.</p>
        <a class="empty__btn" href="/customer/browse-all-stalls.html">Browse hawker centres</a>
      </div>`;
    foot.classList.add("is-hidden");
    return;
  }

  container.innerHTML = list.map(orderRowHTML).join("");
  meta.textContent = `Showing your last ${list.length} order${list.length === 1 ? "" : "s"}`;
  foot.classList.remove("is-hidden");
}

/* ----- bootstrap ----- */

async function loadPage() {
  try {
    // --- TEMPORARY: mock data ---
    profile = MOCK_PROFILE;
    orders = MOCK_ORDERS;

    // --- REAL (enable once endpoints exist; both require JWT) ---
    // const headers = { "Authorization": `Bearer ${getToken()}` };
    // const [profRes, ordRes] = await Promise.all([
    //   fetch("/api/customers/me", { headers }),
    //   fetch("/api/customers/me/orders?limit=10", { headers }),
    // ]);
    // if (profRes.status === 401 || ordRes.status === 401) {
    //   window.location.href = "/login.html?next=/customer/account.html";
    //   return;
    // }
    // if (!profRes.ok || !ordRes.ok) throw new Error("Could not load account");
    // profile = (await profRes.json()).data;
    // orders  = (await ordRes.json()).data;

    renderProfile(profile);
    renderOrders(orders);
  } catch (err) {
    showFeedback("Could not load your account. Please try again shortly.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Tab switching (delegated on the nav)
  document.querySelector(".settings-nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".settings-nav__item");
    if (btn) switchTab(btn.dataset.tab);
  });

  // Forms + actions
  document.getElementById("profile-form").addEventListener("submit", saveProfile);
  document.getElementById("change-password").addEventListener("click", changePassword);
  document.getElementById("delete-account").addEventListener("click", deleteAccount);

  // Surface "?order=success" from the cart redirect once, then clear it from the URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("order") === "success") {
    showFeedback("Order placed. You'll find it in your order history.", "success");
    switchTab("orders");
    // Clean the URL so refresh doesn't re-show the banner
    window.history.replaceState({}, "", "/customer/account.html");
  }

  loadPage();
});