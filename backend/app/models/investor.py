from sqlalchemy import (
    Column, String, Integer, Boolean, Numeric, DateTime
)
from sqlalchemy.sql import func, text as sql_text
from sqlalchemy.dialects.postgresql import UUID, ARRAY, ENUM
from sqlalchemy.orm import synonym
from app.database import Base

# Postgres ENUMs (match DB types exactly)
INVESTOR_TYPE = ENUM(
    'angel', 'vc_fund', 'cvc', 'family_office', 'accelerator', 'private_equity',
    name='investor_type', create_type=False
)
ROUND_STAGE = ENUM(
    'pre_seed', 'seed', 'series_a', 'series_b', 'growth', 'late',
    name='round_stage', create_type=False
)
INSTRUMENT_TYPE = ENUM(
    'SAFE', 'equity', 'convertible_note', 'debt', 'revenue_based',
    name='instrument_type', create_type=False
)
BOARD_PREF = ENUM(
    'none', 'observer', 'seat_optional', 'seat_required',
    name='board_pref', create_type=False
)

class Investor(Base):
    __tablename__ = "investors"

    # IDs
    id = Column(UUID(as_uuid=True), primary_key=True,
                server_default=sql_text("gen_random_uuid()"))
    # Optional: link to AWS Cognito user (keep unique, not the PK)
    cognito_sub = Column(UUID(as_uuid=True), unique=True, nullable=True)

    # Identity
    display_name = Column(String, nullable=False, unique=True)
    # Back-compat alias if other parts of your app expect `.name`
    name = synonym("display_name")

    contact_email = Column(String, unique=True, nullable=True)
    website = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)

    # Mandate
    investor_type = Column(INVESTOR_TYPE, nullable=False)
    fund_name = Column(String, nullable=True)
    fund_size_usd = Column(Numeric(18, 2), nullable=True)

    check_min_usd = Column(Numeric(18, 2), nullable=True)
    check_max_usd = Column(Numeric(18, 2), nullable=True)

    target_stages = Column(ARRAY(ROUND_STAGE), nullable=True)
    sectors = Column(ARRAY(String), nullable=True)      # e.g., ['AI/ML','Fintech']
    geo_focus = Column(ARRAY(String), nullable=True)    # e.g., ['US','CA','EU']

    lead_preference = Column(Boolean, nullable=False, default=False)
    board_pref = Column(BOARD_PREF, nullable=False, default='none')

    ownership_target_min = Column(Numeric(5, 2), nullable=True)  # %
    ownership_target_max = Column(Numeric(5, 2), nullable=True)  # %
    follow_on_reserve_percent = Column(Numeric(5, 2), nullable=True)  # %
    instrument_prefs = Column(ARRAY(INSTRUMENT_TYPE), nullable=True)

    impact_themes = Column(ARRAY(String), nullable=True)  # e.g., ['climate','healthcare']
    decision_speed_days = Column(Integer, nullable=True)

    active = Column(Boolean, nullable=False, default=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(),
                        onupdate=func.now(), nullable=False)
