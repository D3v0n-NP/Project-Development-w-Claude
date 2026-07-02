/* =============================================================================
   controllers/orderController.js — request handling for /api/orders.
   Thin layer: reads req, calls orderModel, decides the HTTP status/shape.
============================================================================= */

const orderModel = require("../models/orderModel");

async function createOrder(req, res) {
  // customerId comes from the verified JWT, never from the request body —
  // a client could otherwise place an order "as" another customer.
  const customerId = req.user.customerId;

  const result = await orderModel.createOrderGroup(customerId, req.body);
  const statusCode = result.anyFailed ? 207 : 200;

  res.status(statusCode).json({
    success: !result.anyFailed,
    data: { orderGroupId: result.orderGroupId, orders: result.orders },
  });
}

async function getOrderGroup(req, res) {
  const orderGroupId = Number(req.params.orderGroupId);
  const group = await orderModel.getOrderGroupById(orderGroupId);

  if (!group) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  // IDOR check: only the owning customer can view it.
  if (group.customerId !== req.user.customerId) {
    return res.status(403).json({ success: false, message: "Not authorized to view this order" });
  }

  res.status(200).json({ success: true, data: group });
}

async function getMyRecentOrders(req, res) {
  const orders = await orderModel.getRecentOrdersForCustomer(req.user.customerId, 10);
  res.status(200).json({ success: true, count: orders.length, data: orders });
}

async function updateStatus(req, res) {
  const orderId = Number(req.params.orderId);
  const result = await orderModel.updateOrderStatus(orderId, req.body.status);

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  if (result.invalidTransition) {
    return res.status(409).json({
      success: false,
      message: `Cannot transition from ${result.from} to ${result.to}`,
    });
  }

  res.status(200).json({ success: true, data: { orderId, status: req.body.status } });
}

async function cancelOrder(req, res) {
  const orderId = Number(req.params.orderId);
  const result = await orderModel.cancelOrder(orderId);

  if (result.notFound) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  if (result.tooLate) {
    return res.status(409).json({
      success: false,
      message: `Order is already ${result.status} and cannot be cancelled`,
    });
  }

  res.status(200).json({ success: true, message: "Order cancelled" });
}

module.exports = { createOrder, getOrderGroup, getMyRecentOrders, updateStatus, cancelOrder };