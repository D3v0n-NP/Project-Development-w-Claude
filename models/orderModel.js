/* =============================================================================
   models/orderModel.js — all SQL for OrderGroups / Orders / OrderItems.

   FAN-OUT LOGIC (the core of the 207 requirement)
   -------------------------------------------------
   One OrderGroup is created, then each stall's slice of the cart is attempted
   INDEPENDENTLY inside the same transaction. If one stall's items fail
   validation (e.g. an item went unavailable), that stall is marked "failed" in
   the results array but the OTHER stalls still commit successfully. This is
   what makes 200 vs 207 meaningful rather than an all-or-nothing rollback.
============================================================================= */

const { getPool, sql } = require("../config/db");

// Group flat cart items into per-stall buckets, mirroring cart.js's groupByStall().
function groupItemsByStall(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.stallId)) map.set(item.stallId, { stallId: item.stallId, items: [] });
    map.get(item.stallId).items.push(item);
  }
  return Array.from(map.values());
}

// Looks up each item's current price + availability server-side — NEVER trust
// a client-supplied price. Throws if any item is missing/unavailable, which
// the caller catches to mark that whole stall as "failed".
async function fetchAndValidateItems(transaction, items) {
  const validated = [];
  for (const item of items) {
    const result = await transaction.request()
      .input("itemId", sql.Int, item.itemId)
      .query(`SELECT itemId, price, available FROM MenuItems WHERE itemId = @itemId`);

    const menuItem = result.recordset[0];
    if (!menuItem) throw new Error(`Item ${item.itemId} not found`);
    if (!menuItem.available) throw new Error(`Item ${item.itemId} is no longer available`);

    validated.push({ itemId: item.itemId, qty: item.qty, priceAtOrder: menuItem.price });
  }
  return validated;
}

async function createOrderGroup(customerId, payload) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    // 1. Insert the OrderGroup header.
    const groupResult = await transaction.request()
      .input("customerId", sql.Int, customerId)
      .input("customerName", sql.VarChar, payload.customerName)
      .input("customerPhone", sql.VarChar, payload.customerPhone)
      .input("customerEmail", sql.VarChar, payload.customerEmail || null)
      .query(`INSERT INTO OrderGroups (customerId, customerName, customerPhone, customerEmail)
              OUTPUT INSERTED.orderGroupId
              VALUES (@customerId, @customerName, @customerPhone, @customerEmail)`);
    const orderGroupId = groupResult.recordset[0].orderGroupId;

    // 2. Attempt each stall's slice independently.
    const byStall = groupItemsByStall(payload.items);
    const results = [];
    let anyFailed = false;

    for (const stallOrder of byStall) {
      try {
        const items = await fetchAndValidateItems(transaction, stallOrder.items);
        const subtotal = items.reduce((sum, i) => sum + i.priceAtOrder * i.qty, 0);

        const orderResult = await transaction.request()
          .input("orderGroupId", sql.Int, orderGroupId)
          .input("stallId", sql.Int, stallOrder.stallId)
          .input("subtotal", sql.Decimal(10, 2), subtotal)
          .query(`INSERT INTO Orders (orderGroupId, stallId, subtotal)
                  OUTPUT INSERTED.orderId
                  VALUES (@orderGroupId, @stallId, @subtotal)`);
        const orderId = orderResult.recordset[0].orderId;

        for (const item of items) {
          await transaction.request()
            .input("orderId", sql.Int, orderId)
            .input("itemId", sql.Int, item.itemId)
            .input("qty", sql.Int, item.qty)
            .input("priceAtOrder", sql.Decimal(10, 2), item.priceAtOrder)
            .query(`INSERT INTO OrderItems (orderId, itemId, qty, priceAtOrder)
                    VALUES (@orderId, @itemId, @qty, @priceAtOrder)`);
        }

        results.push({ orderId, stallId: stallOrder.stallId, status: "confirmed" });
      } catch (stallErr) {
        anyFailed = true;
        results.push({ stallId: stallOrder.stallId, status: "failed", reason: stallErr.message });

        // Record the failure itself as a row too, so it shows in order history.
        await transaction.request()
          .input("orderGroupId", sql.Int, orderGroupId)
          .input("stallId", sql.Int, stallOrder.stallId)
          .input("subtotal", sql.Decimal(10, 2), 0)
          .input("failReason", sql.VarChar, stallErr.message)
          .query(`INSERT INTO Orders (orderGroupId, stallId, status, subtotal, failReason)
                  VALUES (@orderGroupId, @stallId, 'failed', @subtotal, @failReason)`);
      }
    }

    await transaction.commit();
    return { orderGroupId, orders: results, anyFailed };
  } catch (err) {
    await transaction.rollback();
    throw err; // genuine group-level failure (e.g. DB connection dropped)
  }
}

