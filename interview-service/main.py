from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import asyncpg
import aio_pika
import json
import uuid
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HireLoop Interview Service")

# Groq uses OpenAI-compatible API
client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "openai/gpt-oss-120b"

class StartInterviewRequest(BaseModel):
    user_id: str
    job_title: str
    question_bank: list[dict]
    user_name: str

class AnswerRequest(BaseModel):
    session_id: str
    question_id: str
    answer: str
    conversation_history: list[dict]

async def get_db():
    return await asyncpg.connect(os.getenv("DATABASE_URL"))

@app.on_event("startup")
async def startup():
    conn = await get_db()
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS interview_sessions (
            id UUID PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            job_title VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            questions JSONB NOT NULL,
            answers JSONB DEFAULT '[]',
            started_at TIMESTAMP DEFAULT NOW(),
            ended_at TIMESTAMP
        )
    """)
    await conn.close()
    print("✅ Interview DB initialized")

@app.get("/health")
def health():
    return {"status": "Interview Service OK"}

@app.post("/start")
async def start_interview(req: StartInterviewRequest):
    session_id = str(uuid.uuid4())
    conn = await get_db()
    try:
        await conn.execute(
            "INSERT INTO interview_sessions (id, user_id, job_title, questions) VALUES ($1,$2,$3,$4)",
            session_id, req.user_id, req.job_title, json.dumps(req.question_bank)
        )
        first_question = req.question_bank[0] if req.question_bank else None
        return {
            "session_id": session_id,
            "message": f"Hi {req.user_name}! I'm your AI interviewer today. We'll go through {len(req.question_bank)} questions for the {req.job_title} role. Let's begin!",
            "first_question": first_question,
            "total_questions": len(req.question_bank)
        }
    finally:
        await conn.close()

@app.post("/answer")
async def process_answer(req: AnswerRequest):
    conn = await get_db()
    try:
        session = await conn.fetchrow("SELECT * FROM interview_sessions WHERE id=$1", req.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        questions = json.loads(session['questions'])
        answers = json.loads(session['answers'])

        system_prompt = f"""You are a professional interviewer conducting a {session['job_title']} interview.
Evaluate the candidate's answer and respond naturally. Ask ONE follow-up if the answer lacks depth, otherwise acknowledge briefly and move on.
Be professional but conversational. Keep response under 80 words."""

        messages = req.conversation_history + [{"role": "user", "content": req.answer}]

        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "system", "content": system_prompt}] + messages[-6:],  # last 6 messages for context
            temperature=0.7,
            max_tokens=150
        )

        ai_response = response.choices[0].message.content

        answers.append({
            "question_id": req.question_id,
            "answer": req.answer,
            "timestamp": datetime.now().isoformat()
        })
        await conn.execute(
            "UPDATE interview_sessions SET answers=$1 WHERE id=$2",
            json.dumps(answers), req.session_id
        )

        answered_ids = [a['question_id'] for a in answers]
        next_question = next((q for q in questions if q['id'] not in answered_ids), None)

        return {
            "ai_response": ai_response,
            "next_question": next_question,
            "progress": {"answered": len(answers), "total": len(questions)},
            "interview_complete": next_question is None
        }
    finally:
        await conn.close()

@app.post("/complete/{session_id}")
async def complete_interview(session_id: str):
    conn = await get_db()
    try:
        session = await conn.fetchrow("SELECT * FROM interview_sessions WHERE id=$1", session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        await conn.execute(
            "UPDATE interview_sessions SET status='completed', ended_at=NOW() WHERE id=$1", session_id
        )

        rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
        connection = await aio_pika.connect_robust(rabbitmq_url)
        async with connection:
            channel = await connection.channel()
            await channel.declare_queue("evaluation_queue", durable=True)
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=json.dumps({
                        "session_id": session_id,
                        "user_id": session['user_id'],
                        "job_title": session['job_title'],
                        "questions": json.loads(session['questions']),
                        "answers": json.loads(session['answers'])
                    }).encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT
                ),
                routing_key="evaluation_queue"
            )

        return {"message": "Interview completed. Generating evaluation...", "session_id": session_id}
    finally:
        await conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 4003)))
