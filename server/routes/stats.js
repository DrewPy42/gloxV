const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/stats/", async (req, res) => {
  if (req.query.id === undefined) {
    if (req.query.regen === 'true') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const titles_query = `SELECT title_id FROM series_title ORDER BY title_id`;

      db.query(titles_query, async (err, titles) => {
        if (err) {
          res.write(`data: ERROR\n\n`);
          res.end();
          return;
        }

        const totalRecords = titles.length;
        let processed = 0;

        for (const title of titles) {
          try {
            // 1. Generate stats
            const stats = await new Promise((resolve, reject) => {
              genTitleStats(title.title_id, (err, stats) => {
                if (err) return reject(err);
                resolve(stats);
              });
            });

            // 2. Calculate value gain
            stats.cgain = calculateValueGain(stats);

            // 3. Update database
            await new Promise((resolve, reject) => {
              updateTitleStats(title.title_id, stats, (err) => {
                if (err) return reject(err);
                resolve();
              });
            });

            // 4. Send progress update
            processed++;
            const percent = Math.round((processed / totalRecords) * 100);
            res.write(`data: ${percent}\n\n`);
          } catch (error) {
            console.error("Error processing title:", error);
            res.write(`data: ERROR\n\n`);
          }
        }

        // 5. Send completion message
        res.write(`data: complete\n\n`);
        res.end();
      });
    }
  } else {
    if (req.query.id === "all") {
      //we want to do every stat for every title
      getSeriesStats((err, stats) => {
        if (err) {
          res.status(500).json({ error: "Database error occurred" });
        }
        stats.cgain = calculateValueGain(stats);
        res.json(stats);
      });
    } else {
      //we want to do the stats for the selected title
      genTitleStats(req.query.id, (err, stats) => {
        if (err) {
          res.status(500).json({ error: "Database error occurred" });
        }
        stats.cgain = calculateValueGain(stats);
        updateTitleStats(req.query.id, stats);
        res.json(stats);
      });
    }
  }
});

function genTitleStats(id, callback) {
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
  if (stats.cprice === 0) return 0;
  return (stats.cvalue - stats.cprice) / stats.cprice;
}

function updateTitleStats(id, res, callback) {
  const query = `UPDATE series_title
                 SET copy_count = ?, series_cover_price = ?, series_value = ?,
                     issue_count = ?, volume_count = ?, series_value_change = ?
                 WHERE title_id = ?`;

  db.query(query, [res.copies, res.cprice, res.cvalue, res.issues, res.volumes, res.cgain, id], (err, results) => {
    if (err) {
      console.error("Error updating title stats:", err);
      return callback(err);
    }
    callback(null);
  });
}


function getSeriesStats(callback) {
  // get stats for every title
  const query = `SELECT count(title_id) as titles,
                        sum(copy_count) as copies,
                        sum(series_cover_price) as cprice,
                        sum(series_value) as cvalue,
                        sum(issue_count) as issues,
                        sum(volume_count) as volumes
                   FROM series_title`;
  Promise.all([
    new Promise((resolve, reject) => {
      db.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results[0]); // Extract first row
      });
    }),
  ])
    .then(([seriesStats]) => {
      callback(null, seriesStats);
    })
    .catch((error) => callback(error, null));
}

module.exports = { router };
