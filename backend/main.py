# main.py
from fastapi import FastAPI, Depends, Body, HTTPException
from sqlalchemy.orm import Session
import logging
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import os
from sqlalchemy import text

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


def calculate_investor_match_score(investor: Investor, firm: Firm) -> tuple[float, List[str]]:
    """
    Calculate how well an investor matches with a firm.
    Returns (score, reasons) where score is 0-100.
    """
    score = 0.0
    reasons = []
    
    # Location match (20 points)
    if investor.location and firm.location:
        if investor.location.lower() == firm.location.lower():
            score += 20
            reasons.append(f"Same location: {investor.location}")
        elif investor.location.lower() in firm.location.lower() or firm.location.lower() in investor.location.lower():
            score += 10
            reasons.append(f"Similar location: {investor.location} / {firm.location}")
    
    # Investment size vs firm needs (30 points)
    if investor.investment_size and firm.aum:
        # Parse AUM if it's a string like "100M", "1B", etc.
        try:
            aum_value = parse_amount(firm.aum) if isinstance(firm.aum, str) else float(firm.aum)
            # Assume firm needs ~1-5% of AUM per investment
            firm_needs = aum_value * 0.03
            
            ratio = min(investor.investment_size, firm_needs) / max(investor.investment_size, firm_needs)
            if ratio > 0.7:
                score += 30
                reasons.append(f"Investment size match: ${investor.investment_size:,}")
            elif ratio > 0.4:
                score += 15
                reasons.append(f"Reasonable investment size fit")
        except:
            pass
    
    # Experience level (20 points)
    if investor.years_active and firm.age:
        if investor.years_active >= firm.age:
            score += 20
            reasons.append(f"Investor has {investor.years_active} years experience, mature enough for firm")
        elif investor.years_active >= firm.age * 0.5:
            score += 10
            reasons.append(f"Investor has relevant experience")
    
    # Portfolio size and firm's investment count (15 points)
    if investor.portfolio_size and firm.num_investments:
        if investor.portfolio_size >= 10:
            score += 15
            reasons.append(f"Experienced investor with {investor.portfolio_size} portfolio companies")
        elif investor.portfolio_size >= 5:
            score += 8
            reasons.append(f"Moderate portfolio size: {investor.portfolio_size} companies")
    
    # Board seat preference (15 points)
    if investor.board_seat:
        score += 15
        reasons.append("Investor takes board seats - adds strategic value")
    
    return score, reasons


def calculate_firm_match_score(firm: Firm, investor: Investor) -> tuple[float, List[str]]:
    """
    Calculate how well a firm matches with an investor.
    Returns (score, reasons) where score is 0-100.
    """
    score = 0.0
    reasons = []
    
    # Location match (20 points)
    if firm.location and investor.location:
        if firm.location.lower() == investor.location.lower():
            score += 20
            reasons.append(f"Same location: {firm.location}")
        elif firm.location.lower() in investor.location.lower() or investor.location.lower() in firm.location.lower():
            score += 10
            reasons.append(f"Similar location: {firm.location} / {investor.location}")
    
    # Firm size vs investor investment capacity (25 points)
    if firm.aum and investor.investment_size:
        try:
            aum_value = parse_amount(firm.aum) if isinstance(firm.aum, str) else float(firm.aum)
            # Larger AUM suggests ability to absorb larger investments
            if aum_value > investor.investment_size * 20:
                score += 25
                reasons.append(f"Firm size (${format_amount(aum_value)}) matches investment capacity")
            elif aum_value > investor.investment_size * 10:
                score += 15
                reasons.append(f"Good size match for investment")
        except:
            pass
    
    # Track record (20 points)
    if firm.num_investments:
        if firm.num_investments >= 20:
            score += 20
            reasons.append(f"Proven track record: {firm.num_investments} investments")
        elif firm.num_investments >= 10:
            score += 12
            reasons.append(f"Solid track record: {firm.num_investments} investments")
        elif firm.num_investments >= 5:
            score += 5
            reasons.append(f"Growing portfolio: {firm.num_investments} investments")
    
    # Firm maturity (20 points)
    if firm.age and investor.years_active:
        if firm.age <= investor.years_active:
            score += 20
            reasons.append(f"Firm age ({firm.age} years) aligns with investor experience")
        elif firm.age <= investor.years_active * 1.5:
            score += 10
            reasons.append(f"Reasonable maturity match")
    
    # Industry relevance (15 points)
    if firm.industry:
        score += 15
        reasons.append(f"Industry: {firm.industry}")
    
    return score, reasons


