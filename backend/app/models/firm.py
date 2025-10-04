from sqlalchemy import Boolean, Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class Firm(Base):
    __tablename__ = "Firms"

    cognito_sub = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    risk_tolerance = Column(String, nullable=True) # e.g., Low, Medium, High
    industry = Column(String, nullable=True)
    years_active = Column(Integer, nullable=True)
    num_investments = Column(Integer, nullable=True)
    board_seat = Column(Boolean, nullable=True) # yes or no/true or false
    location = Column(String, nullable=True)
    investment_size = Column(Integer, nullable=True)
    investment_stage = Column(String, nullable=True) # Pre-seed, Seed, Series A, Series B+, Publi
    follow_on_rate = Column(Boolean, nullable=True)
    rate_of_return = Column(String, nullable=True)
    success_rate = Column(String, nullable=True)
    reserved_capital = Column(String, nullable=True)
    meeting_frequency = Column(String, nullable=True) # e.g., Weekly, Monthly, Quarterly
