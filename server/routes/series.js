const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/series", (req, res) => {
  //connect to the mysql database and return the series_title records
  //need to add the ORDER BY clause to sort the records
  //as well as the limit and page number to limit the number of records returned
  const limit = req.query.limit || 25;
  const page = req.query.page || 1;
  const offset = (page - 1) * limit;
  const queryString = `SELECT * FROM series_title ORDER BY title LIMIT ${limit} OFFSET ${offset}`;
  const queryCount = `SELECT COUNT(*) as total FROM series_title`;
  db.query(queryString, (err, results) => {
    if (err) {
      console.error("An error occurred while executing the query");
      throw err;
    }
    db.query(queryCount, (err, count) => {
      if (err) {
        console.error("An error occurred while executing the query");
        throw err;
      }
      res.json({ results, count });
    });
  });

});

module.exports = { router };
