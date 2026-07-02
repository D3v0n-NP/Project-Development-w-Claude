/* =============================================================================
   cart.js — drives customer/cart.html (review + place order).
   Depends on showFeedback() from main.js (loaded first).

   FLOW:
     1) Read cart from localStorage (written by stall-detail.js).
     2) Group items by stall, render the items column and the ticket.
     3) Quantity changes / removals write straight back to localStorage.
     4) Place-order POSTs the whole cart to /api/orders. The back end fans out
        across stalls and returns a 200 (all good) or 207 multi-status (partial).

   BACK-END CONTRACT (mapped fully in the back-end blueprint message):
     POST /api/orders
       body: { customerName, customerPhone, customerEmail?, customerId?,
               items: [ {stallId, itemId, qty}, ... ] }
       200: { success: true, data: { orderGroupId, orders: [ {orderId, stallId, status:"confirmed"}, ... ] } }
       207: { success: false, data: { orderGroupId, orders: [ {stallId, status:"confirmed"|"failed", reason?}, ... ] } }
       400: { success: false, message: "Validation error", errors: { ... } }
       500: generic error
============================================================================= */

const CART_STORAGE_KEY = "hawkerHub.cart";  // shared with stall-detail.js

let cart = { items: [] };  // populated by readCart() on load

/* ----- storage helpers (parallel to stall-detail.js) ----- */

function readCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { items: [] };
  } catch {
    return { items: [] };
  }
}

function writeCart(next) {
  cart = next;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  render();
}

/* ----- formatting helpers ----- */

function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}

/* Group items by stallId so each stall's items render together.
   Returns: [ { stallId, stallName, items: [...], subtotal }, ... ]. */
function groupByStall(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.stallId)) {
      map.set(item.stallId, {
        stallId: item.stallId,
        stallName: item.stallName,
        items: [],
        subtotal: 0,
      });
    }
    const group = map.get(item.stallId);
    group.items.push(item);
    group.subtotal += item.qty * item.price;
  }
  return Array.from(map.values());
}

/* ----- rendering ----- */

/* Build one line-item row inside a stall group. */
function lineItemHTML(item) {
  return `
    <div class="line-item" data-item-id="${item.itemId}" data-stall-id="${item.stallId}">
      <!-- Placeholder image (same component as stall.html) — first letter of the dish name. -->
      <div class="line-item__img menu-item__img menu-item__img--placeholder" aria-hidden="true">
        <span>${esc(item.name[0])}</span>
      </div>

      <div class="line-item__body">
        <h4 class="line-item__name">${esc(item.name)}</h4>
        <p class="line-item__meta">${fmtPrice(item.price)} each</p>

        <div class="line-item__controls">
          <div class="qty-stepper" data-stepper>
            <button class="qty-stepper__btn" type="button" data-action="dec" aria-label="Decrease quantity">−</button>
            <span class="qty-stepper__value" data-qty>${item.qty}</span>
            <button class="qty-stepper__btn" type="button" data-action="inc" aria-label="Increase quantity">+</button>
          </div>
          <button class="line-item__remove" type="button" data-remove
                  aria-label="Remove ${esc(item.name)} from cart">Remove</button>
        </div>
      </div>

      <!-- Right-aligned line total — the figure that matters for this row. -->
      <div class="line-item__total" data-line-total>${fmtPrice(item.qty * item.price)}</div>
    </div>`;
}

/* Build one stall group block (header + its line items + subtotal). */
function stallGroupHTML(group) {
  return `
    <section class="stall-group" data-stall-id="${group.stallId}">
      <header class="stall-group__head">
        <h3 class="stall-group__name">${esc(group.stallName)}</h3>
        <span class="stall-group__subtotal" data-stall-subtotal>${fmtPrice(group.subtotal)}</span>
      </header>
      <div class="stall-group__items">
        ${group.items.map(lineItemHTML).join("")}
      </div>
    </section>`;
}

/* Build the per-stall subtotal lines inside the ticket. */
function ticketLineHTML(group) {
  return `
    <li class="ticket__line">
      <span class="ticket__line-label">${esc(group.stallName)}</span>
      <span class="ticket__line-value">${fmtPrice(group.subtotal)}</span>
    </li>`;
}

/* Top-level render: empty state vs. layout. */
function render() {
  const layout = document.getElementById("cart-layout");
  const empty = document.getElementById("empty-state");

  if (cart.items.length === 0) {
    layout.classList.add("is-hidden");
    empty.classList.remove("is-hidden");
    return;
  }
  empty.classList.add("is-hidden");
  layout.classList.remove("is-hidden");

  // Group and render the items column
  const groups = groupByStall(cart.items);
  document.getElementById("cart-items").innerHTML = groups.map(stallGroupHTML).join("");

  // Render the ticket — per-stall subtotals + grand total + count
  const totalItems = cart.items.reduce((sum, i) => sum + i.qty, 0);
  const grandTotal = groups.reduce((sum, g) => sum + g.subtotal, 0);

  document.getElementById("ticket-sub").textContent =
    `${totalItems} item${totalItems === 1 ? "" : "s"} · ${groups.length} stall${groups.length === 1 ? "" : "s"}`;
  document.getElementById("ticket-lines").innerHTML = groups.map(ticketLineHTML).join("");
  document.getElementById("ticket-total").textContent = fmtPrice(grandTotal);
}

