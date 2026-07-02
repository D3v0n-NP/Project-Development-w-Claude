/* =============================================================================
   middleware/asyncHandler.js — wraps async route handlers so any rejected
   promise (thrown error, failed await) is forwarded to next(err) automatically,
   instead of crashing the server or requiring a try/catch in every controller.
============================================================================= */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;