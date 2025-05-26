/**
 * The mysql package is required to create a connection to the MySQL database.
 * @type {import('mysql')}
 */
const mysql = require("mysql");

/**
 * The MySQL connection object, configured using environment variables.
 * @type {import('mysql').Connection}
 */
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

/**
 * Connects to the MySQL database.
 * @param {Error|null} err - The error object if connection fails, otherwise null.
 * @returns {void}
 *
 * Reasoning: The callback receives an Error object or null, and does not return a value.
 */
connection.connect((err) => {
  if (err) {
    console.log('Connecting to MySQL with:', connection.config);
    console.error("An error occurred while connecting to the DB");
    throw err;
  }
  console.log("Connected to the database");
});

/**
 * Exports the MySQL connection object for use in other modules.
 * @type {import('mysql').Connection}
 */
module.exports = connection;