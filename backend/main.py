# main.py
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

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
def create_investor(name: str, email: str, db: Session = Depends(get_db)):
    new_investor = Investor(name=name, email=email)
    db.add(new_investor)
    db.commit()
    db.refresh(new_investor)
    return new_investor

@app.get("/investors/")
def read_investors(db: Session = Depends(get_db)):
    return db.query(Investor).all()

@app.post("/firms/")
def create_firm(name: str, industry: str, db: Session = Depends(get_db)):
    new_firm = Firm(name=name, industry=industry)
    db.add(new_firm)
    db.commit()
    db.refresh(new_firm)
    return new_firm

@app.get("/firms/")
def read_firms(db: Session = Depends(get_db)):
    return db.query(Firm).all()