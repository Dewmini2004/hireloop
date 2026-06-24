from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import aio_pika
import asyncio
import json
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HireLoop Evaluation Service")

# Groq uses OpenAI-compatible API
client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "openai/gpt-oss-120b"

async def evaluate_interview(data: dict):
    questions_map = {q['id']: q for q in data['questions']}

    qa_pairs = []
    for answer in data['answers']:
        q = questions_map.get(answer['question_id'], {})
        qa_pairs.append({
            "question": q.get('question', 'Unknown'),
            "category": q.get('category', 'general'),
            "expected_keywords": q.get('expected_keywords', []),
            "candidate_answer": answer['answer']
        })

    prompt = f"""You are a senior technical recruiter evaluating a candidate for: {data['job_title']}

Evaluate each Q&A pair below and return ONLY valid JSON with no extra text.

Q&A Pairs:
{json.dumps(qa_pairs, indent=2)}

Return this exact JSON:
{{
  "overall_score": <0-100 integer>,
  "hire_recommendation": "strong_yes or yes or maybe or no",
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvement_areas": ["area1", "area2"],
  "per_answer_scores": [
    {{
      "question": "string",
      "score": <0-10 integer>,
      "feedback": "string",
      "what_was_missing": "string"
    }}
  ],
  "skill_gap_analysis": {{
    "strong_skills": ["skill1"],
    "weak_skills": ["skill1"],
    "missing_skills": ["skill1"]
  }},
  "recommended_resources": [
    {{"topic": "string", "resource_type": "course or book or practice", "suggestion": "string"}}
  ]
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000
    )

    text = response.choices[0].message.content.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()

    evaluation = json.loads(text)

    # Push result to progress service
    async with httpx.AsyncClient() as http:
        progress_url = os.getenv("PROGRESS_SERVICE_URL", "http://progress-service:4005")
        try:
            await http.post(f"{progress_url}/sessions", json={
                "session_id": data['session_id'],
                "user_id": data['user_id'],
                "job_title": data['job_title'],
                "evaluation": evaluation
            }, timeout=10)
        except Exception as e:
            print(f"[Evaluation] Failed to save to progress: {e}")

    return evaluation

async def consume_queue():
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    while True:
        try:
            connection = await aio_pika.connect_robust(rabbitmq_url)
            channel = await connection.channel()
            await channel.set_qos(prefetch_count=1)
            queue = await channel.declare_queue("evaluation_queue", durable=True)

            print("[Evaluation] Queue consumer ready ✅")
            async with queue.iterator() as q:
                async for message in q:
                    async with message.process():
                        data = json.loads(message.body.decode())
                        print(f"[Evaluation] Processing session: {data['session_id']}")
                        try:
                            await evaluate_interview(data)
                            print(f"[Evaluation] ✅ Done: {data['session_id']}")
                        except Exception as e:
                            print(f"[Evaluation] ❌ Error: {e}")
        except Exception as e:
            print(f"[Evaluation] Queue error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup():
    asyncio.create_task(consume_queue())

@app.get("/health")
def health():
    return {"status": "Evaluation Service OK"}

@app.post("/evaluate")
async def evaluate_direct(req: dict):
    result = await evaluate_interview(req)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 4004)))
