const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('redis');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.connect().catch(console.error);

// ─── DB Init with retry ───────────────────────────────────
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
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'candidate',
      company_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      plan VARCHAR(50) DEFAULT 'trial',
      max_candidates INTEGER DEFAULT 50,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      email VARCHAR(255) NOT NULL,
      job_title VARCHAR(255),
      token VARCHAR(255) UNIQUE NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const admin = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (!admin.rows.length) {
    const hashed = await bcrypt.hash('admin123', 12);
    await pool.query(
      "INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,'admin')",
      ['Admin', 'admin@hireloop.com', hashed]
    );
    console.log('✅ Default admin created: admin@hireloop.com / admin123');
  }
  console.log('✅ Auth DB initialized');
};

// ─── Auth Middleware ──────────────────────────────────────
const authGuard = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ error: 'Token revoked' });
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

// ─── Routes ───────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'Auth Service OK' }));

app.post('/register', async (req, res) => {
  const { name, email, password, invite_token } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(409).json({ error: 'Email already registered' });

    let company_id = null;
    let role = 'candidate';

    if (invite_token) {
      const invite = await pool.query('SELECT * FROM invites WHERE token=$1 AND used=false', [invite_token]);
      if (invite.rows.length) {
        company_id = invite.rows[0].company_id;
        await pool.query('UPDATE invites SET used=true WHERE token=$1', [invite_token]);
      }
    }

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name,email,password,role,company_id) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,company_id',
      [name, email, hashed, role, company_id]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, company_id: user.company_id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account suspended' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role, company_id: user.company_id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id }, token });
  } catch { res.status(500).json({ error: 'Login failed' }); }
});

app.post('/logout', authGuard, async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  await redis.setEx(`blacklist:${token}`, 7*24*3600, '1');
  res.json({ message: 'Logged out' });
});

app.get('/verify', authGuard, (req, res) => res.json({ valid: true, user: req.user }));

app.get('/profile', authGuard, async (req, res) => {
  const r = await pool.query('SELECT id,name,email,role,company_id,created_at FROM users WHERE id=$1', [req.user.id]);
  res.json(r.rows[0]);
});

// ─── Admin Routes ─────────────────────────────────────────
app.get('/admin/stats', authGuard, requireRole('admin'), async (req, res) => {
  const [users, companies, active] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE role='candidate'"),
    pool.query("SELECT COUNT(*) FROM companies"),
    pool.query("SELECT COUNT(*) FROM users WHERE is_active=true AND role='candidate'"),
  ]);
  res.json({
    total_users: parseInt(users.rows[0].count),
    total_companies: parseInt(companies.rows[0].count),
    active_users: parseInt(active.rows[0].count),
  });
});

app.get('/admin/users', authGuard, requireRole('admin'), async (req, res) => {
  const result = await pool.query('SELECT id,name,email,role,is_active,company_id,created_at FROM users ORDER BY created_at DESC LIMIT 50');
  res.json({ users: result.rows });
});

app.patch('/admin/users/:id/toggle', authGuard, requireRole('admin'), async (req, res) => {
  await pool.query('UPDATE users SET is_active = NOT is_active WHERE id=$1', [req.params.id]);
  res.json({ message: 'Toggled' });
});

app.get('/companies', authGuard, requireRole('admin'), async (req, res) => {
  const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/companies', authGuard, requireRole('admin'), async (req, res) => {
  const { name, email, plan, max_candidates } = req.body;
  try {
    const comp = await pool.query(
      'INSERT INTO companies (name,email,plan,max_candidates) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, email, plan||'trial', max_candidates||50]
    );
    const company = comp.rows[0];
    const tempPass = Math.random().toString(36).slice(-8);
    const hashed = await bcrypt.hash(tempPass, 12);
    await pool.query(
      "INSERT INTO users (name,email,password,role,company_id) VALUES ($1,$2,$3,'hr',$4)",
      [name+' HR', email, hashed, company.id]
    );
    res.status(201).json({ ...company, hr_temp_password: tempPass });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Company/HR Routes ────────────────────────────────────
app.get('/company/stats', authGuard, requireRole('hr','admin'), async (req, res) => {
  const company_id = req.user.company_id;
  const [candidates, invites, company] = await Promise.all([
    pool.query("SELECT COUNT(*) FROM users WHERE company_id=$1 AND role='candidate'", [company_id]),
    pool.query("SELECT COUNT(*) FROM invites WHERE company_id=$1", [company_id]),
    pool.query('SELECT * FROM companies WHERE id=$1', [company_id]),
  ]);
  res.json({
    company: company.rows[0],
    total_candidates: parseInt(candidates.rows[0].count),
    total_invites: parseInt(invites.rows[0].count),
  });
});

app.get('/company/candidates', authGuard, requireRole('hr','admin'), async (req, res) => {
  const result = await pool.query(
    "SELECT id,name,email,created_at FROM users WHERE company_id=$1 AND role='candidate' ORDER BY created_at DESC",
    [req.user.company_id]
  );
  res.json(result.rows);
});

app.post('/company/invite', authGuard, requireRole('hr','admin'), async (req, res) => {
  const { email, job_title } = req.body;
  const token = require('crypto').randomBytes(32).toString('hex');
  await pool.query(
    'INSERT INTO invites (company_id,email,job_title,token) VALUES ($1,$2,$3,$4)',
    [req.user.company_id, email, job_title, token]
  );
  const invite_link = `${process.env.FRONTEND_URL||'http://localhost:3000'}/register?invite=${token}`;
  res.json({ invite_link, token, email, job_title });
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🔐 Auth Service running on port ${PORT}`);
  initDB().catch(console.error);
});