/* =============================================================================
   centres.js — renders the hawker-centre DIRECTORY for browse-all-stalls.html.
   Reuses showFeedback() from main.js (loaded first).

   HIERARCHY: this page lists centres → "View stalls" drills into
   centre.html?id=<centreId> (the stall list for one centre) → each stall opens
   stall.html?id=<stallId> (menu + add to cart).

   BACK-END: replace MOCK_CENTRES / loadCentres() with a real call to
   GET /api/hawker-centres (public, no JWT). That endpoint returns:
     { success: true, count: <n>, data: [ {centreId, name, address,
       numCookedFoodStalls, status, photoUrl}, ... ] }
   The mock below mirrors that "data" item shape exactly.
============================================================================= */

// --- TEMPORARY sample data until the API exists. Real NEA centres (data.gov.sg). ---
// Stall counts for several of these are the actual values from NEA's GeoJSON.
const MOCK_CENTRES = [
  { centreId: 1,  name: "Chinatown Complex Market & Food Centre", address: "335 Smith Street, S050335",        numCookedFoodStalls: 260, status: "Existing" },
  { centreId: 2,  name: "Maxwell Food Centre",                    address: "1 Kadayanallur Street, S069184",     numCookedFoodStalls: 100, status: "Existing" },
  { centreId: 3,  name: "Golden Mile Food Centre",                address: "505 Beach Road, S199583",            numCookedFoodStalls: 112, status: "Existing" },
  { centreId: 4,  name: "Old Airport Road Food Centre",           address: "51 Old Airport Road, S390051",       numCookedFoodStalls: 150, status: "Existing" },
  { centreId: 5,  name: "Tiong Bahru Market",                     address: "30 Seng Poh Road, S168898",          numCookedFoodStalls: 83,  status: "Existing" },
  { centreId: 6,  name: "Newton Food Centre",                     address: "500 Clemenceau Avenue North, S229495", numCookedFoodStalls: 83, status: "Existing" },
  { centreId: 7,  name: "Tekka Centre",                           address: "665 Buffalo Road, S210665",          numCookedFoodStalls: 80,  status: "Existing" },
  { centreId: 8,  name: "Commonwealth Crescent Market",           address: "31 Commonwealth Crescent, S149644",  numCookedFoodStalls: 39,  status: "Existing" },
  { centreId: 9,  name: "Adam Road Food Centre",                  address: "2 Adam Road, S289876",               numCookedFoodStalls: 32,  status: "Existing" },
  { centreId: 10, name: "Dunman Food Centre",                     address: "271 Onan Road, S424768",             numCookedFoodStalls: 30,  status: "Existing" },
  { centreId: 11, name: "Beo Crescent Market",                    address: "38A Beo Crescent, S169982",          numCookedFoodStalls: 32,  status: "Existing" },
  { centreId: 12, name: "Yew Tee Hawker Centre",                  address: "628 Yew Tee Close, S680628",         numCookedFoodStalls: 40,  status: "Under Construction" },
];

let allCentres = []; // populated by loadCentres()

/* Escape text before putting it in HTML — good practice for any API data. */
function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

/* Build the HTML for one hawker-centre card. */
function centreCardHTML(c) {
  const stalls = Number(c.numCookedFoodStalls) || 0;
  const isOpen = c.status === "Existing";

  // A "View stalls" CTA only makes sense for an operational centre;
  // an under-construction one has no stalls yet, so we show a note instead.
  const action = isOpen
    ? `<a class="btn btn--outline btn--sm centre-card__cta"
          href="/customer/centre.html?id=${encodeURIComponent(c.centreId)}">View stalls</a>`
    : `<p class="centre-soon">Opening soon</p>`;

  const badge = isOpen ? "" : `<span class="centre-badge">Under construction</span>`;

  return `
    <article class="centre-card">
      ${badge}
      <h3 class="centre-card__name">${esc(c.name)}</h3>
      <p class="centre-card__meta">${esc(c.address)}</p>
      <p class="centre-card__stat">${stalls} <span>cooked food stall${stalls === 1 ? "" : "s"}</span></p>
      ${action}
    </article>`;
}

/* Render a list of centres into the grid (and toggle the empty state + count). */
function renderCentres(list) {
  document.getElementById("centre-grid").innerHTML = list.map(centreCardHTML).join("");
  document.getElementById("empty-state").classList.toggle("is-hidden", list.length !== 0);
  document.getElementById("centre-count").textContent =
    `${list.length} hawker centre${list.length === 1 ? "" : "s"}`;
}

/* Read the search + sort controls and render whatever matches. */
function applyFilters() {
  const q = (document.getElementById("centre-search").value || "").trim().toLowerCase();
  const sortBy = document.getElementById("centre-sort").value;

  // 1) filter by centre name
  let list = allCentres.filter((c) => !q || c.name.toLowerCase().includes(q));

  // 2) sort a COPY (slice) so we never mutate the original allCentres array
  list = list.slice().sort((a, b) => {
    if (sortBy === "stalls") {
      // most stalls first (descending)
      return (Number(b.numCookedFoodStalls) || 0) - (Number(a.numCookedFoodStalls) || 0);
    }
    return a.name.localeCompare(b.name); // default: name A–Z
  });

  renderCentres(list);
}

/* Load the centres, then do the first render. */
async function loadCentres() {
  try {
    // --- TEMPORARY: mock data ---
    allCentres = MOCK_CENTRES;

    // --- REAL (enable once GET /api/hawker-centres is built) ---
    // const res = await fetch("/api/hawker-centres");
    // if (!res.ok) throw new Error("Failed to load hawker centres");
    // const payload = await res.json();   // { success, count, data: [...] }
    // allCentres = payload.data;

    applyFilters();
  } catch (err) {
    showFeedback("Could not load hawker centres. Please try again shortly.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("centre-search");
  const sort = document.getElementById("centre-sort");
  if (search) search.addEventListener("input", debounce(applyFilters));  // live search
  if (sort) sort.addEventListener("change", applyFilters);     // re-sort on change
  loadCentres();
});