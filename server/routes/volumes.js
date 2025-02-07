const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/volume", (req, res) => {
  const baseQuery = `SELECT
                         volume_id,
                         title_id,
                         volume_number,
                         issue_range,
                         start_date,
                         end_date,
                         missing_issues,
                         notes
                            FROM series_volume`;
  let queryString = ``;
  const id = req.query.id;
  if (id === undefined) {
    if (req.query.title_id) {
      queryString = `${baseQuery}
                    WHERE title_id = ${req.query.title_id}
                    ORDER BY volume_number`;
    } else {
      const limit = req.query.limit || 25;
      const page = req.query.page || 1;
      const offset = (page - 1) * limit;
      queryString = `${baseQuery}
                    ORDER BY volume_number
                    LIMIT ${limit} OFFSET ${offset}`;
    }
  } else {
    queryString = `${baseQuery}
                    WHERE volume_id = ${id}
                    ORDER BY volume_number`;
  }
  const queryCount = `SELECT COUNT(*) as total
                        FROM series_volume`;
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
