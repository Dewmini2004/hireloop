import os, json, uuid
from openai import AsyncOpenAI
from app.models.db import get_pool

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are Alex, a senior technical interviewer. Conduct a realistic, adaptive interview.
- Ask ONE question at a time. React naturally to answers. Adapt difficulty based on responses.
- After ~8-10 exchanges, signal wrap-up.
Return JSON: {"message": "your response", "is_complete": false}"""

async def start_session(user_id: str, job_data: dict) -> dict:
    pool = await get_pool()
    session_id = str(uuid.uuid4())
    opening = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Job data: {json.dumps(job_data)}\nStart the interview with a warm intro and first question."}
        ],
        response_format={"type": "json_object"}, temperature=0.7,
    )
    first_msg = json.loads(opening.choices[0].message.content)
    messages = [{"role": "assistant", "content": first_msg["message"]}]
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO sessions (id, user_id, job_data, messages) VALUES ($1, $2, $3, $4)",
            session_id, user_id, json.dumps(job_data), json.dumps(messages)
        )
    return {"session_id": session_id, "message": first_msg["message"]}

async def send_message(session_id: str, answer: str, user_id: str) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM sessions WHERE id=$1 AND user_id=$2", session_id, user_id)
        if not row: raise Exception("Session not found")
        messages = json.loads(row["messages"])
        job_data = json.loads(row["job_data"])
    messages.append({"role": "user", "content": answer})
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": f"Job: {json.dumps(job_data)}"}, *messages],
        response_format={"type": "json_object"}, temperature=0.7,
    )
    reply = json.loads(response.choices[0].message.content)
    messages.append({"role": "assistant", "content": reply["message"]})
    async with pool.acquire() as conn:
        await conn.execute("UPDATE sessions SET messages=$1 WHERE id=$2", json.dumps(messages), session_id)
    return {"message": reply["message"], "is_complete": reply.get("is_complete", False)}

async def end_session(session_id: str, user_id: str) -> dict:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE sessions SET status='completed', ended_at=NOW() WHERE id=$1 AND user_id=$2", session_id, user_id)
        row = await conn.fetchrow("SELECT * FROM sessions WHERE id=$1", session_id)
    return {"session_id": session_id, "status": "completed", "messages": json.loads(row["messages"])}
