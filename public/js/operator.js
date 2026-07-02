/* =============================================================================
   operator.js — drives operator/operator.html (Operator Dashboard).
   Enhancements:
     - Colour-coded row tints on expiring rentals (red ≤7d, amber ≤30d)
     - Clickable stall rows in performance table → slide-in detail panel
============================================================================= */

const MOCK_CENTRES = [
  {
    centreId: 1,
    name: "Maxwell Food Centre",
    numCookedFoodStalls: 100,
    status: "Existing",
  },
  {
    centreId: 2,
    name: "Tiong Bahru Market",
    numCookedFoodStalls: 83,
    status: "Existing",
  },
  {
    centreId: 3,
    name: "Chinatown Complex",
    numCookedFoodStalls: 260,
    status: "Existing",
  },
  {
    centreId: 4,
    name: "Yew Tee Hawker Centre",
    numCookedFoodStalls: 40,
    status: "Under Construction",
  },
];

const MOCK_RENTALS = [
  {
    rentalId: 1001,
    stallNo: "#02-15",
    stallName: "Ah Hock Chicken Rice",
    vendorName: "Tan Wei Ming",
    startDate: "2025-01-01",
    endDate: "2026-07-15",
    monthlyRent: 1200,
    status: "active",
  },
  {
    rentalId: 1002,
    stallNo: "#02-30",
    stallName: "Selera Rasa",
    vendorName: "Siti Rahimah",
    startDate: "2025-03-01",
    endDate: "2026-07-20",
    monthlyRent: 950,
    status: "active",
  },
  {
    rentalId: 1003,
    stallNo: "#02-58",
    stallName: "Loo's Hainanese",
    vendorName: "Loo Kah Fatt",
    startDate: "2024-06-01",
    endDate: "2026-07-05",
    monthlyRent: 1100,
    status: "active",
  },
  {
    rentalId: 1004,
    stallNo: "#01-10",
    stallName: "Roti Prata House",
    vendorName: "Kumar Selvam",
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    monthlyRent: 800,
    status: "expired",
  },
  {
    rentalId: 1005,
    stallNo: "#02-05",
    stallName: "Jian Bo Shui Kueh",
    vendorName: "Ng Jian Bo",
    startDate: "2025-06-01",
    endDate: "2026-08-10",
    monthlyRent: 1050,
    status: "active",
  },
];

const MOCK_PERFORMANCE = {
  totalRevenue: 128450.0,
  totalOrders: 3841,
  avgHygieneScore: 4.6,
  topStalls: [
    {
      stallId: 1,
      name: "Ah Hock Chicken Rice",
      centre: "Maxwell Food Centre",
      stallNo: "#02-15",
      cuisines: ["Chinese"],
      grade: "A",
      rating: 4.6,
      vendorName: "Tan Wei Ming",
      orders: 842,
      revenue: 4210.0,
    },
    {
      stallId: 2,
      name: "Loo's Hainanese",
      centre: "Tiong Bahru Market",
      stallNo: "#02-58",
      cuisines: ["Chinese"],
      grade: "A",
      rating: 4.8,
      vendorName: "Loo Kah Fatt",
      orders: 721,
      revenue: 3964.5,
    },
    {
      stallId: 3,
      name: "Selera Rasa",
      centre: "Tiong Bahru Market",
      stallNo: "#02-30",
      cuisines: ["Malay", "Halal"],
      grade: "A",
      rating: 4.7,
      vendorName: "Siti Rahimah",
      orders: 610,
      revenue: 2745.0,
    },
  ],
};

