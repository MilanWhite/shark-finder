# main.py
from fastapi import FastAPI, Depends, Body, HTTPException
from sqlalchemy.orm import Session
import logging
from sqlalchemy.exc import IntegrityError

# Import database stuff
from app.database import engine, get_db, Base

# Import models individually
from app.models.investor import Investor
from app.models.firm import Firm

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

# Example endpoints for your actual models
@app.post("/investors/")
def create_investor(
    name: str ,
    email: str,
    risk_tolerance: str | None = None,
    industry: str | None = None,
    years_active: int | None = None,
    num_investments: int | None = None,
    board_seat: bool | None = None,
    location: str | None = None,
    investment_size: int | None = None,
    investment_stage: str | None = None,
    follow_on_rate: bool | None = None,
    rate_of_return: str | None = None,
    success_rate: str | None = None,
    reserved_capital: str | None = None,
    meeting_frequency: str | None = None,
    db: Session = Depends(get_db),
):
    new_investor = Investor(
        name=name,
        email=email,
        risk_tolerance=risk_tolerance,
        industry=industry,
        years_active=years_active,
        num_investments=num_investments,
        board_seat=board_seat,
        location=location,
        investment_size=investment_size,
        investment_stage=investment_stage,
        follow_on_rate=follow_on_rate,
        rate_of_return=rate_of_return,
        success_rate=success_rate,
        reserved_capital=reserved_capital,
        meeting_frequency=meeting_frequency,
    )
    db.add(new_investor)
    try:
        db.commit()
        db.refresh(new_investor)
        return new_investor
    except IntegrityError as e:
        # Roll back the failed transaction and raise a 400 with details
        db.rollback()
        logging.exception("IntegrityError while creating investor")
        raise HTTPException(status_code=400, detail=str(e.orig))
    except Exception as e:
        db.rollback()
        logging.exception("Unexpected error while creating investor")
        raise HTTPException(status_code=500, detail="Internal Server Error")

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