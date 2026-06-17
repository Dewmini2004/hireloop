from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import evaluations

app = FastAPI(title="HireLoop Evaluation Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(evaluations.router)

@app.get("/health")
def health(): return {"status": "Evaluation Service running ✅"}
