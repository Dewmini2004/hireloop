/**
 * HireLoop Database Seeder
 * Populates auth-db and progress-db with realistic dummy data
 * Run with: node seed.js  (after npm install pg bcryptjs)
 */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// Connection strings — adjust ports if running outside Docker
const AUTH_DB = 'postgres://postgres:secret@localhost:5432/auth_db';
const PROGRESS_DB = 'postgres://postgres:secret@localhost:5433/progress_db';

const COMPANIES = [
  { name: 'TechNova Solutions', email: 'hr@technova.com', plan: 'growth', max_candidates: 200 },
  { name: '99x Technology', email: 'hr@99x.io', plan: 'enterprise', max_candidates: 500 },
  { name: 'Sysco LABS', email: 'hr@syscolabs.com', plan: 'starter', max_candidates: 50 },
];

const CANDIDATE_NAMES = [
  'Nimal Perera', 'Saman Kumara', 'Anjali Silva', 'Kasun Fernando', 'Dilani Rajapakse',
  'Tharindu Bandara', 'Ishara Wickramasinghe', 'Chamara Jayasuriya', 'Nadeesha Gunawardena',
  'Ruwan Senanayake', 'Hasini Mendis', 'Lahiru Dissanayake', 'Sachini Ratnayake',
  'Pavan Wijesinghe', 'Madushi Karunaratne'
];

const JOB_TITLES = [
  'Frontend Developer', 'Backend Engineer', 'Full Stack Developer',
  'DevOps Engineer', 'Data Analyst', 'QA Engineer', 'Mobile App Developer'
];

const RECOMMENDATIONS = ['strong_yes', 'yes', 'maybe', 'no'];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomScore() { return Math.floor(Math.random() * 60) + 40; } // 40-100
function randomDate(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d;
}

