# main.py
from fastapi import FastAPI, Depends, Body, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
import logging
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
from uuid import UUID
import os
from sqlalchemy import text

# Import database stuff
from app.database import engine, get_db, Base
from pydantic import BaseModel, EmailStr
# Import models individually
from app.models.investor import Investor
from app.models.firm import Firm
from typing import Literal, Optional

from sqlalchemy import select

# matching utilities and schemas
from app.match import calculate_investor_match_score
from app.schemas import InvestorMatch, FirmMatch

import os
import tempfile
import ffmpeg
from fastapi import HTTPException, Header, UploadFile, File, Depends
from sqlalchemy.orm import Session
from faster_whisper import WhisperModel

from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Depends

from fastapi import Header, HTTPException


import os, tempfile, ffmpeg
from fastapi import APIRouter, UploadFile, File, Header, HTTPException, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from faster_whisper import WhisperModel

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*"],
)

# include match router if present (safe import)
try:
    from app.match import router as match_router
    app.include_router(match_router)
except Exception:
    pass

# include match router if available
try:
    from app.match import router as match_router
    app.include_router(match_router)
except Exception:
    # keep app usable even if import fails in dev
    pass

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

class InvestorCreate(BaseModel):
    name: str
    email: EmailStr
    risk_tolerance: Optional[Literal["Low", "Medium", "High"]] = None
    industry: Optional[str] = None
    years_active: Optional[int] = None
    num_investments: Optional[int] = None
    board_seat: Optional[bool] = None
    location: Optional[str] = None
    investment_size: Optional[int] = None
    investment_stage: Optional[Literal["Pre-seed", "Seed", "Series A", "Series B+", "Public"]] = None
    follow_on_rate: Optional[bool] = None
    rate_of_return: Optional[str] = None
    success_rate: Optional[str] = None
    reserved_capital: Optional[str] = None
    meeting_frequency: Optional[Literal["Weekly", "Monthly", "Quarterly"]] = None


def _extract_sub_from_auth(authorization: str) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing/invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.get_unverified_claims(token)["sub"]  # upstream must have verified token
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")



@app.post("/investor/create-profile")
def create_investor(
    payload: InvestorCreate,
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db),
):
    # if not authorization.startswith("Bearer "):
    #     raise HTTPException(status_code=401, detail="Missing/invalid Authorization header")
    # token = authorization.split(" ", 1)[1]

    # # Minimal: read sub without network calls (no JWKS). Upstream must have verified the token.

    # print(jwt.get_unverified_claims(token)["sub"])

    # try:
    #     sub = jwt.get_unverified_claims(token)["sub"]
    # except Exception:
    #     raise HTTPException(status_code=401, detail="Invalid token")


    sub = _extract_sub_from_auth(authorization)

    new_investor = Investor(**payload.dict(), cognito_sub=sub)
    db.add(new_investor)
    try:
        db.commit()
        db.refresh(new_investor)
        return new_investor
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Profile already exists for this user")
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")






WHISPER_SIZE = "small"
# device="auto" uses GPU if available; compute_type="auto" picks best precision
whisper_model = WhisperModel(WHISPER_SIZE, device="auto", compute_type="auto")

def _to_wav_16k_mono(src_path: str) -> str:
    """Convert any audio/video to 16 kHz mono WAV for Whisper."""
    out_path = src_path + ".wav"
    (
        ffmpeg
        .input(src_path)
        .output(out_path, ac=1, ar="16000", format="wav", loglevel="error")
        .overwrite_output()
        .run()
    )
    return out_path

