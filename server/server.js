const express = require('express');
const app = express();
const path = require("path");
const fs = require("fs")
const PORT = 3000;

app.use(express.json());

const routersPath = path.join(__dirname, "routes");

fs.readdirSync(routersPath).forEach((file) => {
  if (file.endsWith(".js")) {
    // dynamically import the router module
    const routerModule = require(path.join(routersPath, file));

    // get the "router" object exported by the router module
    const router = routerModule.router;

    // register the router
    app.use(router);
  }
});

// app.get('/', (req, res) => {
//   res.send('Hello from the backend!');
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
