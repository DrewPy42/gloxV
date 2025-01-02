const express = require('express');
const app = express();
const path = require("path");
const fs = require("fs");
const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Dynamic route loading
const routersPath = path.join(__dirname, "routes");
fs.readdirSync(routersPath).forEach((file) => {
  if (file.endsWith(".js")) {
    const routerModule = require(path.join(routersPath, file));
    const router = routerModule.router;
    app.use(router);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}!!`);
});
