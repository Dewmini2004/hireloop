const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const connectDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR(255) NOT NULL,
      session_id VARCHAR(255) UNIQUE NOT NULL,
      job_role VARCHAR(255),
      overall_score INTEGER,
      grade VARCHAR(10),
      skill_scores JSONB,
      strengths JSONB,
      gaps JSONB,
      improvement_tips JSONB,
      hire_recommendation VARCHAR(50),
      summary TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Progress DB ready");
};
module.exports = { pool, connectDB };
