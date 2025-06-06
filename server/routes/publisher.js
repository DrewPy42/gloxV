const express = require("express");
const router = express.Router();
const db = require("../controllers/db");

router.get("/api/publisher", (req, res) => {
  const baseQuery = `SELECT
                        publisher_id,
                        publisher_name,
                        logo,
                        website
                            FROM publisher`;
  let queryString = ``;
  const id = req.query.id;
  if (id === undefined) {
    if (req.query.getall) {
      queryString = `${baseQuery}
                    ORDER BY publisher_name`;
    } else {
      const limit = req.query.limit || 25;
      const page = req.query.page || 1;
      const offset = (page - 1) * limit;
      queryString = `${baseQuery}
                    ORDER BY publisher_name
                    LIMIT ${limit} OFFSET ${offset}`;
    }
  } else {
    queryString = `${baseQuery}
                    WHERE publisher_id = ${id}
                    ORDER BY publisher_name`;
  }
  const queryCount = `SELECT COUNT(*) as total
                        FROM publisher`;
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
