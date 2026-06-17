from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interviews
from app.models.db import init_db

app = FastAPI(title="HireLoop Interview Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(interviews.router)

@app.on_event("startup")
async def startup(): await init_db()

@app.get("/health")
def health(): return {"status": "Interview Service running ✅"}
