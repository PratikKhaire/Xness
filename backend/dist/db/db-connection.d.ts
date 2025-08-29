import { Client as PgClient } from "pg";
export declare function getPgClient(p0: {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
}): PgClient;
export declare const pgClient: PgClient;
//# sourceMappingURL=db-connection.d.ts.map