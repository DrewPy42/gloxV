const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/stats/", (req, res) => {
  if (req.query.id === undefined) {
    //we want to do every stat for every title
  } else {
    //we want to do the stats for the selected title
    getTitleStats(req.query.id, (err, stats) => {
      if (err) {
        res.status(500).json({ error: "Database error occurred" });
      }
      stats.cgain = calculateValueGain(stats);
      updateTitleStats(req.query.id, stats);
      res.json(stats);
    });
  }
});

function getTitleStats(id, callback) {
  const copy_query = `SELECT COUNT(sc.copy_id) AS copies,
                              SUM(sc.issue_price) AS cprice,
                              SUM(sc.current_value) AS cvalue
                      FROM series_copy sc
                      INNER JOIN series_issue si ON si.issue_id = sc.issue_id
                      WHERE si.title_id = ?`;

  const issue_query = `SELECT COUNT(issue_id) AS issues
                        FROM series_issue
                        WHERE title_id = ?`;

  const volume_query = `SELECT COUNT(volume_id) AS volumes
                        FROM series_volume
                        WHERE title_id = ?`;

  // Run both queries in parallel
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(copy_query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]); // Extract first row
      });
    }),
    new Promise((resolve, reject) => {
      db.query(issue_query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]); // Extract first row
      });
    }),
    new Promise((resolve, reject) => {
      db.query(volume_query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]); // Extract first row
      });
    }),
  ])
    .then(([copyStats, issueStats, volumeStats]) => {
      const combinedStats = { ...copyStats, ...issueStats, ...volumeStats };
      callback(null, combinedStats); // Pass data to callback
    })
    .catch((error) => callback(error, null));
}

function calculateValueGain(stats) {
  //to calculate the value gain we need to use the following equation
  //value gain = (current value - cost) / cost
  return (stats.cvalue - stats.cprice) / stats.cprice;
}

function updateTitleStats(id, res) {
  // Update stats for a single title
  const query = `UPDATE series_title
                  SET copy_count = ?,
                      series_cover_price = ?,
                      series_value = ?,
                      issue_count = ?,
                      volume_count = ?,
                      series_value_change = ?
                  WHERE title_id = ?`;
  db.query(query, [res.copies, res.cprice, res.cvalue, res.issues, res.volumes, res.cgain, id], (err, results) => {
    if (err) {
      console.error("Error updating title stats:", err);
      res.status(500).json({ error: "Database error occurred" });
    }
  })
}


module.exports = { router };
