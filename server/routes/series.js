const express = require("express");
const router = express.Router();

router.get("/series", (req, res) => {
  res.send("This is the series page!");
});

module.exports = { router };
