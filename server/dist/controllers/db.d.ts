import mysql, { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
declare const pool: Pool;
export declare function query<T extends RowDataPacket[]>(sql: string, params?: (string | number | boolean | null)[]): Promise<T>;
export declare function execute(sql: string, params?: (string | number | boolean | null)[]): Promise<ResultSetHeader>;
export { pool };
declare const _default: {
    query: typeof query;
    execute: typeof execute;
    pool: mysql.Pool;
};
export default _default;
//# sourceMappingURL=db.d.ts.map