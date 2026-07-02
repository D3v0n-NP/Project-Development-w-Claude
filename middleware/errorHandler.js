/* =============================================================================
   middleware/errorHandler.js — central error handler. Must be the LAST
   app.use() in app.js so it catches errors from every route/middleware before
   it via next(err) or asyncHandler.

   Never leaks stack traces to the client — logs them server-side only.
============================================================================= */

function errorHandler(err, req, res, next) {
  console.error(err.stack); // full detail server-side for debugging

  // Allow controllers to throw errors with a custom statusCode attached;
  // default to 500 for anything unexpected.
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? "Internal server error" : err.message;

  res.status(statusCode).json({ success: false, message });
}

module.exports = errorHandler;