@app.post("/firm/create-profile")
async def create_firm(
    authorization: str = Header(..., alias="Authorization"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # auth
    try:
        sub = _extract_sub_from_auth(authorization)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    # validate
    ct = file.content_type or ""
    if not (ct.startswith("audio/") or ct.startswith("video/")):
        raise HTTPException(status_code=400, detail="Send audio/* or video/* file")

    src_path = None
    wav_path = None
    try:
        # persist upload
        suffix = os.path.splitext(file.filename or "")[1] or ".bin"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            src_path = tmp.name
            tmp.write(await file.read())

        # normalize to WAV 16k mono
        wav_path = _to_wav_16k_mono(src_path)

        # transcribe
        segments, info = whisper_model.transcribe(
            wav_path,
            language=None,        # auto-detect
            vad_filter=True,      # helps on noisy/pauses
            beam_size=5,          # decent accuracy/latency tradeoff
        )

        transcript = "".join(seg.text for seg in segments).strip()

        # print transcript (as requested)
        print(f"[transcribe] user_sub={sub} lang={info.language} dur={info.duration:.2f}s")
        print(transcript)


    except ffmpeg.Error as e:
        err = e.stderr.decode() if e.stderr else "ffmpeg failed"
        raise HTTPException(status_code=500, detail=f"Audio decode failed: {err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        for p in (src_path, wav_path):
            if p:
                try: os.remove(p)
                except: pass




@app.get("/investor/exists")
def investor_exists(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db),
):
    sub = _extract_sub_from_auth(authorization)
    exists = db.execute(
        select(Investor.cognito_sub).where(Investor.cognito_sub == sub)
    ).first() is not None
    return {"exists": exists}


@app.get("/firm/exists")
def firm_exists(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db),
):
    sub = _extract_sub_from_auth(authorization)
    exists = db.execute(
        select(Firm.id).where(Firm.cognito_sub == sub)
    ).first() is not None
    return {"exists": exists}


@app.get("/investors/")
def read_investors(db: Session = Depends(get_db)):
    return db.query(Investor).all()

# @app.post("/firms/")
# def create_firm(
#     name: str,
#     email:str,
#     risk_tolerance: str ! None = None,
#     industry: str | None = None,
#     years_active: int,
#     num_investments: int | None = None,
#     board_seat: bool,
#     location: str,
#     investment_size: str,
#     investment_stage: str,
#     follow_on_rate: bool,
#     rate_of_return: str,
#     success_rate:str,
#     reserved_capital = str,
#     meeting_frequency = str,
#     db: Session = Depends(get_db),
# ):
#     new_firm = Firm(
#         name=name,
#         email=email,
#         risk_tolerance=risk_tolerance,
#         industry=industry,

#         aum=aum,
#         location=location,
#         num_investments=num_investments,
#         age=age,
#     )
#     db.add(new_firm)
#     try:
#         db.commit()
#         db.refresh(new_firm)
#         return new_firm
#     except IntegrityError as e:
#         db.rollback()
#         logging.exception("IntegrityError while creating firm")
#         raise HTTPException(status_code=400, detail=str(e.orig))
#     except Exception as e:
#         db.rollback()
#         logging.exception("Unexpected error while creating firm")
#         raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/firms/")
def read_firms(db: Session = Depends(get_db)):
    return db.query(Firm).all()


# Match endpoints (moved into main for easier testing)
@app.get("/firms/{firm_id}/matching-investors")
def get_matching_investors(
    firm_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get top N investors that match with a specific firm.

    - **firm_id**: ID of the firm to find matches for
    - **limit**: Maximum number of matches to return (default: 10)
    - **min_score**: Minimum match score threshold (0-100, default: 0)
    """
    # Get the firm
    firm = db.query(Firm).filter(Firm.cognito_sub == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")

    # Get all investors and calculate match scores
    investors = db.query(Investor).all()
    matches = []

    for investor in investors:
        score = calculate_investor_match_score(investor, firm)

        matches.append({
            "investor": {
                "name": investor.name,
                "email": investor.email,
                "num_investments": investor.num_investments,
                "industry": investor.industry,
                "location": investor.location,
            },
            "match_score": score
        })

    # Sort by score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)

    return matches[:5]


@app.get("/investors/{investor_id}/matching-firms")
def get_matching_firms(
    investor_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get top N firms that match with a specific investor.

    - **investor_id**: ID of the investor to find matches for
    - **limit**: Maximum number of matches to return (default: 10)
    - **min_score**: Minimum match score threshold (0-100, default: 0)
    """
    # Get the investor
    # fetch investor by cognito_sub
    investor = db.query(Investor).filter(Investor.cognito_sub == investor_id).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    # Get all firms and calculate match scores
    firms = db.query(Firm).all()
    matches = []

    for firm in firms:
        score = calculate_investor_match_score(investor, firm)

        matches.append({
            "firm": {
                "name": firm.name,
                "email": firm.email,
                "industry": firm.industry,
                "location": firm.location,
                "num_investments": firm.num_investments
            },
            "match_score": score
        })

    # Sort by score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)

    return matches[:5]

