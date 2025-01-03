const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/series", (req, res) => {
  // res.json([
  //   { id: 1, name: "Breaking Bad" },
  //   { id: 2, name: "Game of Thrones" },
  //   { id: 3, name: "The Mandalorian" },
  // ]);
  //connect to the mysql database and return the series_title records
  db.query("SELECT * FROM series_title ORDER BY title", (err, results) => {
    if (err) {
      console.error("An error occurred while executing the query");
      throw err;
    }
    res.json(results);
  });

});

module.exports = { router };
