const amqp = require("amqplib");
const { pool } = require("../models/db");

const connectRabbitMQ = async () => {
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    const channel = await conn.createChannel();
    await channel.assertQueue("evaluation_complete", { durable: true });
    
    channel.consume("evaluation_complete", async (msg) => {
      if (!msg) return;
      const data = JSON.parse(msg.content.toString());
      await pool.query(
        `INSERT INTO interview_results (user_id, session_id, job_role, overall_score, grade, skill_scores, strengths, gaps, improvement_tips, hire_recommendation, summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (session_id) DO UPDATE SET overall_score=EXCLUDED.overall_score`,
        [data.user_id, data.session_id, data.job_role, data.overall_score, data.grade,
         JSON.stringify(data.skill_scores), JSON.stringify(data.strengths),
         JSON.stringify(data.gaps), JSON.stringify(data.improvement_tips),
         data.hire_recommendation, data.summary]
      );
      channel.ack(msg);
      console.log(`✅ Saved evaluation for session ${data.session_id}`);
    });
    console.log("🐰 RabbitMQ consumer ready");
  } catch (err) {
    console.error("RabbitMQ error:", err.message);
    setTimeout(connectRabbitMQ, 5000);
  }
};
module.exports = { connectRabbitMQ };
