/* =============================================================================
   stalls.js — drives customer/centre.html (one centre's stall list).
   Depends on debounce() and showFeedback() from main.js (loaded first).

   FLOW:
     1) Read ?id=<centreId> from the URL.
     2) Fetch the centre header + its stalls in parallel.
     3) Render the header, fill the grid, wire search/cuisine/grade filters.

   BACK-END CONTRACT (covered fully in the back-end blueprint below):
     GET /api/hawker-centres/:id          → { success, data: { centreId, name, address, numCookedFoodStalls, status } }
     GET /api/hawker-centres/:id/stalls   → { success, count, data: [ {stallId, name, stallNo, cuisines:[], grade, rating}, ... ] }
============================================================================= */

/* ---- TEMPORARY mock data — swap for real fetch() once endpoints land ---- */
const MOCK_CENTRE = {
  centreId: 5, name: "Tiong Bahru Market",
  address: "30 Seng Poh Road, S168898",
  numCookedFoodStalls: 83, status: "Existing",
};
const MOCK_STALLS = [
  { stallId: 1, name: "Ah Hock Chicken Rice",   stallNo: "#02-23", cuisines: ["Chinese"],         grade: "A", rating: 4.6 },
  { stallId: 2, name: "Loo's Hainanese Curry",  stallNo: "#02-58", cuisines: ["Chinese"],         grade: "A", rating: 4.8 },
  { stallId: 3, name: "Jian Bo Shui Kueh",      stallNo: "#02-05", cuisines: ["Chinese"],         grade: "A", rating: 4.5 },
  { stallId: 4, name: "Tiong Bahru Pau",        stallNo: "#02-18", cuisines: ["Chinese"],         grade: "B", rating: 4.3 },
  { stallId: 5, name: "Selera Rasa Nasi Lemak", stallNo: "#02-30", cuisines: ["Malay", "Halal"],  grade: "A", rating: 4.7 },
  { stallId: 6, name: "Hong Heng Fried Sotong", stallNo: "#02-01", cuisines: ["Chinese"],         grade: "B", rating: 4.4 },
  { stallId: 7, name: "Roti Prata House",       stallNo: "#02-44", cuisines: ["Indian", "Halal"], grade: "A", rating: 4.2 },
  { stallId: 8, name: "Western Grill Co.",      stallNo: "#02-12", cuisines: ["Western"],         grade: "C", rating: 3.9 },
];

let allStalls = [];   // populated by loadPage()
let centre = null;    // populated by loadPage()

/* Escape text before injecting into HTML — defence in depth even for trusted API data. */
function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

