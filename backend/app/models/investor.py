from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class Investor(Base):
    __tablename__ = "investors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    risk_tolerance = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    years_active = Column(Integer, nullable=True)
    num_investments = Column(Integer, nullable=True)
    board_seat = Column(Boolean, nullable=True)
    location = Column(String, nullable=True)
    investment_size = Column(Integer, nullable=True)
    investment_stage = Column(String, nullable=True)
    revenue_stage = Column(String, nullable=True)
    follow_on_rate = Column(Boolean, nullable=True)
    rate_of_return = Column(String, nullable=True)
    success_rate = Column(String, nullable=True)
    reserved_capital = Column(String, nullable=True)
    meeting_frequency = Column(String, nullable=True)
    