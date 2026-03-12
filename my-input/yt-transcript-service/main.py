import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

API_KEY = os.environ.get("API_KEY", "")


class TranscriptRequest(BaseModel):
    video_id: str
    lang: str = "ja"


@app.post("/transcript")
async def get_transcript(
    req: TranscriptRequest,
    authorization: str = Header(default=""),
):
    if API_KEY and authorization != f"Bearer {API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not req.video_id or len(req.video_id) != 11:
        raise HTTPException(status_code=400, detail="Invalid video_id")

    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(req.video_id, languages=[req.lang, "en"])
        text = " ".join(snippet.text for snippet in transcript.snippets)
        return {"transcript": text, "length": len(text)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
