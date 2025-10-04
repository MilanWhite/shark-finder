from sqlalchemy import (
    Column, String, Integer, Boolean, Numeric, DateTime, Text
)
from sqlalchemy.sql import func, text as sql_text
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM
from app.database import Base

# Postgres ENUMs (match DB types exactly)
ROUND_STAGE = ENUM(
    'pre_seed', 'seed', 'series_a', 'series_b', 'growth', 'late',
    name='round_stage', create_type=False
)
INSTRUMENT_TYPE = ENUM(
    'SAFE', 'equity', 'convertible_note', 'debt', 'revenue_based',
    name='instrument_type', create_type=False
)

class Firm(Base):
    __tablename__ = "firms"

    # IDs
    id = Column(UUID(as_uuid=True), primary_key=True,
                server_default=sql_text("gen_random_uuid()"))
    owner_user_id = Column(UUID(as_uuid=True), nullable=True)  # link to auth user if you have one

    # Basics
    company_name = Column(String, nullable=False)
    website = Column(String, nullable=True)
    location = Column(String, nullable=True)

    # Profile / Tags
    stage = Column(ROUND_STAGE, nullable=False)
    sectors = Column(ARRAY(String), nullable=True)        # e.g., ['AI/ML','Fintech']
    geo_markets = Column(ARRAY(String), nullable=True)    # e.g., ['US','CA','EU']

    # Pitch fundamentals
    problem = Column(Text, nullable=True)
    solution = Column(Text, nullable=True)
    why_now = Column(Text, nullable=True)
    market_size_tam_usd = Column(Numeric(18, 2), nullable=True)
    competition = Column(Text, nullable=True)
    business_model = Column(Text, nullable=True)
    go_to_market = Column(Text, nullable=True)
    team_summary = Column(Text, nullable=True)

    # Traction & unit economics
    arr_usd = Column(Numeric(18, 2), nullable=True)
    mrr_usd = Column(Numeric(18, 2), nullable=True)
    growth_rate_mom = Column(Numeric(5, 2), nullable=True)   # %
    customers_count = Column(Integer, nullable=True)
    churn_percent = Column(Numeric(5, 2), nullable=True)     # %
    cac_usd = Column(Numeric(18, 2), nullable=True)
    ltv_usd = Column(Numeric(18, 2), nullable=True)
    burn_usd = Column(Numeric(18, 2), nullable=True)
    runway_months = Column(Integer, nullable=True)

    # Round details
    funding_min_usd = Column(Numeric(18, 2), nullable=True)
    funding_max_usd = Column(Numeric(18, 2), nullable=True)
    round_type = Column(ROUND_STAGE, nullable=True)
    valuation_expectation_usd = Column(Numeric(18, 2), nullable=True)
    instrument_options = Column(ARRAY(INSTRUMENT_TYPE), nullable=True)
    use_of_funds = Column(Text, nullable=True)

    # Signals & materials
    current_investors = Column(ARRAY(String), nullable=True)
    cap_table_url = Column(String, nullable=True)
    deck_url = Column(String, nullable=True)
    dataroom_url = Column(String, nullable=True)

    # Other
    ip_notes = Column(Text, nullable=True)
    regulatory_notes = Column(Text, nullable=True)
    impact_themes = Column(ARRAY(String), nullable=True)
    team_size = Column(Integer, nullable=True)
    founders_linkedin = Column(ARRAY(String), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)
