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

// --- Create the app --------------------------------------------------------
const app = express();

// --- Serve the front-end ---------------------------------------------------
// Expose everything inside /public to the browser. express.static automatically
// serves index.html for the site root ("/"), so visiting http://localhost:3000
// opens the login gate. Requests like /credit.html or /customer/stalls.html map
// straight to the matching file in /public.
app.use(express.static(path.join(__dirname, "public")));

/* ---------------------------------------------------------------------------
   BACK-END MOUNT POINTS  (added in the back-end chats — nothing wired up yet)
   ---------------------------------------------------------------------------
   // 1. Read JSON request bodies (needed before any API route):
   //      app.use(express.json());
   //
   // 2. Database connection:
   //      const { connectDB } = require("./config/db");
   //
   // 3. API routes (one router per feature), e.g.:
   //      app.use("/api/auth", require("./routes/authRoutes"));
   //      app.use("/api/menu", require("./routes/menuRoutes"));
   //
   // 4. Central error handler (keep this LAST so it catches everything):
   //      app.use((err, req, res, next) => { ... });
--------------------------------------------------------------------------- */

// --- Start the server ------------------------------------------------------
// Use the PORT from the environment if set, otherwise default to 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Hawker Hub is running — open http://localhost:${PORT}`);
});