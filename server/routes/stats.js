const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/stats", (req, res) => {
  if (req.query.id === undefined) {
    //we want to do every stat for every title
  } else {
    //we want to do the stats for the selected title
    getTitleStats(req.query.id, res);
    res.json({ title: req.query.id });
  }
});

function getTitleStats(id, res) {
  const copy_query = `SELECT COUNT(sc.copy_id) AS copies,
                                SUM(sc.issue_price) AS cprice,
                                    SUM(sc.current_value) AS cvalue
                            FROM series_copy sc
                            INNER JOIN series_issue si ON si.issue_id = sc.issue_id
                            WHERE si.title_id = ?`;
  // const issue_query = `SELECT COUNT(issue_id) AS issues,
  //                                   SUM(issue_price) AS iprice,
  //                                   SUM(current_value) AS ivalue
  //                           FROM series_issue
  //                           WHERE title_id = ?`;
  const copy_stats = db.query(copy_query, [id], (err, results) => {
    if (err) {
      console.error("An error occurred while executing the query");
      throw err;
    }
    res.json(results);
  });
  const volume_query = `SELECT COUNT(volume_id) AS volumes
                            FROM series_volume
                            WHERE title_id = ?`;
  const volume_stats = db.query(volume_query, [id], (err, results) => {
    if (err) {
      console.error("An error occurred while executing the query");
      throw err;
    }
    return results;
  });
  console.log(copy_stats);
}

module.exports = { router };
