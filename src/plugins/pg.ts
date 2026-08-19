import { Pool } from "pg";

export const pool = new Pool({
  database: "operator-ai",
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "1011",
});

pool.connect().then(() => {
  console.log("DB connected");
});