/* Read ?id= from the page URL. Returns null if absent or non-numeric. */
function getCentreIdFromUrl() {
  const raw = new URLSearchParams(window.location.search).get("id");
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/* Map grade letter to its modifier class (A/B/C/D → grade-pill--a/b/c/d). */
function gradeClass(grade) {
  return "grade-pill--" + String(grade).toLowerCase();
}

/* Render the centre header (signboard) into the page. */
function renderCentreHeader(c) {
  document.title = `${c.name} — Hawker Hub`;
  document.getElementById("crumb-current").textContent = c.name;
  document.getElementById("centre-name").textContent = c.name;

  // Compose the metadata row with dot separators between segments.
  const stalls = Number(c.numCookedFoodStalls) || 0;
  const segments = [
    esc(c.address),
    `${stalls} cooked food stall${stalls === 1 ? "" : "s"}`,
    c.status === "Existing" ? "NEA-managed" : esc(c.status),
  ];
  document.getElementById("centre-meta").innerHTML =
    segments.map((s) => `<span>${s}</span>`).join(`<span class="dot" aria-hidden="true">·</span>`);
}

/* Build the HTML for one stall card. The grade pill is the hero element. */
function stallCardHTML(s) {
  const cuisines = s.cuisines
    .map((c) => `<span class="cuisine-chip">${esc(c)}</span>`)
    .join("");

  return `
    <article class="stall-card">
      <div class="stall-card__head">
        <span class="grade-pill ${gradeClass(s.grade)}" title="NEA hygiene grade ${esc(s.grade)}">
          <span class="grade-pill__letter">${esc(s.grade)}</span>
          <span class="grade-pill__label">Grade</span>
        </span>
        <span class="stall-card__rating" aria-label="Rating ${Number(s.rating).toFixed(1)} out of 5">
          ★ ${Number(s.rating).toFixed(1)}
        </span>
      </div>
      <h3 class="stall-card__name">${esc(s.name)}</h3>
      <p class="stall-card__meta">${esc(s.stallNo)}</p>
      <div class="stall-card__chips">${cuisines}</div>
      <a class="stall-card__cta"
         href="/customer/stall.html?id=${encodeURIComponent(s.stallId)}">View menu →</a>
    </article>`;
}

/* Render a list of stalls; toggle empty state and update the result line. */
function renderStalls(list) {
  document.getElementById("stall-grid").innerHTML = list.map(stallCardHTML).join("");
  document.getElementById("empty-state").classList.toggle("is-hidden", list.length !== 0);
  document.getElementById("stall-count").innerHTML =
    `Showing <b>${list.length}</b> of <b>${allStalls.length}</b> stalls`;
}

/* Read all three filters and re-render whatever matches. */
function applyFilters() {
  const q       = (document.getElementById("stall-search").value || "").trim().toLowerCase();
  const cuisine = document.getElementById("cuisine-filter").value;
  const grade   = document.getElementById("grade-filter").value;

  const filtered = allStalls.filter((s) => {
    const matchesText    = !q || s.name.toLowerCase().includes(q)
                              || s.cuisines.some((c) => c.toLowerCase().includes(q));
    const matchesCuisine = !cuisine || s.cuisines.includes(cuisine);
    const matchesGrade   = !grade   || s.grade === grade;
    return matchesText && matchesCuisine && matchesGrade;
  });
  renderStalls(filtered);
}

/* Reset every filter and re-render. Used by the empty-state button. */
function resetFilters() {
  document.getElementById("stall-search").value  = "";
  document.getElementById("cuisine-filter").value = "";
  document.getElementById("grade-filter").value   = "";
  applyFilters();
}

/* Single entry point: fetch centre + stalls in parallel, then render. */
async function loadPage() {
  const id = getCentreIdFromUrl();
  if (id === null) {
    showFeedback("No centre selected. Pick one from the directory.", "error");
    return;
  }

  try {
    // --- TEMPORARY: mock data ---
    centre = MOCK_CENTRE;
    allStalls = MOCK_STALLS;

    // --- REAL (enable once endpoints exist) ---
    // const [centreRes, stallsRes] = await Promise.all([
    //   fetch(`/api/hawker-centres/${id}`),
    //   fetch(`/api/hawker-centres/${id}/stalls`),
    // ]);
    // if (!centreRes.ok) throw new Error("Centre not found");
    // if (!stallsRes.ok) throw new Error("Could not load stalls");
    // centre    = (await centreRes.json()).data;
    // allStalls = (await stallsRes.json()).data;

    renderCentreHeader(centre);
    applyFilters();
  } catch (err) {
    showFeedback("Could not load this centre. Please try again shortly.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Debounce search; selects fire once per change so they don't need it.
  const search  = document.getElementById("stall-search");
  const cuisine = document.getElementById("cuisine-filter");
  const grade   = document.getElementById("grade-filter");
  const reset   = document.getElementById("empty-reset");

  if (search)  search.addEventListener("input", debounce(applyFilters, 150));
  if (cuisine) cuisine.addEventListener("change", applyFilters);
  if (grade)   grade.addEventListener("change", applyFilters);
  if (reset)   reset.addEventListener("click", resetFilters);

  loadPage();
});