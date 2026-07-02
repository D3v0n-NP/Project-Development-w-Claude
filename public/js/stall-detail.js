/* =============================================================================
   stall-detail.js — drives customer/stall.html (one stall: header + menu + cart).
   Depends on debounce() and showFeedback() from main.js (loaded first).

   FLOW:
     1) Read ?id=<stallId> from the URL.
     2) Fetch the stall header + its menu items in parallel.
     3) Render header, build category tabs from the data, wire search.
     4) Add-to-cart writes to localStorage (guest cart). Sticky cart bar
        reflects current totals and links to /customer/cart.html.

   BACK-END CONTRACT (mapped fully in the back-end blueprint message):
     GET /api/stalls/:id              → { success, data: { stallId, name, stallNo, cuisines:[], grade, rating, centreId, centreName } }
     GET /api/stalls/:id/menu-items   → { success, count, data: [ {itemId, name, description, price, category, photoUrl, available}, ... ] }
============================================================================= */

/* ---------- TEMPORARY mock data — swap for real fetch() once endpoints exist ---------- */
const MOCK_STALL = {
  stallId: 2,
  name: "Loo's Hainanese Curry Rice",
  stallNo: "#02-58",
  cuisines: ["Chinese"],
  grade: "A",
  rating: 4.8,
  centreId: 5,
  centreName: "Tiong Bahru Market",
};
const MOCK_MENU = [
  { itemId: 1,  name: "Curry Rice Set",          description: "Pork chop, cabbage, egg, curry gravy.", price: 5.50, category: "Mains",    photoUrl: null, available: true },
  { itemId: 2,  name: "Hainanese Chicken Rice",  description: "Steamed chicken on fragrant rice.",     price: 5.00, category: "Mains",    photoUrl: null, available: true },
  { itemId: 3,  name: "Char Siew Rice",          description: "Honey-roast pork on rice.",             price: 5.50, category: "Mains",    photoUrl: null, available: true },
  { itemId: 4,  name: "Curry Pork Chop",         description: "Crispy pork chop, curry gravy.",        price: 4.00, category: "Mains",    photoUrl: null, available: false },
  { itemId: 5,  name: "Braised Cabbage",         description: "Slow-braised in chicken stock.",        price: 1.50, category: "Sides",    photoUrl: null, available: true },
  { itemId: 6,  name: "Fried Egg",               description: "Sunny side up.",                        price: 1.00, category: "Sides",    photoUrl: null, available: true },
  { itemId: 7,  name: "Achar",                   description: "House-pickled vegetables.",             price: 1.20, category: "Sides",    photoUrl: null, available: true },
  { itemId: 8,  name: "Kopi",                    description: "Strong local coffee with condensed milk.", price: 1.40, category: "Drinks", photoUrl: null, available: true },
  { itemId: 9,  name: "Teh O Ice",               description: "Iced black tea with sugar.",            price: 1.60, category: "Drinks",   photoUrl: null, available: true },
];

const CART_STORAGE_KEY = "hawkerHub.cart";  // localStorage key — used everywhere we touch the cart

let stall = null;          // populated by loadPage()
let allItems = [];         // populated by loadPage()
let activeCategory = "All"; // current tab; "All" shows everything

/* ----- shared helpers ----- */

/* Escape text before injecting into HTML — defence in depth for API data. */
function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

/* Read ?id= from the URL. Returns null if absent/invalid. */
function getStallIdFromUrl() {
  const raw = new URLSearchParams(window.location.search).get("id");
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* Format a number as a Singapore-dollar price string. */
function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}

/* Grade letter → modifier class (A → grade-pill--a, etc.). */
function gradeClass(grade) {
  return "grade-pill--" + String(grade).toLowerCase();
}

/* ----- header + tabs ----- */

