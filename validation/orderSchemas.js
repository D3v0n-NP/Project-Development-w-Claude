/* =============================================================================
   validation/orderSchemas.js — Joi schemas for the Orders feature.
============================================================================= */

const Joi = require("joi");

// Matches the exact payload cart.js's placeOrder() sends.
const createOrderSchema = Joi.object({
  customerName: Joi.string().min(2).max(100).required(),
  customerPhone: Joi.string().pattern(/^[0-9 +()-]{6,20}$/).required()
    .messages({ "string.pattern.base": "Enter a valid phone number." }),
  customerEmail: Joi.string().email().allow(null, "").optional(),
  items: Joi.array().items(
    Joi.object({
      stallId: Joi.number().integer().positive().required(),
      itemId: Joi.number().integer().positive().required(),
      qty: Joi.number().integer().min(1).max(99).required(),
    })
  ).min(1).required().messages({ "array.min": "Your cart is empty." }),
});

// Matches PUT /api/orders/:orderId/status
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid("confirmed", "preparing", "ready", "completed", "cancelled")
    .required(),
});

module.exports = { createOrderSchema, updateStatusSchema };