/* =============================================================================
   vendor.js — drives vendor/vendor.html
============================================================================= */

const MOCK_ORDERS = [
  {
    orderId: 1042,
    time: "11:42 AM",
    items: "2x Hainanese Chicken Rice",
    total: 10.0,
    status: "confirmed",
  },
  {
    orderId: 1043,
    time: "11:45 AM",
    items: "1x Char Siew Rice",
    total: 5.5,
    status: "preparing",
  },
];

const MOCK_PERFORMANCE = {
  revenue: 345.5,
  ordersCompleted: 42,
  avgRating: 4.8,
  topItems: [
    {
      name: "Hainanese Chicken Rice",
      category: "Mains",
      qtySold: 28,
      revenue: 140.0,
    },
  ],
};

let MOCK_PROMOS = [
  { id: 1, code: "LUNCH10", type: "percentage", value: 10, status: "active" },
];
let orders = [];

function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}
function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}
function statusClass(status) {
  return "status-pill--" + String(status).toLowerCase();
}

function renderOrders() {
  const tbody = document.getElementById("orders-tbody");
  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-ink-muted);">No live orders at the moment.</td></tr>`;
    return;
  }
  tbody.innerHTML = orders
    .map((o) => {
      let actionBtn = "";
      if (o.status === "confirmed")
        actionBtn = `<button class="btn btn--sm btn--outline" onclick="updateOrderStatus(${o.orderId}, 'preparing')">Start Preparing</button>`;
      else if (o.status === "preparing")
        actionBtn = `<button class="btn btn--sm btn--primary" onclick="updateOrderStatus(${o.orderId}, 'ready')">Mark Ready</button>`;
      else if (o.status === "ready")
        actionBtn = `<button class="btn btn--sm btn--ghost" style="color: var(--color-ink-muted);" onclick="updateOrderStatus(${o.orderId}, 'collected')">Complete</button>`;

      return `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 700;">#${o.orderId}</td>
        <td>${esc(o.time)}</td>
        <td>${esc(o.items)}</td>
        <td style="font-family: var(--font-mono); font-weight: 700;">${fmtPrice(o.total)}</td>
        <td><span class="status-pill ${statusClass(o.status)}">${esc(o.status)}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
    })
    .join("");
}

window.updateOrderStatus = async function (orderId, newStatus) {
  try {
    await new Promise((r) => setTimeout(r, 300));
    const orderIndex = orders.findIndex((o) => o.orderId === orderId);
    if (orderIndex > -1) {
      if (newStatus === "collected") {
        orders.splice(orderIndex, 1);
        showFeedback(`Order #${orderId} marked as collected.`, "success");
      } else {
        orders[orderIndex].status = newStatus;
        showFeedback(`Order #${orderId} moved to ${newStatus}.`, "success");
      }
      renderOrders();
    }
  } catch (err) {
    showFeedback("Failed to update order status.", "error");
  }
};

function renderPerformance(data) {
  document.getElementById("stat-revenue").textContent = fmtPrice(data.revenue);
  document.getElementById("stat-orders").textContent = data.ordersCompleted;
  document.getElementById("stat-rating").textContent =
    data.avgRating.toFixed(1);
  const tbody = document.getElementById("performance-tbody");
  tbody.innerHTML = data.topItems
    .map(
      (item) => `
    <tr>
      <td style="font-weight: 600;">${esc(item.name)}</td>
      <td><span class="cuisine-chip">${esc(item.category)}</span></td>
      <td style="font-family: var(--font-mono);">${item.qtySold}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-green);">${fmtPrice(item.revenue)}</td>
    </tr>`,
    )
    .join("");
}

function renderPromos() {
  const tbody = document.getElementById("promos-tbody");
  if (MOCK_PROMOS.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-ink-muted);">No active promotions.</td></tr>`;
    return;
  }
  tbody.innerHTML = MOCK_PROMOS.map((p) => {
    const discountText =
      p.type === "percentage" ? `${p.value}% Off` : `${fmtPrice(p.value)} Off`;
    return `<tr>
        <td style="font-family: var(--font-mono); font-weight: 700;">${esc(p.code)}</td>
        <td>${esc(discountText)}</td>
        <td><span class="status-pill status-pill--ready">Active</span></td>
        <td><button class="link-btn" onclick="deletePromo(${p.id})">End Promo</button></td>
      </tr>`;
  }).join("");
}

async function handleCreatePromo(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById("save-promo-btn");
  const code = form.elements.code.value.trim().toUpperCase();
  const type = form.elements.type.value;
  const value = Number(form.elements.value.value);

  if (!code || !value || value <= 0)
    return showFeedback("Provide valid code and discount.", "error");
  btn.disabled = true;
  btn.textContent = "Launching...";

  try {
    await new Promise((r) => setTimeout(r, 400));
    MOCK_PROMOS.push({ id: Date.now(), code, type, value, status: "active" });
    showFeedback(`Promotion ${code} launched!`, "success");
    form.reset();
    renderPromos();
  } catch (err) {
    showFeedback("Failed to create promotion.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Launch Promotion";
  }
}

window.deletePromo = async function (id) {
  if (!confirm("End this promotion early?")) return;
  MOCK_PROMOS = MOCK_PROMOS.filter((p) => p.id !== id);
  showFeedback("Promotion ended.", "info");
  renderPromos();
};

/* NEW ENHANCEMENT: Simulate a live order arriving */
function simulateIncomingOrders() {
  setTimeout(() => {
    const newOrderId = Math.floor(Math.random() * 9000) + 1000;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const fakeOrder = {
      orderId: newOrderId,
      time: timeString,
      items: "2x Nasi Lemak, 1x Kopi",
      total: 10.4,
      status: "confirmed",
    };

    orders.unshift(fakeOrder); // Add to top
    showFeedback(`🔔 NEW ORDER #${newOrderId} RECEIVED!`, "info");
    renderOrders();

    // Quick CSS highlight animation
    setTimeout(() => {
      const topRow = document.querySelector("#orders-tbody tr:first-child");
      if (topRow) {
        topRow.style.transition = "background 1s ease";
        topRow.style.background = "var(--color-info-bg)";
        setTimeout(() => (topRow.style.background = "transparent"), 1500);
      }
    }, 50);
  }, 10000); // Triggers 10 seconds after page loads
}

document.addEventListener("DOMContentLoaded", () => {
  orders = [...MOCK_ORDERS];
  renderOrders();
  renderPerformance(MOCK_PERFORMANCE);
  renderPromos();
  document
    .getElementById("promo-form")
    .addEventListener("submit", handleCreatePromo);

  simulateIncomingOrders();
});
