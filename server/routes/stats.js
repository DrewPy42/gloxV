const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/stats", (req, res) => {
  if (req.query.id === undefined) {

  }
});

module.exports = { router };
