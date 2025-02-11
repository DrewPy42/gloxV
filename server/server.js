const express = require('express');
const app = express();
const path = require("path");
const fs = require("fs");
const cors = require('cors');

const PORT = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Middleware to enable CORS
app.use(cors());

// Function to load routes dynamically
const loadRoutes = () => {
  const routersPath = path.join(__dirname, "routes");
  fs.readdirSync(routersPath).forEach((file) => {
    if (file.endsWith(".js")) {
      const routePath = path.join(routersPath, file);
      delete require.cache[require.resolve(routePath)]; // Clear cache
      const routerModule = require(routePath);
      app.use(routerModule.router);
    }
  });
};

// Load routes initially
loadRoutes();

// Watch for file changes and reload routes
fs.watch(path.join(__dirname, "routes"), (eventType, filename) => {
  if (filename && eventType === "change") {
    console.log(`Reloading routes due to changes in ${filename}`);
    loadRoutes();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
