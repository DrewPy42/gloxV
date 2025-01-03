//set up a reusable connection to the database using the environment variables and the mysql package
const mysql = require("mysql");
const connection = mysql.createConnection({
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

//connect to the database
connection.connect((err) => {
  if (err) {
    console.log('Connecting to MySQL with:', connection.config);
    console.error("An error occurred while connecting to the DB");
    throw err;
  }
  console.log("Connected to the database");
});

//export the connection so that it can be used in the routes
module.exports = connection;
