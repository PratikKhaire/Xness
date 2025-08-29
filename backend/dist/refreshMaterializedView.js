"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupMaterializedView = setupMaterializedView;
async function setupMaterializedView(symbol, intervalBucket, intervalName, pgClient) {
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
//# sourceMappingURL=refreshMaterializedView.js.map