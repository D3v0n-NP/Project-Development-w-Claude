/* =============================================================================
   menu.js — drives vendor/menu.html (Menu Management CRUD).
============================================================================= */

let MOCK_MENU = [
  {
    itemId: 1,
    name: "Hainanese Chicken Rice",
    price: 5.0,
    description: "Steamed chicken on fragrant rice.",
    category: "Mains",
    cuisines: ["Chinese", "Halal"],
    available: true,
    photoUrl: "chicken.png",
    ecoFriendly: true,
  },
  {
    itemId: 2,
    name: "Curry Rice Set",
    price: 5.5,
    description: "Pork chop, cabbage, egg, curry gravy.",
    category: "Mains",
    cuisines: ["Chinese"],
    available: true,
    photoUrl: "curry.png",
    ecoFriendly: false,
  },
  {
    itemId: 5,
    name: "Braised Cabbage",
    price: 1.5,
    description: "Slow-braised in chicken stock.",
    category: "Sides",
    cuisines: ["Chinese"],
    available: true,
    photoUrl: "cabbage.png",
    ecoFriendly: false,
  },
];

let menuItems = [];
let isEditing = false;

function esc(value) {
  const d = document.createElement("div");
  d.textContent = String(value);
  return d.innerHTML;
}

function fmtPrice(value) {
  return "S$" + Number(value).toFixed(2);
}