def parse_amount(amount_str: str) -> float:
    """Parse amounts like '100M', '1.5B', etc."""
    amount_str = amount_str.upper().strip()
    multipliers = {'K': 1_000, 'M': 1_000_000, 'B': 1_000_000_000}
    
    for suffix, multiplier in multipliers.items():
        if suffix in amount_str:
            number = float(amount_str.replace(suffix, '').strip())
            return number * multiplier
    
    return float(amount_str)


def format_amount(amount: float) -> str:
    """Format amount as readable string."""
    if amount >= 1_000_000_000:
        return f"{amount / 1_000_000_000:.1f}B"
    elif amount >= 1_000_000:
        return f"{amount / 1_000_000:.1f}M"
    elif amount >= 1_000:
        return f"{amount / 1_000:.1f}K"
    return f"{amount:.0f}"


@app.get("/firms/{firm_id}/matching-investors", response_model=List[InvestorMatch])
def get_matching_investors(
    firm_id: int,
    limit: int = 10,
    min_score: float = 0.0,
    db: Session = Depends(get_db)
):
    """
    Get top N investors that match with a specific firm.
    
    - **firm_id**: ID of the firm to find matches for
    - **limit**: Maximum number of matches to return (default: 10)
    - **min_score**: Minimum match score threshold (0-100, default: 0)
    """
    # Get the firm
    firm = db.query(Firm).filter(Firm.id == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")
    
    # Get all investors and calculate match scores
    investors = db.query(Investor).all()
    matches = []
    
    for investor in investors:
        score, reasons = calculate_investor_match_score(investor, firm)
        
        if score >= min_score:
            matches.append({
                "investor": {
                    "id": investor.id,
                    "name": investor.name,
                    "email": investor.email,
                    "years_active": investor.years_active,
                    "portfolio_size": investor.portfolio_size,
                    "board_seat": investor.board_seat,
                    "location": investor.location,
                    "investment_size": investor.investment_size,
                },
                "match_score": round(score, 2),
                "match_reasons": reasons
            })
    
    # Sort by score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return matches[:limit]


@app.get("/investors/{investor_id}/matching-firms", response_model=List[FirmMatch])
def get_matching_firms(
    investor_id: int,
    limit: int = 10,
    min_score: float = 0.0,
    db: Session = Depends(get_db)
):
    """
    Get top N firms that match with a specific investor.
    
    - **investor_id**: ID of the investor to find matches for
    - **limit**: Maximum number of matches to return (default: 10)
    - **min_score**: Minimum match score threshold (0-100, default: 0)
    """
    # Get the investor
    investor = db.query(Investor).filter(Investor.id == investor_id).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    # Get all firms and calculate match scores
    firms = db.query(Firm).all()
    matches = []
    
    for firm in firms:
        score, reasons = calculate_firm_match_score(firm, investor)
        
        if score >= min_score:
            matches.append({
                "firm": {
                    "id": firm.id,
                    "name": firm.name,
                    "industry": firm.industry,
                    "aum": firm.aum,
                    "location": firm.location,
                    "num_investments": firm.num_investments,
                    "age": firm.age,
                },
                "match_score": round(score, 2),
                "match_reasons": reasons
            })
    
    # Sort by score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return matches[:limit]


# Optional: Bulk matching endpoint
@app.get("/matching/investors-firms", response_model=Dict[str, Any])
def get_all_matches(
    limit_per_entity: int = 5,
    min_score: float = 30.0,
    db: Session = Depends(get_db)
):
    """
    Get all investor-firm matches above a threshold.
    Useful for generating a matching matrix.
    
    - **limit_per_entity**: Max matches per investor/firm
    - **min_score**: Minimum match score threshold
    """
    investors = db.query(Investor).all()
    firms = db.query(Firm).all()
    
    all_matches = []
    
    for investor in investors:
        for firm in firms:
            score, reasons = calculate_firm_match_score(firm, investor)
            
            if score >= min_score:
                all_matches.append({
                    "investor_id": investor.id,
                    "investor_name": investor.name,
                    "firm_id": firm.id,
                    "firm_name": firm.name,
                    "match_score": round(score, 2),
                    "match_reasons": reasons
                })
    
    # Sort by score
    all_matches.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {
        "total_matches": len(all_matches),
        "matches": all_matches[:100]  # Limit to top 100
    }