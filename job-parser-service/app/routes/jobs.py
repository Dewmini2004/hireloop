from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.services.parser import parse_job_description

router = APIRouter()

class JDRequest(BaseModel):
    job_description: str
    job_title: str | None = None

@router.post("/parse")
async def parse_jd(body: JDRequest, x_user_id: str = Header(...)):
    try:
        result = await parse_job_description(body.job_description, body.job_title)
        return {"userId": x_user_id, "parsed": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
