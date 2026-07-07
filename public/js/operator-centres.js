/* =============================================================================
   operator-centres.js — drives operator/centres.html (Centres CRUD).

   BACK-END CONTRACT (see Hawker Centre Records Management, T5SA2-20)
   --------------------------------------------------------------------------
   GET    /api/hawker-centres        — public, list. Same endpoint the customer
                                        side (centres.js) already documents —
                                        do not fork into a second path.
   GET    /api/hawker-centres/:id    — public, single centre detail.
   POST   /api/hawker-centres        — operator-only (JWT + role check).
   PUT    /api/hawker-centres/:id    — operator-only.
   DELETE /api/hawker-centres/:id    — operator-only. Soft delete only
                                        (sets is_active = 0) — never a hard
                                        DELETE, since Stalls/Orders/Inspections
                                        reference centreId by foreign key.

   Request/response body shape (POST/PUT request, and each item in GET list):
     { centreId, name, address, numCookedFoodStalls, status, photoUrl }
   photoUrl is optional/nullable — this form doesn't collect it yet, so send
   it as null on create; a future NEA sync (T5SA2-21) or upload feature can
   populate it later without a schema change.

   Enhancements: status filter dropdown, wider Edit/Delete gap.
============================================================================= */
let MOCK_CENTRES = [
  {
    centreId: 1,
    name: "Maxwell Food Centre",
    address: "1 Kadayanallur Street, S069184",
    numCookedFoodStalls: 100,
    status: "Existing",
  },
  {
    centreId: 2,
    name: "Tiong Bahru Market",
    address: "30 Seng Poh Road, S168898",
    numCookedFoodStalls: 83,
    status: "Existing",
  },
  {
    centreId: 3,
    name: "Chinatown Complex",
    address: "335 Smith Street, S050335",
    numCookedFoodStalls: 260,
    status: "Existing",
  },
  {
    centreId: 4,
    name: "Yew Tee Hawker Centre",
    address: "628 Yew Tee Close, S680628",
    numCookedFoodStalls: 40,
    status: "Under Construction",
  },
];

let allCentres = [];
let isEditing = false;

function esc(v) {
  const d = document.createElement("div");
  d.textContent = String(v);
  return d.innerHTML;
}

/* ----- render ----- */
function renderCentres(list) {
  const tbody = document.getElementById("centres-tbody");
  document.getElementById("centres-count").textContent =
    `${list.length} centre${list.length === 1 ? "" : "s"}`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--color-ink-muted)">No centres match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((c) => {
      const pill =
        c.status === "Existing"
          ? `<span class="status-pill status-pill--ready">Operational</span>`
          : c.status === "Closed"
            ? `<span class="status-pill status-pill--cancelled">Closed</span>`
            : `<span class="status-pill status-pill--confirmed">Under Construction</span>`;
      return `
      <tr>
        <td style="font-weight:600">${esc(c.name)}</td>
        <td style="color:var(--color-ink-muted)">${esc(c.address)}</td>
        <td style="font-family:var(--font-mono)">${c.numCookedFoodStalls}</td>
        <td>${pill}</td>
        <td>
          <span class="action-gap">
            <button class="link-btn" data-action="edit" data-id="${c.centreId}">Edit</button>
            <button class="link-btn" data-action="delete" data-id="${c.centreId}" style="color:var(--color-error)">Delete</button>
          </span>
        </td>
      </tr>`;
    })
    .join("");
}

/* ----- filters ----- */
function applyFilters() {
  const q = (document.getElementById("centre-search").value || "")
    .trim()
    .toLowerCase();
  const status = document.getElementById("status-filter").value;

  const filtered = allCentres.filter((c) => {
    const matchesText =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q);
    const matchesStatus = !status || c.status === status;
    return matchesText && matchesStatus;
  });
  renderCentres(filtered);
}

