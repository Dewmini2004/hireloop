from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from app.services.interviewer import start_session, send_message, end_session
from app.models.db import get_pool
import json

router = APIRouter()

class StartRequest(BaseModel):
    job_data: dict

class MessageRequest(BaseModel):
    session_id: str
    answer: str

@router.post("/start")
async def start_interview(body: StartRequest, x_user_id: str = Header(...)):
    return await start_session(x_user_id, body.job_data)

@router.post("/message")
async def send_answer(body: MessageRequest, x_user_id: str = Header(...)):
    return await send_message(body.session_id, body.answer, x_user_id)

@router.post("/end/{session_id}")
async def end_interview(session_id: str, x_user_id: str = Header(...)):
    return await end_session(session_id, x_user_id)

@router.get("/session/{session_id}")
async def get_session(session_id: str, x_user_id: str = Header(...)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM sessions WHERE id=$1 AND user_id=$2", session_id, x_user_id)
        if not row: raise HTTPException(status_code=404, detail="Session not found")
        return dict(row)
