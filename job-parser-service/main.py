from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HireLoop Job Parser Service")

# Groq uses OpenAI-compatible API
client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama3-70b-8192"

class JobDescriptionRequest(BaseModel):
    job_description: str
    num_questions: int = 10

@app.get("/health")
def health():
    return {"status": "Job Parser Service OK"}

@app.post("/parse")
async def parse_job_description(req: JobDescriptionRequest):
    if len(req.job_description.strip()) < 50:
        raise HTTPException(status_code=400, detail="Job description too short")

    prompt = f"""You are an expert technical recruiter. Analyze this job description and return a JSON object.

Job Description:
{req.job_description}

Return ONLY valid JSON with this exact structure:
{{
  "role_title": "string",
  "seniority_level": "junior or mid or senior",
  "required_skills": ["skill1", "skill2"],
  "responsibilities": ["responsibility1"],
  "question_bank": [
    {{
      "id": "q1",
      "question": "string",
      "category": "technical or behavioral or situational",
      "difficulty": "easy or medium or hard",
      "expected_keywords": ["keyword1"],
      "follow_up": "string"
    }}
  ]
}}

Generate {req.num_questions} questions covering technical skills, behavioral scenarios, and situational problems for this exact role. Return ONLY the JSON, no other text."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=3000
        )
        text = response.choices[0].message.content.strip()
        # Extract JSON if wrapped in markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        result = json.loads(text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 4002)))