function renderMenu() {
  const tbody = document.getElementById("menu-table-body");
  document.getElementById("menu-count").textContent =
    `${menuItems.length} items total`;

  if (menuItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-ink-muted); padding: var(--space-6);">Your menu is currently empty.</td></tr>`;
    return;
  }

  tbody.innerHTML = menuItems
    .map((item) => {
      const cuisines = item.cuisines
        .map((c) => `<span class="cuisine-chip">${esc(c)}</span>`)
        .join(" ");
      let statusPill = item.available
        ? `<span class="status-pill status-pill--ready">Available</span>`
        : `<span class="status-pill status-pill--cancelled">Sold Out</span>`;
      if (item.ecoFriendly)
        statusPill += ` <span title="Eco-Friendly Packaging">🌱</span>`;

      // THIS IS THE SIMPLE PATH LOGIC
      // If photoUrl is "chicken.png", it becomes <img src="../assets/chicken.png" ... />
      const photoHtml = item.photoUrl
        ? `<img src="../assets/images/${item.photoUrl}" style="width: 48px; height: 48px; object-fit: cover; border-radius: var(--radius-sm);" />`
        : '<div style="width: 48px; height: 48px; background: var(--color-line); border-radius: var(--radius-sm);"></div>';

      return `
      <tr>
        <td style="padding-right: 0;">${photoHtml}</td>
        <td style="font-weight: 700;">${esc(item.name)}</td>
        <td>${esc(item.category)}</td>
        <td>${cuisines}</td>
        <td style="font-family: var(--font-mono);">${fmtPrice(item.price)}</td>
        <td>${statusPill}</td>
        <td>
          <button class="link-btn" data-action="edit" data-id="${item.itemId}" style="margin-right: var(--space-2);">Edit</button>
          <button class="link-btn" data-action="delete" data-id="${item.itemId}" style="color: var(--color-error);">Delete</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function validateMenuForm(form) {
  const errors = {};
  const name = form.elements.name.value.trim();
  const price = form.elements.price.value;
  const category = form.elements.category.value;
  const cuisines = Array.from(form.elements.cuisines.selectedOptions).map(
    (opt) => opt.value,
  );

  if (name.length < 1) errors.name = true;
  if (!price || Number(price) <= 0) errors.price = true;
  if (!category) errors.category = true;
  if (cuisines.length === 0) errors.cuisines = true;

  for (const fieldName of ["name", "price", "category", "cuisines"]) {
    const input = form.elements[fieldName];
    const wrap = input.closest(".field");
    const bad = Boolean(errors[fieldName]);
    wrap.classList.toggle("is-invalid", bad);
    input.setAttribute("aria-invalid", bad ? "true" : "false");
  }
  return Object.keys(errors).length === 0;
}

async function handleSaveItem(event) {
  event.preventDefault();
  const form = event.target;
  const btn = document.getElementById("save-btn");

  if (!validateMenuForm(form)) {
    showFeedback("Please fix the highlighted fields.", "error");
    return;
  }

  const itemId = form.elements.itemId.value;
  const name = form.elements.name.value.trim();
  const price = Number(form.elements.price.value);
  const description = form.elements.description.value.trim();
  const category = form.elements.category.value;
  const available = form.elements.available.value === "true";
  const photoUrl = form.elements.photoUrl.value.trim();
  const cuisines = Array.from(form.elements.cuisines.selectedOptions).map(
    (opt) => opt.value,
  );
  const ecoFriendly = form.elements.ecoFriendly.checked;

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await new Promise((r) => setTimeout(r, 400));

    if (isEditing && itemId) {
      const index = menuItems.findIndex((i) => i.itemId === Number(itemId));
      if (index > -1) {
        menuItems[index] = {
          itemId: Number(itemId),
          name,
          price,
          description,
          category,
          cuisines,
          available,
          photoUrl,
          ecoFriendly,
        };
        showFeedback("Menu item updated successfully.", "success");
      }
    } else {
      const newItem = {
        itemId: Date.now(),
        name,
        price,
        description,
        category,
        cuisines,
        available,
        photoUrl,
        ecoFriendly,
      };
      menuItems.push(newItem);
      showFeedback("New menu item added.", "success");
    }

    resetForm();
    renderMenu();
  } catch (err) {
    showFeedback("Failed to save menu item. Please try again.", "error");
  } finally {
    btn.disabled = false;
    btn.textContent = isEditing ? "Update item" : "Save item";
  }
}

function editItem(itemId) {
  const item = menuItems.find((i) => i.itemId === itemId);
  if (!item) return;

  isEditing = true;
  document.getElementById("form-title").textContent = "Edit menu item";
  document.getElementById("save-btn").textContent = "Update item";
  document.getElementById("cancel-btn").classList.remove("is-hidden");

  const form = document.getElementById("menu-form");
  form.elements.itemId.value = item.itemId;
  form.elements.name.value = item.name;
  form.elements.price.value = item.price;
  form.elements.description.value = item.description;
  form.elements.category.value = item.category;
  form.elements.available.value = item.available.toString();
  form.elements.photoUrl.value = item.photoUrl || "";
  form.elements.ecoFriendly.checked = item.ecoFriendly || false;

  Array.from(form.elements.cuisines.options).forEach((opt) => {
    opt.selected = item.cuisines.includes(opt.value);
  });

  Array.from(form.elements).forEach((input) => {
    if (input.closest) {
      const wrap = input.closest(".field");
      if (wrap) wrap.classList.remove("is-invalid");
    }
  });

  document.getElementById("item-photo").dispatchEvent(new Event("input"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(itemId) {
  if (
    !confirm(
      "Are you sure you want to delete this menu item? This cannot be undone.",
    )
  )
    return;
  try {
    await new Promise((r) => setTimeout(r, 300));
    menuItems = menuItems.filter((i) => i.itemId !== itemId);
    showFeedback("Menu item deleted.", "success");
    renderMenu();
  } catch (err) {
    showFeedback("Failed to delete item.", "error");
  }
}

function onTableClick(event) {
  const btn = event.target.closest("button[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const itemId = Number(btn.dataset.id);
  if (action === "edit") editItem(itemId);
  if (action === "delete") deleteItem(itemId);
}

function resetForm() {
  const form = document.getElementById("menu-form");
  form.reset();
  form.elements.itemId.value = "";
  document.getElementById("image-preview").innerHTML =
    `<span style="color: var(--color-ink-muted); font-size: 0.7rem;">No img</span>`;

  Array.from(form.elements).forEach((input) => {
    if (input.closest) {
      const wrap = input.closest(".field");
      if (wrap) wrap.classList.remove("is-invalid");
      input.setAttribute("aria-invalid", "false");
    }
  });

  isEditing = false;
  document.getElementById("form-title").textContent = "Add new menu item";
  document.getElementById("save-btn").textContent = "Save item";
  document.getElementById("cancel-btn").classList.add("is-hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  menuItems = [...MOCK_MENU];
  renderMenu();

  document
    .getElementById("menu-form")
    .addEventListener("submit", handleSaveItem);
  document.getElementById("cancel-btn").addEventListener("click", resetForm);
  document
    .getElementById("menu-table-body")
    .addEventListener("click", onTableClick);

  const photoInput = document.getElementById("item-photo");
  const previewBox = document.getElementById("image-preview");
  photoInput.addEventListener("input", (e) => {
    const url = e.target.value.trim();
    if (url) {
      previewBox.innerHTML = `<img src="${esc(url)}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='<span style=\\'color: var(--color-error); font-size: 0.7rem;\\'>Error</span>'" />`;
    } else {
      previewBox.innerHTML = `<span style="color: var(--color-ink-muted); font-size: 0.7rem;">No img</span>`;
    }
  });
});
