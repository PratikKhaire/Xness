import { Client as PgClient } from "pg";

export function getPgClient(p0: { user: string; host: string; database: string; password: string; port: number; }) {
    return new PgClient({
      user: "postgres",
      password: "admin@123",
      database: "postgres",
      host: "localhost",
      port: 5432,
    });
}

export const pgClient = new PgClient({
  user: "postgres",
  password: "admin@123",
  database: "postgres",
  host: "localhost",
  port: 5432,
});