/* ----- mutation handlers ----- */

/* Find a cart line by composite key (itemId + stallId — same dish at two stalls is two lines). */
function findLine(itemId, stallId) {
  return cart.items.find((c) => c.itemId === itemId && c.stallId === stallId);
}

/* Bump or drop quantity on a line. delta is +1 or -1. */
function adjustQty(itemId, stallId, delta) {
  const line = findLine(itemId, stallId);
  if (!line) return;
  const next = line.qty + delta;
  if (next <= 0) {
    removeLine(itemId, stallId);
    return;
  }
  line.qty = Math.min(next, 99);  // soft ceiling to stop accidental huge orders
  writeCart(cart);
}

/* Remove a single line entirely. */
function removeLine(itemId, stallId) {
  cart.items = cart.items.filter((c) => !(c.itemId === itemId && c.stallId === stallId));
  writeCart(cart);
}

/* Delegated click on the items column: handle stepper +/- and remove buttons. */
function onItemsClick(event) {
  const row = event.target.closest(".line-item");
  if (!row) return;

  const itemId  = Number(row.dataset.itemId);
  const stallId = Number(row.dataset.stallId);

  if (event.target.closest("[data-remove]")) {
    removeLine(itemId, stallId);
    return;
  }

  const stepBtn = event.target.closest(".qty-stepper__btn");
  if (stepBtn) {
    adjustQty(itemId, stallId, stepBtn.dataset.action === "inc" ? 1 : -1);
  }
}

/* ----- checkout ----- */

/* Light client-side validation. Real validation lives server-side via Joi. */
function validateCheckoutForm(form) {
  const errors = {};
  const name  = form.elements.customerName.value.trim();
  const phone = form.elements.customerPhone.value.trim();
  const email = form.elements.customerEmail.value.trim();

  if (name.length < 2)                          errors.customerName = "Enter your name.";
  if (!/^[0-9 +()-]{6,}$/.test(phone))          errors.customerPhone = "Enter a valid phone number.";
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
                                                errors.customerEmail = "Enter a valid email or leave blank.";

  // Apply error state to fields (shadcn pattern: data-invalid on the wrapper, aria-invalid on the input)
  for (const key of ["customerName", "customerPhone", "customerEmail"]) {
    const input = form.elements[key];
    const wrap = input.closest(".field");
    const bad = Boolean(errors[key]);
    wrap.classList.toggle("is-invalid", bad);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
  }
  return errors;
}

async function placeOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = document.getElementById("place-order");

  const errors = validateCheckoutForm(form);
  if (Object.keys(errors).length > 0) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }
  if (cart.items.length === 0) {
    showFeedback("Your cart is empty.", "error");
    return;
  }

  // Disable to prevent double-submit while in flight
  button.disabled = true;
  button.textContent = "Placing…";

  // Payload — exactly the shape POST /api/orders documents
  const payload = {
    customerName:  form.elements.customerName.value.trim(),
    customerPhone: form.elements.customerPhone.value.trim(),
    customerEmail: form.elements.customerEmail.value.trim() || null,
    items: cart.items.map((i) => ({
      stallId: i.stallId,
      itemId:  i.itemId,
      qty:     i.qty,
    })),
  };

  try {
    // --- TEMPORARY: mock success so the page is demoable without the API ---
    await new Promise((r) => setTimeout(r, 600));  // simulate a network round-trip
    const ok = true;

    // --- REAL (enable once POST /api/orders is built) ---
    // const res = await fetch("/api/orders", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
    // const body = await res.json();
    //
    // // 207 = some stalls confirmed, some failed. Show the partial result honestly
    // // rather than silently failing or pretending it all worked.
    // if (res.status === 207) {
    //   const failed = body.data.orders.filter((o) => o.status === "failed");
    //   showFeedback(
    //     `Placed ${body.data.orders.length - failed.length} of ${body.data.orders.length} orders. `
    //     + `${failed.length} stall${failed.length === 1 ? "" : "s"} failed — please retry those.`,
    //     "error"
    //   );
    //   // Keep only the failed-stall items in the cart so the customer can retry.
    //   const failedStallIds = new Set(failed.map((f) => f.stallId));
    //   cart.items = cart.items.filter((i) => failedStallIds.has(i.stallId));
    //   writeCart(cart);
    //   return;
    // }
    // if (!res.ok) throw new Error(body.message || "Order failed");

    if (ok) {
      // Clear cart + redirect to a confirmation page (account history for now).
      localStorage.removeItem(CART_STORAGE_KEY);
      window.location.href = "/customer/account.html?order=success";
    }
  } catch (err) {
    showFeedback("Could not place your order. Please try again.", "error");
    button.disabled = false;
    button.textContent = "Place order";
  }
}

/* ----- bootstrap ----- */

document.addEventListener("DOMContentLoaded", () => {
  cart = readCart();
  render();

  document.getElementById("cart-items").addEventListener("click", onItemsClick);  // delegation
  document.getElementById("checkout-form").addEventListener("submit", placeOrder);

  // Keep cart in sync if the customer has the cart open in another tab and changes it there
  window.addEventListener("storage", (e) => {
    if (e.key === CART_STORAGE_KEY) {
      cart = readCart();
      render();
    }
  });
});