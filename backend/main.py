# main.py

# Standard library
import json
import logging
import os
import re
import tempfile
from typing import Any, Dict, List, Optional, Literal
from uuid import UUID

# Third-party libraries
import ffmpeg
import google.generativeai as genai
from faster_whisper import WhisperModel
from jose import jwt
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

# FastAPI
from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    Header,
    HTTPException,
    UploadFile,
    FastAPI,
)
from fastapi.middleware.cors import CORSMiddleware

# Pydantic
from pydantic import BaseModel, EmailStr

# Application modules
from app.database import Base, engine, get_db
from app.models.firm import Firm
from app.models.investor import Investor


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





# THIS IS THE TRANSCRIPTION STUFFF!!!!!

# --- configure once (idempotent) ---
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise RuntimeError("GEMINI_API_KEY not set")
genai.configure(api_key=API_KEY)

_MODEL_ID = "gemini-2.5-flash"  # or "gemini-1.5-flash-002" for speed

# --- lightweight normalizers (inline; no external deps) ---
_RISK_MAP = {
    "low": "Low", "conservative": "Low", "defensive": "Low",
    "medium": "Medium", "moderate": "Medium", "balanced": "Medium",
    "high": "High", "aggressive": "High", "very high": "High"
}
_STAGE_MAP = {
    "pre seed": "Pre-seed", "pre-seed": "Pre-seed", "preseed": "Pre-seed",
    "seed": "Seed",
    "series a": "Series A", "a round": "Series A",
    "series b": "Series B+", "b round": "Series B+", "series b+": "Series B+", "growth": "Series B+",
    "public": "Public", "ipo": "Public", "listed": "Public",
}

_FREQ_MAP = {"weekly": "Weekly", "monthly": "Monthly", "quarterly": "Quarterly"}

def _to_bool(val: Any) -> Optional[bool]:
    if isinstance(val, bool): return val
    if val is None: return None
    t = str(val).strip().lower()
    if t in {"yes","true","y","1","take","willing","open"}: return True
    if t in {"no","false","n","0","not","nope"}: return False
    return None

def _normalize_enum(val: Optional[str], mapping: Dict[str, str]) -> Optional[str]:
    if not val: return None
    t = val.strip().lower()
    # exact then "contains"
    if t in mapping: return mapping[t]
    for k,v in mapping.items():
        if k in t: return v
    return None

_num_token = re.compile(r"(\d+(?:\.\d+)?)\s*([kmbKMB])?$")

def _to_int_amount(val: Any) -> Optional[int]:
    """
    Accepts 2500000, "2.5M", "$500k", "3,000,000" -> int (assumed dollars or your unit)
    """
    if val is None: return None
    if isinstance(val, (int, float)): return int(round(val))
    s = str(val).strip().replace(",", "").replace("$","")
    m = _num_token.fullmatch(s)
    if m:
        num = float(m.group(1))
        suf = (m.group(2) or "").lower()
        if suf == "k": num *= 1_000
        elif suf == "m": num *= 1_000_000
        elif suf == "b": num *= 1_000_000_000
        return int(round(num))
    # fallback: first plain integer in string
    m2 = re.search(r"\b\d{1,9}\b", s)
    return int(m2.group(0)) if m2 else None

_int_token = re.compile(r"\b\d{1,4}\b")

def _to_int(val: Any, lo: int = 0, hi: int = 1_000_000) -> Optional[int]:
    if val is None: return None
    try:
        iv = int(val)
        return iv if lo <= iv <= hi else None
    except:
        s = str(val)
        m = _int_token.search(s)
        if not m: return None
        iv = int(m.group(0))
        return iv if lo <= iv <= hi else None


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
    email: str | None = Form(None),        # <-- receive email here
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

        sys = (
        "Task: Extract firm characteristics from a startup pitch transcript.\n"
        "Return STRICT JSON with these keys ONLY:\n"
        "name, risk_tolerance, industry, years_active, num_investments, board_seat, "
        "location, investment_size, investment_stage, follow_on_rate, rate_of_return, "
        "success_rate, reserved_capital, meeting_frequency.\n"
        "Rules:\n"
        "- If not stated, output null.\n"
        "- Do NOT guess.\n"
        "- risk_tolerance ∈ {Low, Medium, High} or null.\n"
        "- investment_stage ∈ {Pre-seed, Seed, Series A, Series B+, Public} or null.\n"
        "- meeting_frequency ∈ {Weekly, Monthly, Quarterly} or null.\n"
        "- years_active, num_investments: integers or null.\n"
        "- investment_size: integer (e.g., 2500000) or null.\n"
        "- board_seat, follow_on_rate: booleans or null.\n"
        "- rate_of_return, success_rate, reserved_capital: free-form strings if present.\n"
        "Return ONLY JSON. No prose, no markdown."
        )
        prompt = f"Transcript:\n```\n{transcript}\n```\nJSON only."

        model = genai.GenerativeModel(
            _MODEL_ID,
            system_instruction=sys,
            generation_config={"temperature": 0.1, "response_mime_type": "application/json"},
        )

        try:
            resp = model.generate_content(prompt)
            raw = (resp.text or "").strip()
            data = json.loads(raw)
        except Exception:
            # hard fallback: empty skeleton
            data = {}

        # 2) Ensure all keys exist
        out: Dict[str, Any] = {
            "name":                data.get("name"),
            "risk_tolerance":      data.get("risk_tolerance"),
            "industry":            data.get("industry"),
            "years_active":        data.get("years_active"),
            "num_investments":     data.get("num_investments"),
            "board_seat":          data.get("board_seat"),
            "location":            data.get("location"),
            "investment_size":     data.get("investment_size"),
            "investment_stage":    data.get("investment_stage"),
            "follow_on_rate":      data.get("follow_on_rate"),
            "rate_of_return":      data.get("rate_of_return"),
            "success_rate":        data.get("success_rate"),
            "reserved_capital":    data.get("reserved_capital"),
            "meeting_frequency":   data.get("meeting_frequency"),
        }

        # 3) Normalize types/enums
        out["risk_tolerance"]   = _normalize_enum(out["risk_tolerance"], _RISK_MAP)
        out["investment_stage"] = _normalize_enum(out["investment_stage"], _STAGE_MAP)
        out["meeting_frequency"]= _normalize_enum(out["meeting_frequency"], _FREQ_MAP)

        out["years_active"]     = _to_int(out["years_active"], lo=0, hi=200)
        out["num_investments"]  = _to_int(out["num_investments"], lo=0, hi=1_000_000)
        out["investment_size"]  = _to_int_amount(out["investment_size"])

        out["board_seat"]       = _to_bool(out["board_seat"])
        out["follow_on_rate"]   = _to_bool(out["follow_on_rate"])

        # 4) Minimal name cleanup
        if isinstance(out["name"], str):
            out["name"] = out["name"].strip() or None

        print(out)

        new_firm = Firm(**out, email=email, cognito_sub=sub)
        db.add(new_firm)
        db.commit()
        db.refresh(new_firm)
        return new_firm


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
        select(Firm.cognito_sub).where(Firm.cognito_sub == sub)
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

    # main.py (add these endpoints to your existing code)

from typing import List, Dict, Any
from pydantic import BaseModel

# Response models
class InvestorMatch(BaseModel):
    investor: Dict[str, Any]
    match_score: float
    match_reasons: List[str]

    class Config:
        from_attributes = True

class FirmMatch(BaseModel):
    firm: Dict[str, Any]
    match_score: float
    match_reasons: List[str]

    class Config:
        from_attributes = True
