import os, json
from openai import AsyncOpenAI
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def evaluate_interview(messages: list, job_data: dict, user_id: str, session_id: str) -> dict:
    conversation = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in messages])
    prompt = f"""Analyze this mock interview and return ONLY valid JSON:
Job: {json.dumps(job_data)}
Transcript: {conversation}

Return: {{"overall_score": 75, "grade": "B+", "summary": "...", "skill_scores": {{"technical_knowledge": {{"score": 80, "feedback": "..."}}, "problem_solving": {{"score": 70, "feedback": "..."}}, "communication": {{"score": 85, "feedback": "..."}}, "cultural_fit": {{"score": 75, "feedback": "..."}}}}, "strengths": ["..."], "gaps": ["..."], "improvement_tips": [{{"topic": "...", "resource": "...", "priority": "high"}}], "hire_recommendation": "yes|maybe|no", "next_steps": "..."}}"""
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}, temperature=0.2,
    )
    evaluation = json.loads(response.choices[0].message.content)
    evaluation["session_id"] = session_id
    evaluation["user_id"] = user_id
    return evaluation
