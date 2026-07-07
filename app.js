/* =============================================================================
   app.js  —  Express entry point for the Singapore Hawker Centre Management
              System (SHCMS).

   WHAT IT DOES RIGHT NOW
   ----------------------
   One job: serve the front-end in /public through a real web server, so opening
   http://localhost:3000 loads your login gate (index.html) and every page,
   stylesheet and script resolves correctly. This is what lets the front-end run
   as it will in production (rather than double-clicking files).

   WHAT COMES LATER (in the back-end chats)
   ----------------------------------------
   The graded back-end is added to THIS file: the database connection, the API
   routes, request validation, authentication and a central error handler. The
   commented "mount points" below mark exactly where each piece slots in, so the
   structure is ready without any of that logic being written yet.

   NAMING / STYLE
   --------------
   CommonJS modules (require/module.exports) and camelCase, matching the rest of
   the back-end you'll write.
============================================================================= */

// --- Dependencies ----------------------------------------------------------
const express = require("express");          // the web-server framework
const path = require("path");                // builds safe cross-OS file paths
require("dotenv").config({ quiet: true});                   // load .env (DB creds, JWT secret) before anything else needs them

// --- Create the app --------------------------------------------------------
const app = express();
const {testConnection} = require("./config/db");
testConnection(); // exits the process immediately if the DB is unreachable

// --- Read JSON request bodies -----------------------------------------------
// Must come before express.static and before any API route — without this,
// req.body on POST/PUT requests (like POST /api/orders) is undefined.
app.use(express.json());

// --- Serve the front-end ---------------------------------------------------
// Expose everything inside /public to the browser. express.static automatically
// serves index.html for the site root ("/"), so visiting http://localhost:3000
// opens the login gate. Requests like /credit.html or /customer/stalls.html map
// straight to the matching file in /public.
app.use(express.static(path.join(__dirname, "public")));

// --- API routes --------------------------------------------------------------
// One router per feature. Mounted AFTER static + json parsing, BEFORE the
// error handler, so requests flow: static check → route match → error handler.
app.use("/api/orders", require("./routes/orderRoutes"));

// --- Central error handler ---------------------------------------------------
// MUST be the LAST app.use() — Express only recognises a 4-arg function
// (err, req, res, next) as an error handler, and it only catches errors from
// middleware/routes registered BEFORE it.
app.use(require("./middleware/errorHandler"));
// --- Start the server ------------------------------------------------------
// Use the PORT from the environment if set, otherwise default to 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hawker Hub is running — open http://localhost:${PORT}`);
});