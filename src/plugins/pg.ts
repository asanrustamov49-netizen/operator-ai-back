import { Pool } from "pg";

export const pool = new Pool({
  database: process.env.DB_NAME || "operator-ai",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "1011",
});

pool.connect().then((client) => {
  console.log("DB connected");
});
