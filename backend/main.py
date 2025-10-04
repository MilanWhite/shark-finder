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
    years_active: int | None = None,
    portfolio_size: int | None = None,
    board_seat: bool | None = None,
    location: str | None = None,
    investment_size: int | None = None,
    db: Session = Depends(get_db),
):
    new_investor = Investor(
        name=name,
        email=email,
        years_active=years_active,
        portfolio_size=portfolio_size,
        board_seat=board_seat,
        location=location,
        investment_size=investment_size,
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