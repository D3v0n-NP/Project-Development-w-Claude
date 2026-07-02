/* =============================================================================
   routes/orderRoutes.js — maps HTTP verb + path to controller functions.
   Mounted in app.js as: app.use("/api/orders", require("./routes/orderRoutes"));
============================================================================= */

const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validateMiddleware");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { createOrderSchema, updateStatusSchema } = require("../validation/orderSchemas");

// POST /api/orders — create (fan-out across stalls, 200 or 207)
router.post("/", verifyToken, validate(createOrderSchema), asyncHandler(orderController.createOrder));

// GET /api/orders/:orderGroupId — read one order group (owner only)
router.get("/:orderGroupId", verifyToken, asyncHandler(orderController.getOrderGroup));

// PUT /api/orders/:orderId/status — vendor/operator advances a single stall-order
router.put(
  "/:orderId/status",
  verifyToken,
  requireRole("vendor", "operator"),
  validate(updateStatusSchema),
  asyncHandler(orderController.updateStatus)
);

// DELETE /api/orders/:orderId — cancel, only while still "confirmed"
router.delete("/:orderId", verifyToken, asyncHandler(orderController.cancelOrder));

module.exports = router;