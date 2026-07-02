/* =============================================================================
   operator-vendors.js — drives operator/vendors.html (Vendors CRUD).
   Enhancements: sort dropdown (name A-Z/Z-A, status, stalls asc/desc),
   wider Edit/Delete gap.
============================================================================= */

let MOCK_VENDORS = [
  {
    vendorId: 1,
    name: "Tan Wei Ming",
    email: "weiming@example.com",
    phone: "9123 4567",
    stallCount: 1,
    status: "active",
  },
  {
    vendorId: 2,
    name: "Siti Rahimah",
    email: "siti@example.com",
    phone: "9234 5678",
    stallCount: 2,
    status: "active",
  },
  {
    vendorId: 3,
    name: "Loo Kah Fatt",
    email: "lookhf@example.com",
    phone: "9345 6789",
    stallCount: 1,
    status: "active",
  },
  {
    vendorId: 4,
    name: "Kumar Selvam",
    email: "kumar@example.com",
    phone: "9456 7890",
    stallCount: 1,
    status: "inactive",
  },
  {
    vendorId: 5,
    name: "Ng Jian Bo",
    email: "ngjiabo@example.com",
    phone: "9567 8901",
    stallCount: 1,
    status: "active",
  },
];

let allVendors = [];
let isEditing = false;

function esc(v) {
  const d = document.createElement("div");
  d.textContent = String(v);
  return d.innerHTML;
}

/* ----- render ----- */
function renderVendors(list) {
  const tbody = document.getElementById("vendors-tbody");
  document.getElementById("vendors-count").textContent =
    `${list.length} vendor${list.length === 1 ? "" : "s"}`;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-ink-muted)">No vendors match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((v) => {
      const pill =
        v.status === "active"
          ? `<span class="status-pill status-pill--ready">Active</span>`
          : `<span class="status-pill status-pill--cancelled">Inactive</span>`;
      return `
      <tr>
        <td style="font-weight:600">${esc(v.name)}</td>
        <td style="color:var(--color-ink-muted)">${esc(v.email)}</td>
        <td style="font-family:var(--font-mono)">${esc(v.phone)}</td>
        <td style="font-family:var(--font-mono)">${v.stallCount} stall${v.stallCount === 1 ? "" : "s"}</td>
        <td>${pill}</td>
        <td>
          <span class="action-gap">
            <button class="link-btn" data-action="edit" data-id="${v.vendorId}">Edit</button>
            <button class="link-btn" data-action="delete" data-id="${v.vendorId}" style="color:var(--color-error)">Delete</button>
          </span>
        </td>
      </tr>`;
    })
    .join("");
}

/* ----- filters + sort ----- */
function applyFilters() {
  const q = (document.getElementById("vendor-search").value || "")
    .trim()
    .toLowerCase();
  const status = document.getElementById("vendor-status-filter").value;
  const sortBy = document.getElementById("vendor-sort").value;

  let filtered = allVendors.filter((v) => {
    const matchesText =
      !q ||
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q);
    const matchesStatus = !status || v.status === status;
    return matchesText && matchesStatus;
  });

  // Sort
  filtered = filtered.slice().sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "status":
        return a.status === b.status ? 0 : a.status === "active" ? -1 : 1;
      case "stalls-desc":
        return b.stallCount - a.stallCount;
      case "stalls-asc":
        return a.stallCount - b.stallCount;
      default:
        return 0;
    }
  });

  renderVendors(filtered);
}

/* ----- form ----- */
function showForm() {
  document.getElementById("vendor-form-card").classList.remove("is-hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function hideForm() {
  document.getElementById("vendor-form-card").classList.add("is-hidden");
  resetForm();
}
function resetForm() {
  const form = document.getElementById("vendor-form");
  form.reset();
  form.elements.vendorId.value = "";
  isEditing = false;
  document.getElementById("vendor-form-title").textContent = "Add New Vendor";
  document.getElementById("save-vendor-btn").textContent = "Save Vendor";
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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim()))
    errors.email = true;
  if (!/^[0-9 +()-]{6,}$/.test(form.elements.phone.value.trim()))
    errors.phone = true;
  for (const key of ["name", "email", "phone"]) {
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
  const btn = document.getElementById("save-vendor-btn");
  if (!validateForm(form)) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }

  const vendorId = form.elements.vendorId.value;
  const payload = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    phone: form.elements.phone.value.trim(),
    status: form.elements.status.value,
  };

  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    await new Promise((r) => setTimeout(r, 400));
    if (isEditing && vendorId) {
      const idx = allVendors.findIndex((v) => v.vendorId === Number(vendorId));
      if (idx > -1) allVendors[idx] = { ...allVendors[idx], ...payload };
      showFeedback("Vendor updated.", "success");
    } else {
      allVendors.push({ vendorId: Date.now(), stallCount: 0, ...payload });
      showFeedback("Vendor added.", "success");
    }
    hideForm();
    applyFilters();
  } catch (err) {
    showFeedback("Failed to save vendor. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? "Update Vendor" : "Save Vendor";
  }
}

function editVendor(vendorId) {
  const v = allVendors.find((v) => v.vendorId === vendorId);
  if (!v) return;
  isEditing = true;
  document.getElementById("vendor-form-title").textContent = "Edit Vendor";
  document.getElementById("save-vendor-btn").textContent = "Update Vendor";
  const form = document.getElementById("vendor-form");
  form.elements.vendorId.value = v.vendorId;
  form.elements.name.value = v.name;
  form.elements.email.value = v.email;
  form.elements.phone.value = v.phone;
  form.elements.status.value = v.status;
  showForm();
}

async function deleteVendor(vendorId) {
  const v = allVendors.find((v) => v.vendorId === vendorId);
  if (v && v.stallCount > 0) {
    showFeedback(
      "Cannot delete a vendor with active stalls. Remove their stalls first.",
      "error",
    );
    return;
  }
  if (!confirm("Delete this vendor? This cannot be undone.")) return;
  try {
    await new Promise((r) => setTimeout(r, 300));
    allVendors = allVendors.filter((v) => v.vendorId !== vendorId);
    showFeedback("Vendor deleted.", "success");
    applyFilters();
  } catch (err) {
    showFeedback("Failed to delete vendor.", "error");
  }
}

function onTableClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  if (btn.dataset.action === "edit") editVendor(id);
  if (btn.dataset.action === "delete") deleteVendor(id);
}

async function loadPage() {
  try {
    allVendors = [...MOCK_VENDORS];
    renderVendors(allVendors);
  } catch (err) {
    showFeedback("Could not load vendors. Please try again.", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPage();
  document.getElementById("add-vendor-btn").addEventListener("click", () => {
    resetForm();
    showForm();
  });
  document
    .getElementById("cancel-vendor-btn")
    .addEventListener("click", hideForm);
  document.getElementById("vendor-form").addEventListener("submit", handleSave);
  document
    .getElementById("vendors-tbody")
    .addEventListener("click", onTableClick);
  document
    .getElementById("vendor-search")
    .addEventListener("input", debounce(applyFilters, 150));
  document
    .getElementById("vendor-status-filter")
    .addEventListener("change", applyFilters);
  document
    .getElementById("vendor-sort")
    .addEventListener("change", applyFilters);
});
