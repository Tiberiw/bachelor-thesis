from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asr_endpoint
from dotenv import load_dotenv
from huggingface_hub import login
import os

load_dotenv()
token = os.getenv("HF_TOKEN")

app = FastAPI(title="Whisper Transcription API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asr_endpoint.router, prefix="/api", tags=["transcription"])