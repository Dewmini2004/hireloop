from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import jobs

app = FastAPI(title="HireLoop Job Parser Service")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(jobs.router)

@app.get("/health")
def health(): return {"status": "Job Parser Service running ✅"}
