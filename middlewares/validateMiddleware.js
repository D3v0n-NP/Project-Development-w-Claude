/* =============================================================================
   middleware/validateMiddleware.js — generic Joi validation wrapper.

   Usage in routes:
     router.post("/", validate(createOrderSchema), orderController.createOrder);

   Runs the Joi schema against req.body. On failure, responds 400 with a field-
   by-field error map (matching the { success:false, message, errors:{} } shape
   your front-end already expects, e.g. cart.js's validateCheckoutForm).
============================================================================= */

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      // Build a { fieldName: "message" } map from Joi's detail array.
      const errors = {};
      error.details.forEach((detail) => {
        const field = detail.path.join(".");
        errors[field] = detail.message;
      });
      return res.status(400).json({ success: false, message: "Validation error", errors });
    }
    next();
  };
}

module.exports = validate;