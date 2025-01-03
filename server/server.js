require('dotenv').config();

const express = require('express');
const app = express();
const path = require("path");
const fs = require("fs");
const PORT = 3000;
const cors = require('cors');


// Middleware to parse JSON requests
app.use(express.json());

// Middleware to enable CORS
app.use(cors());

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