/* ----- helpers ----- */
function esc(v) {
  const d = document.createElement("div");
  d.textContent = String(v);
  return d.innerHTML;
}
function fmtPrice(v) {
  return "S$" + Number(v).toFixed(2);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function daysUntil(iso) {
  return Math.ceil((new Date(iso) - new Date()) / (1000 * 60 * 60 * 24));
}
function gradeClass(g) {
  return "grade-pill--" + String(g).toLowerCase();
}

/* ----- KPI strip ----- */
function renderStats(centres, rentals) {
  const active = rentals.filter((r) => r.status === "active");
  const expiring = active.filter((r) => daysUntil(r.endDate) <= 30).length;
  document.getElementById("stat-centres").textContent = centres.length;
  document.getElementById("stat-stalls").textContent = centres.reduce(
    (s, c) => s + c.numCookedFoodStalls,
    0,
  );
  document.getElementById("stat-rentals").textContent = active.length;
  document.getElementById("stat-expiring").textContent = expiring;
}

/* ----- Overview: centres glance ----- */
function renderOverviewCentres(centres) {
  document.getElementById("overview-centres-tbody").innerHTML = centres
    .map((c) => {
      const pill =
        c.status === "Existing"
          ? `<span class="status-pill status-pill--ready">Operational</span>`
          : `<span class="status-pill status-pill--confirmed">Under Construction</span>`;
      return `<tr>
      <td style="font-weight:600">${esc(c.name)}</td>
      <td style="font-family:var(--font-mono)">${c.numCookedFoodStalls}</td>
      <td>${pill}</td>
    </tr>`;
    })
    .join("");
}

/* ----- Overview: expiring rentals with colour-coded rows ----- */
function renderExpiringRentals(rentals) {
  const tbody = document.getElementById("expiring-rentals-tbody");
  const expiring = rentals
    .filter((r) => r.status === "active" && daysUntil(r.endDate) <= 30)
    .sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  if (expiring.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--color-ink-muted)">No rentals expiring within 30 days.</td></tr>`;
    return;
  }

  tbody.innerHTML = expiring
    .map((r) => {
      const days = daysUntil(r.endDate);
      // Row tint class — red ≤7 days, amber ≤30 days
      const rowClass = days <= 7 ? "row--urgent" : "row--warning";
      const urgency =
        days <= 7
          ? `<span class="status-pill status-pill--cancelled">${days}d left</span>`
          : `<span class="status-pill status-pill--preparing">${days}d left</span>`;
      return `<tr class="${rowClass}">
      <td style="font-weight:600">${esc(r.stallName)} <span style="font-family:var(--font-mono); font-size:var(--text-xs); color:var(--color-ink-muted)">${esc(r.stallNo)}</span></td>
      <td>${esc(r.vendorName)}</td>
      <td>${urgency}</td>
    </tr>`;
    })
    .join("");
}

/* ----- Rentals tab ----- */
function rentalStatusPill(r) {
  if (r.status === "expired")
    return `<span class="status-pill status-pill--cancelled">Expired</span>`;
  const days = daysUntil(r.endDate);
  if (days <= 30)
    return `<span class="status-pill status-pill--preparing">Expiring Soon</span>`;
  return `<span class="status-pill status-pill--ready">Active</span>`;
}

function renderRentals(rentals) {
  const tbody = document.getElementById("rentals-tbody");
  if (!rentals.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--color-ink-muted)">No rental agreements found.</td></tr>`;
    return;
  }
  tbody.innerHTML = rentals
    .map(
      (r) => `
    <tr>
      <td style="font-family:var(--font-mono); font-weight:700">#${r.rentalId}</td>
      <td style="font-weight:600">${esc(r.stallName)} <span style="font-family:var(--font-mono); font-size:var(--text-xs); color:var(--color-ink-muted)">${esc(r.stallNo)}</span></td>
      <td>${esc(r.vendorName)}</td>
      <td>${fmtDate(r.startDate)}</td>
      <td>${fmtDate(r.endDate)}</td>
      <td style="font-family:var(--font-mono); font-weight:700">${fmtPrice(r.monthlyRent)}</td>
      <td>${rentalStatusPill(r)}</td>
    </tr>`,
    )
    .join("");
}

