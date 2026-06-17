const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4005;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const initDB = async () => {
  for (let i = 0; i < 10; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ DB connected');
      break;
    } catch (err) {
      console.log(`⏳ Waiting for DB... (${i+1}/10)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS interview_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id VARCHAR(255) UNIQUE NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      user_name VARCHAR(255),
      company_id VARCHAR(255),
      job_title VARCHAR(255) NOT NULL,
      overall_score INTEGER NOT NULL,
      hire_recommendation VARCHAR(50),
      evaluation JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS user_streaks (
      user_id VARCHAR(255) PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_interview_date DATE,
      total_interviews INTEGER DEFAULT 0,
      badges JSONB DEFAULT '[]'
    );
  `);
  console.log('✅ Progress DB initialized');
};

app.get('/health', (req, res) => res.json({ status: 'Progress Service OK' }));

app.post('/sessions', async (req, res) => {
  const { session_id, user_id, user_name, company_id, job_title, evaluation } = req.body;
  try {
    await pool.query(
      `INSERT INTO interview_results (session_id,user_id,user_name,company_id,job_title,overall_score,hire_recommendation,evaluation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (session_id) DO UPDATE SET evaluation=$8`,
      [session_id, user_id, user_name||null, company_id||null, job_title, evaluation.overall_score, evaluation.hire_recommendation, JSON.stringify(evaluation)]
    );
    await updateStreak(user_id);
    await updateBadges(user_id, evaluation.overall_score);
    res.status(201).json({ message: 'Saved' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

app.get('/dashboard/:userId', async (req, res) => {
  const { userId } = req.params;
  const results = await pool.query(
    'SELECT id,session_id,job_title,overall_score,hire_recommendation,created_at FROM interview_results WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
    [userId]
  );
  const streak = await pool.query('SELECT * FROM user_streaks WHERE user_id=$1', [userId]);
  const avg = await pool.query('SELECT AVG(overall_score)::INTEGER as avg FROM interview_results WHERE user_id=$1', [userId]);
  res.json({
    sessions: results.rows,
    streak: streak.rows[0] || { current_streak:0, total_interviews:0, badges:[] },
    average_score: avg.rows[0]?.avg || 0,
    total_sessions: results.rows.length
  });
});

app.get('/sessions/:sessionId', async (req, res) => {
  const result = await pool.query('SELECT * FROM interview_results WHERE session_id=$1', [req.params.sessionId]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

app.get('/admin/stats', async (req, res) => {
  const [total, avg, today, rec] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM interview_results'),
    pool.query('SELECT AVG(overall_score)::INTEGER as avg FROM interview_results'),
    pool.query("SELECT COUNT(*) FROM interview_results WHERE created_at >= NOW() - INTERVAL '24 hours'"),
    pool.query("SELECT hire_recommendation, COUNT(*) as count FROM interview_results GROUP BY hire_recommendation"),
  ]);
  res.json({
    total_interviews: parseInt(total.rows[0].count),
    avg_score: avg.rows[0].avg || 0,
    interviews_today: parseInt(today.rows[0].count),
    recommendations: rec.rows,
  });
});

app.get('/admin/sessions', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const result = await pool.query(
    'SELECT id,session_id,user_id,user_name,company_id,job_title,overall_score,hire_recommendation,created_at FROM interview_results ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  res.json({ sessions: result.rows });
});

app.get('/admin/daily', async (req, res) => {
  const result = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM interview_results
    WHERE created_at >= NOW() - INTERVAL '14 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  res.json(result.rows);
});

app.get('/company/:companyId/sessions', async (req, res) => {
  const { companyId } = req.params;
  const sessions = await pool.query(
    'SELECT id,session_id,user_id,user_name,job_title,overall_score,hire_recommendation,created_at FROM interview_results WHERE company_id=$1 ORDER BY created_at DESC',
    [companyId]
  );
  const stats = await pool.query(`
    SELECT
      AVG(overall_score)::INTEGER as avg_score,
      COUNT(*) as total,
      COUNT(CASE WHEN hire_recommendation IN ('yes','strong_yes') THEN 1 END) as qualified
    FROM interview_results WHERE company_id=$1
  `, [companyId]);
  res.json({ sessions: sessions.rows, stats: stats.rows[0] });
});

async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0];
  const existing = await pool.query('SELECT * FROM user_streaks WHERE user_id=$1', [userId]);
  if (!existing.rows.length) {
    await pool.query('INSERT INTO user_streaks (user_id,current_streak,longest_streak,last_interview_date,total_interviews) VALUES ($1,1,1,$2,1)', [userId, today]);
    return;
  }
  const s = existing.rows[0];
  const diff = s.last_interview_date ? Math.floor((new Date(today)-new Date(s.last_interview_date))/(1000*60*60*24)) : 999;
  const newStreak = diff===1 ? s.current_streak+1 : diff===0 ? s.current_streak : 1;
  await pool.query(
    'UPDATE user_streaks SET current_streak=$1,longest_streak=$2,last_interview_date=$3,total_interviews=total_interviews+1 WHERE user_id=$4',
    [newStreak, Math.max(newStreak,s.longest_streak), today, userId]
  );
}

async function updateBadges(userId, score) {
  const s = await pool.query('SELECT * FROM user_streaks WHERE user_id=$1', [userId]);
  if (!s.rows.length) return;
  const { total_interviews, current_streak, badges } = s.rows[0];
  const b = [...(badges||[])];
  if (total_interviews===1 && !b.includes('first_interview')) b.push('first_interview');
  if (score>=80 && !b.includes('high_scorer')) b.push('high_scorer');
  if (current_streak>=7 && !b.includes('week_streak')) b.push('week_streak');
  if (total_interviews>=10 && !b.includes('dedicated')) b.push('dedicated');
  await pool.query('UPDATE user_streaks SET badges=$1 WHERE user_id=$2', [JSON.stringify(b), userId]);
}

app.listen(PORT, () => {
  console.log(`📈 Progress Service running on port ${PORT}`);
  initDB().catch(console.error);
});