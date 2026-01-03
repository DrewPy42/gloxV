"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.execute = execute;
const promise_1 = __importDefault(require("mysql2/promise"));
const poolConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};
const pool = promise_1.default.createPool(poolConfig);
exports.pool = pool;
// Test connection on startup
pool.getConnection()
    .then(connection => {
    console.log('Connected to the database');
    connection.release();
})
    .catch(err => {
    console.error('An error occurred while connecting to the DB:', err);
    throw err;
});
// Helper function for queries that return rows
async function query(sql, params) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
// Helper function for insert/update/delete
async function execute(sql, params) {
    const [result] = await pool.execute(sql, params);
    return result;
}
exports.default = { query, execute, pool };
//# sourceMappingURL=db.js.map