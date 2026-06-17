from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.services.evaluator import evaluate_interview

router = APIRouter()

class EvalRequest(BaseModel):
    session_id: str
    messages: list
    job_data: dict

@router.post("/evaluate")
async def evaluate(body: EvalRequest, x_user_id: str = Header(...)):
    try:
        return await evaluate_interview(body.messages, body.job_data, x_user_id, body.session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
