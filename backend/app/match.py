

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

    # Industry match (15 points)
    if investor.industry and firm.industry:
        if investor.industry.lower() == firm.industry.lower():
            score += 15
            reasons.append(f"Industry match: {investor.industry}")
        elif investor.industry.lower() in firm.industry.lower() or firm.industry.lower() in investor.industry.lower():
            score += 7
            reasons.append(f"Related industry: {investor.industry} / {firm.industry}")

    # Risk tolerance vs firm stage (10 points)
    if investor.risk_tolerance and firm.age is not None:
        # Heuristic: younger firms (age <5) are higher risk
        if investor.risk_tolerance.lower() == 'high' and firm.age <= 5:
            score += 10
            reasons.append('High risk tolerance fits younger firm')
        elif investor.risk_tolerance.lower() == 'low' and firm.age >= 8:
            score += 6
            reasons.append('Low risk tolerance fits mature firm')

    # Follow-on preference (5 points)
    if investor.follow_on_rate:
        # If investor likes follow-ons, prefer firms with larger num_investments
        if firm.num_investments and firm.num_investments >= 10:
            score += 5
            reasons.append('Investor prefers follow-ons and firm has active portfolio')

    # Meeting frequency preference (5 points)
    if investor.meeting_frequency and firm.location:
        # crude heuristic: local firms preferred for frequent meetings
        if investor.meeting_frequency.lower() == 'weekly' and investor.location and firm.location and investor.location.lower() == firm.location.lower():
            score += 5
            reasons.append('Weekly meeting preference and local firm')

    # Reserved capital and rate_of_return, success_rate (informational boosts)
    if investor.reserved_capital and firm.aum:
        try:
            inv_cap = parse_amount(investor.reserved_capital) if isinstance(investor.reserved_capital, str) else float(investor.reserved_capital)
            aum_v = parse_amount(firm.aum) if isinstance(firm.aum, str) else float(firm.aum)
            if inv_cap >= aum_v * 0.01:
                score += 5
                reasons.append('Investor has reserved capital sufficient for this firm size')
        except:
            pass

    if investor.rate_of_return:
        # small bonus for higher stated ROI strings (heuristic)
        if '%' in investor.rate_of_return:
            try:
                roi = float(investor.rate_of_return.replace('%',''))
                if roi >= 20:
                    score += 3
                    reasons.append(f'High target return: {roi}%')
            except:
                pass

    if investor.success_rate:
        try:
            sr = float(investor.success_rate.replace('%',''))
            if sr >= 60:
                score += 3
                reasons.append(f'Success rate: {sr}%')
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

    # Portfolio size (num_investments) and firm's investment count (15 points)
    if investor.num_investments and firm.num_investments:
        if investor.num_investments >= 10:
            score += 15
            reasons.append(f"Experienced investor with {investor.num_investments} portfolio companies")
        elif investor.num_investments >= 5:
            score += 8
            reasons.append(f"Moderate portfolio size: {investor.num_investments} companies")

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

    # Industry relevance (20 points more strongly weighted for firm perspective)
    if firm.industry and investor.industry:
        if firm.industry.lower() == investor.industry.lower():
            score += 20
            reasons.append(f"Industry match: {firm.industry}")
        elif firm.industry.lower() in investor.industry.lower() or investor.industry.lower() in firm.industry.lower():
            score += 10
            reasons.append(f"Related industry: {firm.industry} / {investor.industry}")

    # Investor risk tolerance vs firm maturity
    if investor.risk_tolerance and firm.age is not None:
        if investor.risk_tolerance.lower() == 'high' and firm.age <= 5:
            score += 10
            reasons.append('Investor risk tolerance matches young firm')
        elif investor.risk_tolerance.lower() == 'low' and firm.age >= 8:
            score += 6
            reasons.append('Investor risk tolerance matches mature firm')

    # Meeting frequency and location (5 points)
    if investor.meeting_frequency and firm.location and investor.location:
        if investor.meeting_frequency.lower() == 'weekly' and investor.location.lower() == firm.location.lower():
            score += 5
            reasons.append('Investor prefers frequent meetings and firm is local')

    # Follow-on preference: firms with many investments are attractive to follow-on investors
    if investor.follow_on_rate and firm.num_investments and firm.num_investments >= 10:
        score += 5
        reasons.append('Firm has active portfolio suitable for follow-ons')

    # Reserved capital and firm AUM (small bonus)
    if investor.reserved_capital and firm.aum:
        try:
            inv_cap = parse_amount(investor.reserved_capital) if isinstance(investor.reserved_capital, str) else float(investor.reserved_capital)
            aum_v = parse_amount(firm.aum) if isinstance(firm.aum, str) else float(firm.aum)
            if inv_cap >= aum_v * 0.005:
                score += 4
                reasons.append('Investor reserved capital aligns with firm size')
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
    firm_id: UUID,
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
    firm = db.query(Firm).filter(Firm.cognito_sub == firm_id).first()
    if not firm:
        raise HTTPException(status_code=404, detail="Firm not found")

    # Get all investors and calculate match scores
    investors = db.query(Investor).all()
    matches = []

    for investor in investors:
        score, reasons = calculate_investor_match_score(investor, firm)

        matches.append({
            "investor": {
                "cognito_sub": investor.cognito_sub,
                "name": investor.name,
                "email": investor.email,
                "years_active": investor.years_active,
                "num_investments": investor.num_investments,
                "board_seat": investor.board_seat,
                "location": investor.location,
                "investment_size": investor.investment_size,
            },
            "match_score": round(score, 2),
            "match_reasons": reasons
        })

    # Sort by score descending
    matches.sort(key=lambda x: x["match_score"], reverse=True)

    return matches[:5]


@app.get("/investors/{investor_id}/matching-firms", response_model=List[FirmMatch])
def get_matching_firms(
    investor_id: UUID,
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
    investor = db.query(Investor).filter(Investor.cognito_sub == investor_id).first()
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")

    # Get all firms and calculate match scores
    firms = db.query(Firm).all()
    matches = []

    for firm in firms:
        score, reasons = calculate_firm_match_score(firm, investor)

        matches.append({
            "firm": {
                "cognito_sub": firm.cognito_sub,
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

    return matches[:5]


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
                    "investor_id": investor.cognito_sub,
                    "investor_name": investor.name,
                    "firm_id": firm.cognito_sub,
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