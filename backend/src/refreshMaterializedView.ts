import { Client as PgClient } from "pg";

export async function setupMaterializedView(
  symbol: string,
  intervalBucket: string,
  intervalName: string,
  pgClient: PgClient
) {
  const viewName = `price_${symbol.toLowerCase()}_${intervalName}_summary`;
  await pgClient.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName} AS
      SELECT symbol,
          time_bucket('${intervalBucket}', ts) AS bucket_time,
          AVG(bid) AS avg_bid,
          AVG(ask) AS avg_ask
      FROM price 
      WHERE symbol = '${symbol.toUpperCase()}'
      GROUP BY symbol, bucket_time
      WITH NO DATA;
  `);

  await pgClient.query(`REFRESH MATERIALIZED VIEW ${viewName};`);
  console.log(`Materialized view ${viewName} is set up and refreshed`);
}
