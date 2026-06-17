import os, json
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def parse_job_description(jd: str, job_title: str = None) -> dict:
    prompt = f"""
You are an expert technical recruiter. Analyze this job description and extract structured data.

Job Description:
{jd}

Return ONLY a valid JSON object with this exact structure:
{{
  "role": "job title",
  "seniority": "junior|mid|senior|lead",
  "tech_skills": ["skill1", "skill2"],
  "soft_skills": ["skill1", "skill2"],
  "responsibilities": ["resp1", "resp2"],
  "question_bank": {{
    "technical": [
      {{"question": "...", "difficulty": "easy|medium|hard", "skill_tested": "..."}}
    ],
    "behavioral": [
      {{"question": "...", "competency": "..."}}
    ],
    "situational": [
      {{"question": "...", "scenario": "..."}}
    ]
  }}
}}
Generate 5 technical, 3 behavioral, and 3 situational questions.
"""
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.3,
    )
    return json.loads(response.choices[0].message.content)
