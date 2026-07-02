/* =============================================================================
   operator-stalls.js — drives operator/stalls.html (Stalls list + Rental CRUD).
   Depends on showFeedback() from main.js (loaded first).
   BACK-END CONTRACT:
     GET    /api/operator/stalls              → list all stalls
     GET    /api/operator/rentals             → list all rental agreements
     POST   /api/operator/rentals             → create a rental agreement
     PUT    /api/operator/rentals/:id         → update a rental agreement
     DELETE /api/operator/rentals/:id         → delete a rental agreement
============================================================================= */

const MOCK_CENTRES = [
  { centreId: 1, name: "Maxwell Food Centre" },
  { centreId: 2, name: "Tiong Bahru Market" },
  { centreId: 3, name: "Chinatown Complex" },
];

const MOCK_VENDORS = [
  { vendorId: 1, name: "Tan Wei Ming" },
  { vendorId: 2, name: "Siti Rahimah" },
  { vendorId: 3, name: "Loo Kah Fatt" },
  { vendorId: 4, name: "Kumar Selvam" },
  { vendorId: 5, name: "Ng Jian Bo" },
];

const MOCK_STALLS = [
  {
    stallId: 1,
    stallNo: "#02-15",
    name: "Ah Hock Chicken Rice",
    centreName: "Maxwell Food Centre",
    cuisines: ["Chinese"],
    grade: "A",
    vendorName: "Tan Wei Ming",
  },
  {
    stallId: 2,
    stallNo: "#02-30",
    name: "Selera Rasa",
    centreName: "Tiong Bahru Market",
    cuisines: ["Malay", "Halal"],
    grade: "A",
    vendorName: "Siti Rahimah",
  },
  {
    stallId: 3,
    stallNo: "#02-58",
    name: "Loo's Hainanese",
    centreName: "Tiong Bahru Market",
    cuisines: ["Chinese"],
    grade: "A",
    vendorName: "Loo Kah Fatt",
  },
  {
    stallId: 4,
    stallNo: "#02-44",
    name: "Roti Prata House",
    centreName: "Maxwell Food Centre",
    cuisines: ["Indian", "Halal"],
    grade: "B",
    vendorName: "Kumar Selvam",
  },
  {
    stallId: 5,
    stallNo: "#02-05",
    name: "Jian Bo Shui Kueh",
    centreName: "Tiong Bahru Market",
    cuisines: ["Chinese"],
    grade: "A",
    vendorName: "Ng Jian Bo",
  },
];

let MOCK_RENTALS = [
  {
    rentalId: 1001,
    stallNo: "#02-15",
    stallName: "Ah Hock Chicken Rice",
    centreId: 1,
    vendorId: 1,
    vendorName: "Tan Wei Ming",
    startDate: "2025-01-01",
    endDate: "2026-07-15",
    monthlyRent: 1200,
  },
  {
    rentalId: 1002,
    stallNo: "#02-30",
    stallName: "Selera Rasa",
    centreId: 2,
    vendorId: 2,
    vendorName: "Siti Rahimah",
    startDate: "2025-03-01",
    endDate: "2026-07-20",
    monthlyRent: 950,
  },
  {
    rentalId: 1003,
    stallNo: "#02-58",
    stallName: "Loo's Hainanese",
    centreId: 2,
    vendorId: 3,
    vendorName: "Loo Kah Fatt",
    startDate: "2024-06-01",
    endDate: "2026-07-05",
    monthlyRent: 1100,
  },
  {
    rentalId: 1004,
    stallNo: "#02-44",
    stallName: "Roti Prata House",
    centreId: 1,
    vendorId: 4,
    vendorName: "Kumar Selvam",
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    monthlyRent: 800,
  },
];

let allStalls = [];
let allRentals = [];
let isEditing = false;

/* ----- helpers ----- */
function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}

function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso) {
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}

function gradeClass(grade) {
  return "grade-pill--" + String(grade).toLowerCase();
}

function rentalStatusPill(endDate) {
  const days = daysUntil(endDate);
  if (days < 0)
    return `<span class="status-pill status-pill--cancelled">Expired</span>`;
  if (days <= 30)
    return `<span class="status-pill status-pill--preparing">Expiring Soon</span>`;
  return `<span class="status-pill status-pill--ready">Active</span>`;
}