/* Render the stall header (grade pill + name + meta strip). */
function renderStallHeader(s) {
  document.title = `${s.name} — Hawker Hub`;
  document.getElementById("crumb-stall").textContent = s.name;

  const centreLink = document.getElementById("crumb-centre");
  centreLink.textContent = s.centreName;
  centreLink.href = `/customer/centre.html?id=${encodeURIComponent(s.centreId)}`;

  // Big grade pill in the header. Uses the same .grade-pill component as the stall cards
  // but the .grade-pill--lg modifier upsizes it for the header context.
  document.getElementById("stall-grade").innerHTML = `
    <span class="grade-pill grade-pill--lg ${gradeClass(s.grade)}" title="NEA hygiene grade ${esc(s.grade)}">
      <span class="grade-pill__letter">${esc(s.grade)}</span>
      <span class="grade-pill__label">Grade</span>
    </span>`;

  document.getElementById("stall-name").textContent = s.name;

  // Metadata strip: unit no in mono · cuisines as chips · rating.
  const cuisines = s.cuisines.map((c) => `<span class="cuisine-chip">${esc(c)}</span>`).join("");
  const segments = [
    `<span class="stall-header__unit">${esc(s.stallNo)}</span>`,
    `<span class="stall-header__chips">${cuisines}</span>`,
    `<span class="stall-header__rating" aria-label="Rating ${s.rating} out of 5">★ ${Number(s.rating).toFixed(1)}</span>`,
  ];
  document.getElementById("stall-meta").innerHTML =
    segments.join(`<span class="dot" aria-hidden="true">·</span>`);
}

/* Build category tabs from the data. We only render a tab if at least one item
   sits in that category — avoids dead tabs like "Desserts" when there are none. */
function renderCategoryTabs(items) {
  const cats = ["All", ...new Set(items.map((i) => i.category))];
  document.getElementById("cat-tabs").innerHTML = cats
    .map((c) => `
      <button class="cat-tab ${c === activeCategory ? "is-active" : ""}"
              type="button" data-cat="${esc(c)}">${esc(c)}</button>`)
    .join("");
}

/* ----- menu grid ----- */

/* Build the HTML for one menu-item card. Price is the hero figure. */
function menuItemCardHTML(item) {
  // Photo slot — falls back to a styled placeholder with the item's initial if no URL.
  const photo = item.photoUrl
    ? `<img class="menu-item__img" src="${esc(item.photoUrl)}" alt="${esc(item.name)}" loading="lazy" />`
    : `<div class="menu-item__img menu-item__img--placeholder" aria-hidden="true">
         <span>${esc(item.name[0])}</span>
       </div>`;

  // Soft-disable unavailable items so they're still visible but can't be added.
  const unavailable = !item.available;
  const action = unavailable
    ? `<button class="btn-add" type="button" disabled>Sold out</button>`
    : `<div class="qty-stepper" data-item-id="${item.itemId}">
         <button class="qty-stepper__btn" type="button" data-action="dec" aria-label="Decrease quantity">−</button>
         <span class="qty-stepper__value" data-qty>1</span>
         <button class="qty-stepper__btn" type="button" data-action="inc" aria-label="Increase quantity">+</button>
       </div>
       <button class="btn-add" type="button" data-add="${item.itemId}">Add</button>`;

  return `
    <article class="menu-item ${unavailable ? "menu-item--soldout" : ""}" data-category="${esc(item.category)}">
      ${photo}
      <div class="menu-item__body">
        <p class="menu-item__cat">${esc(item.category)}</p>
        <h3 class="menu-item__name">${esc(item.name)}</h3>
        <p class="menu-item__desc">${esc(item.description)}</p>
        <div class="menu-item__foot">
          <span class="menu-item__price">${fmtPrice(item.price)}</span>
          <div class="menu-item__actions">${action}</div>
        </div>
      </div>
    </article>`;
}

/* Filter by active category + search, then render. */
function applyFilters() {
  const q = (document.getElementById("menu-search").value || "").trim().toLowerCase();

  const filtered = allItems.filter((item) => {
    const matchesCat  = activeCategory === "All" || item.category === activeCategory;
    const matchesText = !q
      || item.name.toLowerCase().includes(q)
      || item.description.toLowerCase().includes(q);
    return matchesCat && matchesText;
  });

  document.getElementById("menu-grid").innerHTML = filtered.map(menuItemCardHTML).join("");
  document.getElementById("empty-state").classList.toggle("is-hidden", filtered.length !== 0);
  document.getElementById("menu-count").innerHTML =
    `Showing <b>${filtered.length}</b> of <b>${allItems.length}</b> items`;
}

/* ----- cart (localStorage, guest-friendly) ----- */

/* Cart shape in storage: { items: [ {itemId, stallId, name, price, qty}, ... ] }.
   Stored as one record so we can later POST the whole thing to /api/orders. */
function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    // Corrupt JSON — reset rather than crash. Real apps would log this.
    return { items: [] };
  }
}

function writeCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  renderCartBar();
}

/* Add an item to the cart (or increment its quantity if it's already there). */
function addToCart(itemId, qty) {
  const item = allItems.find((i) => i.itemId === itemId);
  if (!item || !item.available) return;

  const cart = readCart();
  const existing = cart.items.find((c) => c.itemId === itemId && c.stallId === stall.stallId);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.items.push({
      itemId: item.itemId,
      stallId: stall.stallId,
      stallName: stall.name,
      name: item.name,
      price: item.price,
      qty,
    });
  }
  writeCart(cart);
  showFeedback(`${item.name} added to cart.`, "success");
}

/* Update the sticky cart bar to reflect the current cart totals. */
function renderCartBar() {
  const cart = readCart();
  const bar = document.getElementById("cart-bar");

  if (cart.items.length === 0) {
    bar.classList.add("is-hidden");
    return;
  }

  const count = cart.items.reduce((sum, i) => sum + i.qty, 0);
  const total = cart.items.reduce((sum, i) => sum + i.qty * i.price, 0);

  document.getElementById("cart-bar-count").textContent = `${count} item${count === 1 ? "" : "s"}`;
  document.getElementById("cart-bar-total").textContent = fmtPrice(total);
  bar.classList.remove("is-hidden");
}

/* ----- event wiring ----- */

/* Delegated click on the grid: handles the stepper +/− and the Add button. */
function onGridClick(event) {
  const stepBtn = event.target.closest(".qty-stepper__btn");
  const addBtn = event.target.closest("[data-add]");

  if (stepBtn) {
    const stepper = stepBtn.closest(".qty-stepper");
    const valueEl = stepper.querySelector("[data-qty]");
    const current = Number(valueEl.textContent) || 1;
    const next = stepBtn.dataset.action === "inc"
      ? Math.min(current + 1, 99)
      : Math.max(current - 1, 1);
    valueEl.textContent = String(next);
    return;
  }

  if (addBtn) {
    const itemId = Number(addBtn.dataset.add);
    const stepper = addBtn.parentElement.querySelector(".qty-stepper");
    const qty = Number(stepper.querySelector("[data-qty]").textContent) || 1;
    addToCart(itemId, qty);
    // Reset the stepper after adding, so a customer can pick a fresh qty next time.
    stepper.querySelector("[data-qty]").textContent = "1";
  }
}

/* Delegated click on the tabs row: switches the active category. */
function onTabsClick(event) {
  const tab = event.target.closest(".cat-tab");
  if (!tab) return;
  activeCategory = tab.dataset.cat;
  document.querySelectorAll(".cat-tab").forEach((t) =>
    t.classList.toggle("is-active", t === tab)
  );
  applyFilters();
}

function resetSearch() {
  document.getElementById("menu-search").value = "";
  applyFilters();
}

/* Single entry point: fetch stall + menu in parallel, then render. */
async function loadPage() {
  const id = getStallIdFromUrl();
  if (id === null) {
    showFeedback("No stall selected. Pick one from a hawker centre.", "error");
    return;
  }

  try {
    // --- TEMPORARY: mock data ---
    stall = MOCK_STALL;
    allItems = MOCK_MENU;

    // --- REAL (enable once endpoints exist) ---
    // const [stallRes, menuRes] = await Promise.all([
    //   fetch(`/api/stalls/${id}`),
    //   fetch(`/api/stalls/${id}/menu-items`),
    // ]);
    // if (!stallRes.ok) throw new Error("Stall not found");
    // if (!menuRes.ok)  throw new Error("Could not load menu");
    // stall    = (await stallRes.json()).data;
    // allItems = (await menuRes.json()).data;

    renderStallHeader(stall);
    renderCategoryTabs(allItems);
    applyFilters();
    renderCartBar();
  } catch (err) {
    showFeedback("Could not load this stall. Please try again shortly.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("menu-search");
  const reset = document.getElementById("empty-reset");
  const grid = document.getElementById("menu-grid");
  const tabs = document.getElementById("cat-tabs");

  if (search) search.addEventListener("input", debounce(applyFilters, 150));
  if (reset)  reset.addEventListener("click", resetSearch);
  if (grid)   grid.addEventListener("click", onGridClick);    // delegation
  if (tabs)   tabs.addEventListener("click", onTabsClick);    // delegation

  loadPage();
});