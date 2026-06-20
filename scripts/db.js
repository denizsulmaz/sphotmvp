// Reusable Supabase Postgres runner.
// Usage:
//   SUPA_PW='...' node scripts/db.js exec path/to/file.sql
//   SUPA_PW='...' node scripts/db.js query "select ..."
// Connection params are read from env with sane defaults for this project.
const fs = require("fs");
const { Client } = require("pg");

const cfg = {
  host: process.env.SUPA_HOST || "aws-1-ap-southeast-2.pooler.supabase.com",
  port: Number(process.env.SUPA_PORT || 5432),
  user: process.env.SUPA_USER || "postgres.jarhfsdjtosjpktypwcn",
  password: process.env.SUPA_PW,
  database: process.env.SUPA_DB || "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  statement_timeout: 120000,
};

async function main() {
  if (!cfg.password) throw new Error("SUPA_PW env var is required");
  const [, , mode, arg] = process.argv;
  const client = new Client(cfg);
  await client.connect();
  try {
    if (mode === "exec") {
      const sql = fs.readFileSync(arg, "utf8");
      const res = await client.query(sql);
      const arr = Array.isArray(res) ? res : [res];
      console.log("OK exec:", arg, "— statements:", arr.length);
    } else if (mode === "query") {
      const res = await client.query(arg);
      console.log(JSON.stringify(res.rows, null, 2));
    } else {
      throw new Error("mode must be 'exec <file>' or 'query <sql>'");
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("DB ERROR:", e.message);
  process.exit(1);
});
