const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/series", (req, res) => {
  //connect to the mysql database and return the series_title records
  //need to add the ORDER BY clause to sort the records
  //as well as the limit and page number to limit the number of records returned
  //also need to add the WHERE clause to filter the records
  //also need to add the COUNT(*) to return the total number of records
  const baseQuery = `SELECT title_id,
                          title,
                          issn,
                          limited_series,
                          comicage_id,
                          series_price,
                          series_value,
                          series_value_gain,
                          volume_count,
                          issue_count,
                          copy_count,
                          p.publisher_id,
                          publisher_name,
                          logo,
                          website
                   FROM series_title t
                            LEFT JOIN publisher p ON t.publisher_id = p.publisher_id`;

  let queryString = ``;

  const id = req.query.id;
  if (id === undefined) {
    const limit = req.query.limit || 25;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;
    queryString = `${baseQuery}
                   ORDER BY title
                   LIMIT ${limit} OFFSET ${offset}`;
  } else {
    queryString = `${baseQuery}
                   WHERE title_id = ${id}
                   ORDER BY title`;
  }

  const queryCount = `SELECT COUNT(*) as total
                        FROM series_title`;
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