/* ----- Performance tab ----- */
function renderPerformance(data) {
  document.getElementById("perf-revenue").textContent = fmtPrice(
    data.totalRevenue,
  );
  document.getElementById("perf-orders").textContent =
    data.totalOrders.toLocaleString();
  document.getElementById("perf-rating").textContent =
    data.avgHygieneScore.toFixed(1);

  document.getElementById("perf-tbody").innerHTML = data.topStalls
    .map(
      (s) => `
    <tr class="perf-row--clickable" data-stall-id="${s.stallId}">
      <td style="font-weight:600">${esc(s.name)}</td>
      <td>${esc(s.centre)}</td>
      <td style="font-family:var(--font-mono)">${s.orders.toLocaleString()}</td>
      <td style="font-family:var(--font-mono); font-weight:700; color:var(--color-green)">${fmtPrice(s.revenue)}</td>
      <td>
        <span class="grade-pill ${gradeClass(s.grade)}">
          <span class="grade-pill__letter">${esc(s.grade)}</span>
          <span class="grade-pill__label">Grade</span>
        </span>
      </td>
    </tr>`,
    )
    .join("");
}

/* ----- Slide-in detail panel ----- */
function openDetailPanel(stall) {
  document.getElementById("detail-name").textContent = stall.name;

  const cuisines = stall.cuisines
    .map((c) => `<span class="cuisine-chip">${esc(c)}</span>`)
    .join(" ");

  document.getElementById("detail-body").innerHTML = `
    <!-- Identity section -->
    <div>
      <p class="detail-section__label">Stall Info</p>
      <div class="detail-row">
        <span class="detail-row__label">Unit No.</span>
        <span class="detail-row__value" style="font-family:var(--font-mono)">${esc(stall.stallNo)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Centre</span>
        <span class="detail-row__value">${esc(stall.centre)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Vendor</span>
        <span class="detail-row__value">${esc(stall.vendorName)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Cuisine</span>
        <span class="detail-row__value">${cuisines}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Rating</span>
        <span class="detail-row__value" style="color:var(--color-amber)">★ ${Number(stall.rating).toFixed(1)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Hygiene Grade</span>
        <span class="detail-row__value">
          <span class="grade-pill ${gradeClass(stall.grade)}">
            <span class="grade-pill__letter">${esc(stall.grade)}</span>
            <span class="grade-pill__label">Grade</span>
          </span>
        </span>
      </div>
    </div>
    <!-- Performance section -->
    <div>
      <p class="detail-section__label">This Month's Performance</p>
      <div class="detail-row">
        <span class="detail-row__label">Orders</span>
        <span class="detail-row__value" style="font-family:var(--font-mono)">${stall.orders.toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row__label">Revenue</span>
        <span class="detail-row__value" style="font-family:var(--font-mono); color:var(--color-green)">${fmtPrice(stall.revenue)}</span>
      </div>
    </div>`;

  document.getElementById("detail-overlay").classList.add("is-open");
  document.getElementById("detail-panel").classList.add("is-open");
  document
    .getElementById("detail-overlay")
    .setAttribute("aria-hidden", "false");
}

function closeDetailPanel() {
  document.getElementById("detail-overlay").classList.remove("is-open");
  document.getElementById("detail-panel").classList.remove("is-open");
  document.getElementById("detail-overlay").setAttribute("aria-hidden", "true");
}

/* ----- bootstrap ----- */
async function loadPage() {
  try {
    const centres = MOCK_CENTRES;
    const rentals = MOCK_RENTALS;
    const perfData = MOCK_PERFORMANCE;

    renderStats(centres, rentals);
    renderOverviewCentres(centres);
    renderExpiringRentals(rentals);
    renderRentals(rentals);
    renderPerformance(perfData);
  } catch (err) {
    showFeedback(
      "Could not load dashboard. Please try again shortly.",
      "error",
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadPage();

  // Delegated click on performance table rows
  document.getElementById("perf-tbody").addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-stall-id]");
    if (!row) return;
    const stallId = Number(row.dataset.stallId);
    const stall = MOCK_PERFORMANCE.topStalls.find((s) => s.stallId === stallId);
    if (stall) openDetailPanel(stall);
  });

  // Close panel via overlay click or close button
  document
    .getElementById("detail-close")
    .addEventListener("click", closeDetailPanel);
  document
    .getElementById("detail-overlay")
    .addEventListener("click", closeDetailPanel);

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDetailPanel();
  });
});