async function getOrderGroupById(orderGroupId, customerId) {
  const pool = await getPool();

  const groupResult = await pool.request()
    .input("orderGroupId", sql.Int, orderGroupId)
    .query(`SELECT * FROM OrderGroups WHERE orderGroupId = @orderGroupId`);
  const group = groupResult.recordset[0];
  if (!group) return null;

  // IDOR check happens in the controller (compares group.customerId to
  // req.user.customerId) — model just returns the data.

  const ordersResult = await pool.request()
    .input("orderGroupId", sql.Int, orderGroupId)
    .query(`SELECT * FROM Orders WHERE orderGroupId = @orderGroupId`);

  // Attach items to each order.
  for (const order of ordersResult.recordset) {
    const itemsResult = await pool.request()
      .input("orderId", sql.Int, order.orderId)
      .query(`SELECT oi.itemId, oi.qty, oi.priceAtOrder, mi.name
              FROM OrderItems oi
              JOIN MenuItems mi ON mi.itemId = oi.itemId
              WHERE oi.orderId = @orderId`);
    order.items = itemsResult.recordset;
  }

  return { ...group, orders: ordersResult.recordset };
}

async function getRecentOrdersForCustomer(customerId, limit = 10) {
  const pool = await getPool();
  const result = await pool.request()
    .input("customerId", sql.Int, customerId)
    .input("limit", sql.Int, limit)
    .query(`SELECT TOP (@limit) * FROM OrderGroups
            WHERE customerId = @customerId
            ORDER BY createdAt DESC`);
  return result.recordset;
}

async function getOrderById(orderId) {
  const pool = await getPool();
  const result = await pool.request()
    .input("orderId", sql.Int, orderId)
    .query(`SELECT o.*, og.customerId
            FROM Orders o
            JOIN OrderGroups og ON og.orderGroupId = o.orderGroupId
            WHERE o.orderId = @orderId`);
  return result.recordset[0] || null;
}

// Allowed forward transitions — used to reject e.g. completed -> confirmed.
const VALID_TRANSITIONS = {
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
  failed: [],
};

async function updateOrderStatus(orderId, newStatus) {
  const pool = await getPool();
  const current = await getOrderById(orderId);
  if (!current) return { notFound: true };

  const allowed = VALID_TRANSITIONS[current.status] || [];
  if (!allowed.includes(newStatus)) {
    return { invalidTransition: true, from: current.status, to: newStatus };
  }

  await pool.request()
    .input("orderId", sql.Int, orderId)
    .input("status", sql.VarChar, newStatus)
    .query(`UPDATE Orders SET status = @status, updatedAt = GETDATE() WHERE orderId = @orderId`);

  return { success: true };
}

async function cancelOrder(orderId) {
  const pool = await getPool();
  const current = await getOrderById(orderId);
  if (!current) return { notFound: true };

  if (current.status !== "confirmed") {
    return { tooLate: true, status: current.status };
  }

  await pool.request()
    .input("orderId", sql.Int, orderId)
    .query(`UPDATE Orders SET status = 'cancelled', updatedAt = GETDATE() WHERE orderId = @orderId`);

  return { success: true };
}

module.exports = {
  createOrderGroup,
  getOrderGroupById,
  getRecentOrdersForCustomer,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};