const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/series", (req, res) => {
  const baseQuery = `SELECT title_id,
                          title,
                          issn,
                          sort_title,
                          limited_series,
                          comic_age_id,
                          series_cover_price,
                          series_value,
                          series_value_change,
                          volume_count,
                          issue_count,
                          copy_count,
                          new_title_id,
                          previous_title_id,
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
                   ORDER BY COALESCE(sort_title, title)
                   LIMIT ${limit} OFFSET ${offset}`;
  } else {
    queryString = `${baseQuery}
                   WHERE title_id = ${id}
                   ORDER BY COALESCE(sort_title, title)`;
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