async function seed() {
  const authClient = new Client({ connectionString: AUTH_DB });
  const progressClient = new Client({ connectionString: PROGRESS_DB });

  await authClient.connect();
  await progressClient.connect();
  console.log('✅ Connected to both databases');

  // ── 1. Create Companies + HR users ──────────────────────
  const companyIds = [];
  for (const c of COMPANIES) {
    const existing = await authClient.query('SELECT id FROM companies WHERE email=$1', [c.email]);
    let companyId;
    if (existing.rows.length) {
      companyId = existing.rows[0].id;
      console.log(`↪ Company exists: ${c.name}`);
    } else {
      const result = await authClient.query(
        'INSERT INTO companies (name,email,plan,max_candidates) VALUES ($1,$2,$3,$4) RETURNING id',
        [c.name, c.email, c.plan, c.max_candidates]
      );
      companyId = result.rows[0].id;
      const hashed = await bcrypt.hash('hr123456', 12);
      await authClient.query(
        "INSERT INTO users (name,email,password,role,company_id) VALUES ($1,$2,$3,'hr',$4) ON CONFLICT (email) DO NOTHING",
        [c.name + ' HR', c.email, hashed, companyId]
      );
      console.log(`✅ Created company: ${c.name} (HR login: ${c.email} / hr123456)`);
    }
    companyIds.push({ id: companyId, name: c.name });
  }

  // ── 2. Create Candidates (some linked to companies, some independent) ──
  const candidateIds = [];
  for (let i = 0; i < CANDIDATE_NAMES.length; i++) {
    const name = CANDIDATE_NAMES[i];
    const email = name.toLowerCase().replace(/\s+/g, '.') + '@example.com';
    const existing = await authClient.query('SELECT id FROM users WHERE email=$1', [email]);
    let userId;
    if (existing.rows.length) {
      userId = existing.rows[0].id;
    } else {
      const hashed = await bcrypt.hash('candidate123', 12);
      // ~60% linked to a random company, 40% independent
      const company = Math.random() < 0.6 ? randomFrom(companyIds) : null;
      const result = await authClient.query(
        "INSERT INTO users (name,email,password,role,company_id,created_at) VALUES ($1,$2,$3,'candidate',$4,$5) RETURNING id",
        [name, email, hashed, company ? company.id : null, randomDate(60)]
      );
      userId = result.rows[0].id;
    }
    const company = companyIds.find(c => true); // just for reference below
    candidateIds.push({ id: userId, name, email });
  }
  console.log(`✅ Seeded ${candidateIds.length} candidates (password: candidate123)`);

  // Re-fetch with company_id for accurate session seeding
  const allCandidates = await authClient.query("SELECT id,name,company_id FROM users WHERE role='candidate'");

  // ── 3. Create Interview Results in progress_db ──────────
  let sessionCount = 0;
  for (const candidate of allCandidates.rows) {
    const numInterviews = Math.floor(Math.random() * 3) + 1; // 1-3 interviews each
    for (let j = 0; j < numInterviews; j++) {
      const sessionId = `seed-${candidate.id}-${j}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      const score = randomScore();
      const rec = score >= 80 ? 'strong_yes' : score >= 65 ? 'yes' : score >= 50 ? 'maybe' : 'no';
      const jobTitle = randomFrom(JOB_TITLES);
      const createdAt = randomDate(30);

      const evaluation = {
        overall_score: score,
        hire_recommendation: rec,
        summary: `Candidate showed ${score >= 70 ? 'strong' : 'developing'} understanding of core concepts for the ${jobTitle} role, with room to grow in some technical areas.`,
        strengths: ['Clear communication', 'Good problem-solving approach', 'Relevant project experience'],
        improvement_areas: ['Could go deeper on system design', 'Needs more practice with edge cases'],
        per_answer_scores: [
          { question: 'Tell me about a challenging project you worked on', score: Math.floor(score/10), feedback: 'Solid structure, could add more metrics', what_was_missing: 'Quantifiable impact' },
          { question: 'How do you approach debugging a production issue?', score: Math.floor(score/10)-1, feedback: 'Good systematic approach', what_was_missing: 'Mention of monitoring tools' },
        ],
        skill_gap_analysis: {
          strong_skills: ['JavaScript', 'Problem Solving'],
          weak_skills: ['System Design'],
          missing_skills: score < 60 ? ['Testing', 'CI/CD'] : []
        },
        recommended_resources: [
          { topic: 'System Design Basics', resource_type: 'course', suggestion: 'Take a system design fundamentals course' }
        ]
      };

      await progressClient.query(
        `INSERT INTO interview_results (session_id,user_id,user_name,company_id,job_title,overall_score,hire_recommendation,evaluation,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (session_id) DO NOTHING`,
        [sessionId, candidate.id, candidate.name, candidate.company_id, jobTitle, score, rec, JSON.stringify(evaluation), createdAt]
      );
      sessionCount++;
    }

    // Streak data
    const totalInterviews = numInterviews;
    const badges = [];
    if (totalInterviews >= 1) badges.push('first_interview');
    if (totalInterviews >= 3) badges.push('dedicated');
    await progressClient.query(
      `INSERT INTO user_streaks (user_id,current_streak,longest_streak,last_interview_date,total_interviews,badges)
       VALUES ($1,$2,$3,CURRENT_DATE,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET total_interviews=$4, badges=$5`,
      [candidate.id, Math.floor(Math.random()*5)+1, Math.floor(Math.random()*10)+1, totalInterviews, JSON.stringify(badges)]
    );
  }
  console.log(`✅ Seeded ${sessionCount} interview sessions with evaluations`);

  await authClient.end();
  await progressClient.end();
  console.log('\n🎉 Done! Refresh your dashboards to see data.\n');
  console.log('Login credentials:');
  console.log('  Admin:     admin@hireloop.com / admin123');
  console.log('  HR (any):  hr@technova.com / hr123456  (or hr@99x.io, hr@syscolabs.com)');
  console.log('  Candidate: nimal.perera@example.com / candidate123  (or any seeded name)');
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
