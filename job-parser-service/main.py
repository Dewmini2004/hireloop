from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from openai import AsyncOpenAI
import json
import os
import io
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="HireLoop Job Parser Service")

client = AsyncOpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "openai/gpt-oss-120b"

class JobDescriptionRequest(BaseModel):
    job_description: str
    num_questions: int = 10

class MatchRequest(BaseModel):
    resume_text: str
    required_skills: list[str]
    role_title: str

def extract_json(text: str) -> dict:
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    return json.loads(text)

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
        result = extract_json(response.choices[0].message.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")


# ─── Resume Parsing ─────────────────────────────────────────
def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PdfReader(io.BytesIO(file_bytes))
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text.strip()


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    """Extract structured info (skills, experience, education) from an uploaded resume (PDF or TXT)."""
    if not file.filename.lower().endswith((".pdf", ".txt")):
        raise HTTPException(status_code=400, detail="Only PDF or TXT files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        if file.filename.lower().endswith(".pdf"):
            resume_text = extract_text_from_pdf(file_bytes)
        else:
            resume_text = file_bytes.decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read file: {str(e)}")

    if len(resume_text.strip()) < 30:
        raise HTTPException(status_code=400, detail="Could not extract readable text from this file")

    prompt = f"""You are an expert resume parser. Extract structured information from this resume text.

Resume Text:
{resume_text[:6000]}

Return ONLY valid JSON with this exact structure:
{{
  "name": "string or null",
  "years_of_experience": <integer estimate>,
  "skills": ["skill1", "skill2"],
  "education": ["degree, institution"],
  "experience_summary": ["short bullet of role/company/duration"],
  "projects": ["short project description"]
}}

Be concise. Extract only what's clearly present. Return ONLY the JSON, no other text."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        parsed = extract_json(response.choices[0].message.content)
        parsed["raw_text"] = resume_text[:6000]  # kept for matching step, trimmed for safety
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")


@app.post("/match")
async def match_resume_to_job(req: MatchRequest):
    """Compare parsed resume content against a job's required skills and return a match score + gap analysis."""
    prompt = f"""You are an expert technical recruiter comparing a candidate's resume to a job's requirements.

Job Role: {req.role_title}
Required Skills: {', '.join(req.required_skills)}

Candidate Resume Text:
{req.resume_text[:6000]}

Return ONLY valid JSON with this exact structure:
{{
  "match_score": <0-100 integer, overall fit percentage>,
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "summary": "2-3 sentence assessment of how well this candidate fits the role",
  "suggested_focus_areas": ["area1", "area2"]
}}

Return ONLY the JSON, no other text."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000
        )
        result = extract_json(response.choices[0].message.content)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 4002)))
