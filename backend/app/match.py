from typing import List, Any, Dict, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.investor import Investor
from app.models.firm import Firm
from app.schemas import InvestorMatch, FirmMatch

# Router
router = APIRouter()


def calculate_investor_match_score(investor: Investor, firm: Firm) -> Tuple[float, List[str]]:
    """Calculate how well an investor matches with a firm.

    Returns (score, reasons)
    """
    score = 0.0

     # Industry match (15 points)
    if investor.industry and firm.industry:
        if investor.industry.lower() == firm.industry.lower():
            score += 5
        elif investor.industry.lower() in firm.industry.lower() or firm.industry.lower() in investor.industry.lower():
            score += 3

    # Risk tolerance vs firm stage (10 points)
    if investor.risk_tolerance and firm.risk_tolerance:
        # Heuristic: younger firms (age <5) are higher risk
        if investor.risk_tolerance.lower() == firm.risk_tolerance.lower():
            score += 10
        elif (investor.risk_tolerance.lower() == 'high' and firm.risk_tolerance == "medium" or
              investor.risk_tolerance.lower() == 'medium' and firm.risk_tolerance == "high" or
              investor.risk_tolerance.lower() == 'low' and firm.risk_tolerance == "medium" or
              investor.risk_tolerance.lower() == 'medium' and firm.risk_tolerance == "low"):
            score += 6

    # Experience level (20 points)
    if investor.years_active and firm.years_active:
        if investor.years_active >= firm.years_active:
            score += 5
        elif investor.years_active >= firm.years_active * 0.5:
            score += 3

    # Investment size vs firm needs (30 points)
    if investor.num_investments and firm.num_investments:
        if investor.num_investments <= firm.num_investments:
            score += 15
        elif investor.num_investments <= firm.num_investments * 1.5:
            score += 10
        elif investor.num_investments <= firm.num_investments * 2:
            score += 5

    # Board seat preference (15 points)
    if investor.board_seat:
        score += 10


    # Location match (20 points)
    if investor.location and firm.location:
        if investor.location.lower() == firm.location.lower():
            score += 10


     # Portfolio size (investment_size) and firm's investment count (15 points)
    if investor.investment_size and firm.investment_size:
        if investor.investment_size >= firm.investment_size:
            score += 10
        elif investor.investment_size >= firm.investment_size * 0.5:
            score += 5

    if investor.investment_stage and firm.investment_stage:
        if investor.investment_stage.lower() == firm.investment_stage.lower():
            score += 5


    # Follow-on preference (5 points)
    if investor.follow_on_rate:
            score += 5

    if investor.rate_of_return and firm.rate_of_return:
        # small bonus for higher stated ROI strings (heuristic)
        if '%' in investor.rate_of_return and '%' in firm.rate_of_return:
            try:
                investor_roi = float(investor.rate_of_return.replace('%',''))
                firm_roi = float(firm.rate_of_return.replace('%',''))
                if investor_roi >= firm_roi:
                    score += 10
                elif investor_roi >= firm_roi * 0.8:
                    score += 5
            except:
                pass

    if investor.success_rate and firm.success_rate:
        # small bonus for higher stated success rate strings (heuristic)
        if '%' in investor.success_rate and '%' in firm.success_rate:
            try:
                investor_sr = float(investor.success_rate.replace('%',''))
                firm_sr = float(firm.success_rate.replace('%',''))
                if investor_sr >= firm_sr:
                    score += 5
            except:
                pass


    # Reserved capital
    if investor.reserved_capital and firm.reserved_capital:
        try:
            inv_cap = parse_amount(investor.reserved_capital) if isinstance(investor.reserved_capital, str) else float(investor.reserved_capital)
            firm_cap = parse_amount(firm.reserved_capital) if isinstance(firm.reserved_capital, str) else float(firm.reserved_capital)
            if inv_cap >= firm_cap:
                score += 5
            elif inv_cap >= firm_cap * 0.5:
                score += 3
        except:
            pass


    # Meeting frequency preference (10 points)
    if investor.meeting_frequency and firm.meeting_frequency:
        # crude heuristic: local firms preferred for frequent meetings
        if investor.meeting_frequency.lower() == firm.meeting_frequency.lower() :
            score += 10


    return score


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


@router.get("/firms/{firm_id}/matching-investors")
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


@router.get("/investors/{investor_id}/matching-firms")
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