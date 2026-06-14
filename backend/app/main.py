from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.copilot import router
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="Splunk AI Query Copilot", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {"name": "Splunk AI Query Copilot", "version": "1.0.0", "docs": "/docs"}
