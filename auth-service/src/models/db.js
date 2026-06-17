const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connectDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Auth DB connected & tables ready");
};
module.exports = { pool, connectDB };