/* ----- form ----- */
function showForm() {
  document.getElementById("centre-form-card").classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function hideForm() {
  document.getElementById("centre-form-card").classList.add("is-hidden");
  resetForm();
}
function resetForm() {
  const form = document.getElementById("centre-form");
  form.reset();
  form.elements.centreId.value = "";
  isEditing = false;
  document.getElementById("centre-form-title").textContent = "Add New Centre";
  document.getElementById("save-centre-btn").textContent = "Save Centre";
  Array.from(form.elements).forEach((el) => {
    if (el.closest) {
      const w = el.closest(".field");
      if (w) w.classList.remove("is-invalid");
      el.setAttribute("aria-invalid", "false");
    }
  });
}

function validateForm(form) {
  const errors = {};
  if (!form.elements.name.value.trim()) errors.name = true;
  if (!form.elements.address.value.trim()) errors.address = true;
  if (
    isNaN(Number(form.elements.numStalls.value)) ||
    Number(form.elements.numStalls.value) < 0
  )
    errors.numStalls = true;
  for (const key of ["name", "address", "numStalls"]) {
    const el = form.elements[key];
    const w = el.closest(".field");
    const bad = Boolean(errors[key]);
    w.classList.toggle("is-invalid", bad);
    el.setAttribute("aria-invalid", bad ? "true" : "false");
  }
  return Object.keys(errors).length === 0;
}

async function handleSave(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById("save-centre-btn");
  if (!validateForm(form)) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }

  const centreId = form.elements.centreId.value;
  const payload = {
    name: form.elements.name.value.trim(),
    address: form.elements.address.value.trim(),
    numCookedFoodStalls: Number(form.elements.numStalls.value),
    status: form.elements.status.value,
  };

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await new Promise((r) => setTimeout(r, 400));
    if (isEditing && centreId) {
      const idx = allCentres.findIndex((c) => c.centreId === Number(centreId));
      if (idx > -1)
        allCentres[idx] = { centreId: Number(centreId), ...payload };
      showFeedback("Centre updated.", "success");
    } else {
      allCentres.push({ centreId: Date.now(), ...payload });
      showFeedback("Centre added.", "success");
    }
    hideForm();
    applyFilters();
  } catch (err) {
    showFeedback("Failed to save centre. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? "Update Centre" : "Save Centre";
  }
}

function editCentre(centreId) {
  const c = allCentres.find((c) => c.centreId === centreId);
  if (!c) return;
  isEditing = true;
  document.getElementById("centre-form-title").textContent = "Edit Centre";
  document.getElementById("save-centre-btn").textContent = "Update Centre";
  const form = document.getElementById("centre-form");
  form.elements.centreId.value = c.centreId;
  form.elements.name.value = c.name;
  form.elements.address.value = c.address;
  form.elements.numStalls.value = c.numCookedFoodStalls;
  form.elements.status.value = c.status;
  showForm();
}

async function deleteCentre(centreId) {
  if (!confirm("Delete this centre? This cannot be undone.")) return;
  try {
    await new Promise((r) => setTimeout(r, 300));
    allCentres = allCentres.filter((c) => c.centreId !== centreId);
    showFeedback("Centre deleted.", "success");
    applyFilters();
  } catch (err) {
    showFeedback("Failed to delete centre.", "error");
  }
}

function onTableClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "edit") editCentre(id);
  if (btn.dataset.action === "delete") deleteCentre(id);
}

async function loadPage() {
  try {
    allCentres = [...MOCK_CENTRES];
    renderCentres(allCentres);
  } catch (err) {
    showFeedback("Could not load centres. Please try again.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPage();
  document.getElementById("add-centre-btn").addEventListener("click", () => {
    resetForm();
    showForm();
  });
  document
    .getElementById("cancel-centre-btn")
    .addEventListener("click", hideForm);
  document.getElementById("centre-form").addEventListener("submit", handleSave);
  document
    .getElementById("centres-tbody")
    .addEventListener("click", onTableClick);
  document
    .getElementById("centre-search")
    .addEventListener("input", debounce(applyFilters, 150));
  document
    .getElementById("status-filter")
    .addEventListener("change", applyFilters);
});
