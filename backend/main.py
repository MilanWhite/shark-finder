# main.py
from fastapi import FastAPI, Depends, Body, HTTPException
from jose import jwt
from sqlalchemy.orm import Session
import logging
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
# Import database stuff
from app.database import engine, get_db, Base
from pydantic import BaseModel, EmailStr
# Import models individually
from app.models.investor import Investor
from app.models.firm import Firm
from typing import Literal, Optional

from sqlalchemy import select

from fastapi import Header, HTTPException
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

@app.post("/firms/")
def create_firm(
    name: str,
    industry: str | None = None,
    aum: str | None = None, 
    location: str | None = None,
    num_investments: int | None = None,
    age: int | None = None,
    db: Session = Depends(get_db),
):
    new_firm = Firm(
        name=name,
        industry=industry,
        aum=aum,
        location=location,
        num_investments=num_investments,
        age=age,
    )
    db.add(new_firm)
    try:
        db.commit()
        db.refresh(new_firm)
        return new_firm
    except IntegrityError as e:
        db.rollback()
        logging.exception("IntegrityError while creating firm")
        raise HTTPException(status_code=400, detail=str(e.orig))
    except Exception as e:
        db.rollback()
        logging.exception("Unexpected error while creating firm")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/firms/")
def read_firms(db: Session = Depends(get_db)):
    return db.query(Firm).all()