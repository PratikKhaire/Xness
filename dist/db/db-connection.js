"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPgClient = getPgClient;
const pg_1 = require("pg");
function getPgClient(p0) {
    return new pg_1.Client({
        user: "postgres",
        password: "admin@123",
        database: "postgres",
        host: "localhost",
        port: 5432,
    });
}
//# sourceMappingURL=db-connection.js.map