/* ----- populate dropdowns in the rental form ----- */
function populateDropdowns() {
  const centreSelect = document.getElementById("rental-centre");
  const vendorSelect = document.getElementById("rental-vendor");
  const filterSelect = document.getElementById("stall-centre-filter");

  MOCK_CENTRES.forEach((c) => {
    [centreSelect, filterSelect].forEach((sel) => {
      const opt = document.createElement("option");
      opt.value = c.centreId;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
  });

  MOCK_VENDORS.forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v.vendorId;
    opt.textContent = v.name;
    vendorSelect.appendChild(opt);
  });
}

/* ----- stalls tab ----- */
function renderStalls(list) {
  const tbody = document.getElementById("stalls-tbody");
  document.getElementById("stalls-count").textContent =
    `${list.length} stall${list.length === 1 ? "" : "s"}`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-ink-muted)">No stalls found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((s) => {
      const cuisines = s.cuisines
        .map((c) => `<span class="cuisine-chip">${esc(c)}</span>`)
        .join(" ");
      return `
      <tr>
        <td style="font-family:var(--font-mono); font-weight:700">${esc(s.stallNo)}</td>
        <td style="font-weight:600">${esc(s.name)}</td>
        <td>${esc(s.centreName)}</td>
        <td>${cuisines}</td>
        <td>
          <span class="grade-pill ${gradeClass(s.grade)}">
            <span class="grade-pill__letter">${esc(s.grade)}</span>
            <span class="grade-pill__label">Grade</span>
          </span>
        </td>
        <td>${esc(s.vendorName)}</td>
      </tr>`;
    })
    .join("");
}

function applyStallFilters() {
  const q = (document.getElementById("stall-search").value || "")
    .trim()
    .toLowerCase();
  const centreId = document.getElementById("stall-centre-filter").value;
  const filtered = allStalls.filter((s) => {
    const matchesText =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.stallNo.toLowerCase().includes(q);
    const matchesCentre = !centreId || s.centreId === Number(centreId);
    return matchesText && matchesCentre;
  });
  renderStalls(filtered);
}

/* ----- rentals tab ----- */
function renderRentals(list) {
  const tbody = document.getElementById("rentals-tbody");
  document.getElementById("rentals-count").textContent =
    `${list.length} agreement${list.length === 1 ? "" : "s"}`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--color-ink-muted)">No rental agreements found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map(
      (r) => `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:700">#${r.rentalId}</td>
      <td style="font-weight:600">${esc(r.stallName)} <span style="font-family:var(--font-mono); font-size:var(--text-xs); color:var(--color-ink-muted)">${esc(r.stallNo)}</span></td>
      <td>${esc(r.vendorName)}</td>
      <td>${fmtDate(r.startDate)}</td>
      <td>${fmtDate(r.endDate)}</td>
      <td style="font-family:var(--font-mono); font-weight:700">${fmtPrice(r.monthlyRent)}</td>
      <td>${rentalStatusPill(r.endDate)}</td>
      <td>
        <button class="link-btn" data-action="edit" data-id="${r.rentalId}" style="margin-right:var(--space-2)">Edit</button>
        <button class="link-btn" data-action="delete" data-id="${r.rentalId}" style="color:var(--color-error)">Delete</button>
      </td>
    </tr>`,
    )
    .join("");
}

