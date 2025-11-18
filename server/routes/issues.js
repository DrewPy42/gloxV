const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/issues", (req, res) => {
  const baseQuery = `SELECT i.issue_id,
                            i.title_id,
                            i.issue_number,
                            v.volume_number,
                            i.volume_id,
                            i.issue_date,
                            i.cover_info,
                            i.issue_title,
                            i.crossover_title,
                            i.crossover_part,
                            i.issue_notes,
                            i.cover_art_file,
                            i.copy_count,
                            i.issue_price,
                            i.issue_value,
                            i.created_date,
                            i.modified_date,
                            i.issue_notes
                    FROM series_issue i
                        INNER JOIN series_volume v ON v.volume_id = i.volume_id`

  let queryString = ``;

  const id = req.query.id;
  if (id === undefined) {
    if (req.query.volume_id) {
      queryString = `${baseQuery}
                    WHERE i.volume_id = ${req.query.volume_id}
                    ORDER BY i.issue_number`;
      } else if (req.query.title_id) {
      queryString = `${baseQuery}
                    WHERE i.title_id = ${req.query.title_id}
                    ORDER BY i.issue_number`;
      }
  } else {
    queryString = `${baseQuery}
                    WHERE i.issue_id = ${id}
                    ORDER BY i.issue_number`;
  }

  const queryCount = `SELECT COUNT(*) as total
                        FROM series_issue i
                        INNER JOIN series_volume v ON v.volume_id = i.volume_id`;
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
