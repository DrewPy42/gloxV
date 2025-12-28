import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const poolConfig: PoolOptions = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool: Pool = mysql.createPool(poolConfig);

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
export async function query<T extends RowDataPacket[]>(
  sql: string, 
  params?: (string | number | boolean | null)[]
): Promise<T> {
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

// Helper function for insert/update/delete
export async function execute(
  sql: string, 
  params?: (string | number | boolean | null)[]
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

// Export pool for direct access if needed
export { pool };

export default { query, execute, pool };