/* ----- rental form ----- */
function showRentalForm() {
  document.getElementById("rental-form-card").classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function hideRentalForm() {
  document.getElementById("rental-form-card").classList.add("is-hidden");
  resetRentalForm();
}

function resetRentalForm() {
  const form = document.getElementById("rental-form");
  form.reset();
  form.elements.rentalId.value = "";
  isEditing = false;
  document.getElementById("rental-form-title").textContent =
    "New Rental Agreement";
  document.getElementById("save-rental-btn").textContent = "Save Agreement";
  Array.from(form.elements).forEach((el) => {
    if (el.closest) {
      const wrap = el.closest(".field");
      if (wrap) wrap.classList.remove("is-invalid");
      el.setAttribute("aria-invalid", "false");
    }
  });
}

function validateRentalForm(form) {
  const errors = {};
  if (!form.elements.stallNo.value.trim()) errors.stallNo = true;
  if (!form.elements.centreId.value) errors.centreId = true;
  if (!form.elements.vendorId.value) errors.vendorId = true;
  if (
    !form.elements.monthlyRent.value ||
    Number(form.elements.monthlyRent.value) <= 0
  )
    errors.monthlyRent = true;
  if (!form.elements.startDate.value) errors.startDate = true;
  if (!form.elements.endDate.value) errors.endDate = true;

  for (const key of [
    "stallNo",
    "centreId",
    "vendorId",
    "monthlyRent",
    "startDate",
    "endDate",
  ]) {
    const el = form.elements[key];
    const wrap = el.closest(".field");
    const bad = Boolean(errors[key]);
    wrap.classList.toggle("is-invalid", bad);
    el.setAttribute("aria-invalid", bad ? "true" : "false");
  }
  return Object.keys(errors).length === 0;
}

async function handleSaveRental(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById("save-rental-btn");

  if (!validateRentalForm(form)) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }

  const rentalId = form.elements.rentalId.value;
  const centreId = Number(form.elements.centreId.value);
  const vendorId = Number(form.elements.vendorId.value);
  const centre = MOCK_CENTRES.find((c) => c.centreId === centreId);
  const vendor = MOCK_VENDORS.find((v) => v.vendorId === vendorId);

  const payload = {
    stallNo: form.elements.stallNo.value.trim(),
    stallName: form.elements.stallNo.value.trim(), // in real API, derived from stall record
    centreId,
    vendorId,
    vendorName: vendor ? vendor.name : "",
    startDate: form.elements.startDate.value,
    endDate: form.elements.endDate.value,
    monthlyRent: Number(form.elements.monthlyRent.value),
  };

  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    await new Promise((r) => setTimeout(r, 400));

    if (isEditing && rentalId) {
      // --- REAL: PUT /api/operator/rentals/:id ---
      const idx = allRentals.findIndex((r) => r.rentalId === Number(rentalId));
      if (idx > -1)
        allRentals[idx] = { rentalId: Number(rentalId), ...payload };
      showFeedback("Rental agreement updated.", "success");
    } else {
      // --- REAL: POST /api/operator/rentals ---
      allRentals.push({ rentalId: Date.now(), ...payload });
      showFeedback("Rental agreement created.", "success");
    }

    hideRentalForm();
    renderRentals(allRentals);
  } catch (err) {
    showFeedback("Failed to save rental agreement.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? "Update Agreement" : "Save Agreement";
  }
}

function editRental(rentalId) {
  const r = allRentals.find((r) => r.rentalId === rentalId);
  if (!r) return;

  isEditing = true;
  document.getElementById("rental-form-title").textContent =
    "Edit Rental Agreement";
  document.getElementById("save-rental-btn").textContent = "Update Agreement";

  const form = document.getElementById("rental-form");
  form.elements.rentalId.value = r.rentalId;
  form.elements.stallNo.value = r.stallNo;
  form.elements.centreId.value = r.centreId;
  form.elements.vendorId.value = r.vendorId;
  form.elements.monthlyRent.value = r.monthlyRent;
  form.elements.startDate.value = r.startDate;
  form.elements.endDate.value = r.endDate;

  showRentalForm();
}

async function deleteRental(rentalId) {
  if (!confirm("Delete this rental agreement? This cannot be undone.")) return;
  try {
    await new Promise((r) => setTimeout(r, 300));
    // --- REAL: DELETE /api/operator/rentals/:id ---
    allRentals = allRentals.filter((r) => r.rentalId !== rentalId);
    showFeedback("Rental agreement deleted.", "success");
    renderRentals(allRentals);
  } catch (err) {
    showFeedback("Failed to delete rental agreement.", "error");
  }
}

function onRentalsTableClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "edit") editRental(id);
  if (btn.dataset.action === "delete") deleteRental(id);
}

/* ----- bootstrap ----- */
async function loadPage() {
  try {
    // --- TEMPORARY: mock data ---
    allStalls = [...MOCK_STALLS];
    allRentals = [...MOCK_RENTALS];
    // --- REAL ---
    // const [sRes, rRes] = await Promise.all([
    //   fetch("/api/operator/stalls",  { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
    //   fetch("/api/operator/rentals", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }),
    // ]);
    // if (!sRes.ok || !rRes.ok) throw new Error("Failed to load data");
    // allStalls  = (await sRes.json()).data;
    // allRentals = (await rRes.json()).data;

    populateDropdowns();
    renderStalls(allStalls);
    renderRentals(allRentals);
  } catch (err) {
    showFeedback("Could not load stalls data. Please try again.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPage();

  document.getElementById("add-rental-btn").addEventListener("click", () => {
    resetRentalForm();
    showRentalForm();
  });
  document
    .getElementById("cancel-rental-btn")
    .addEventListener("click", hideRentalForm);
  document
    .getElementById("rental-form")
    .addEventListener("submit", handleSaveRental);
  document
    .getElementById("rentals-tbody")
    .addEventListener("click", onRentalsTableClick);
  document
    .getElementById("stall-search")
    .addEventListener("input", debounce(applyStallFilters, 150));
  document
    .getElementById("stall-centre-filter")
    .addEventListener("change", applyStallFilters);
});
