from sqlalchemy import Column, Integer, String, Boolean
from app.database import Base


class Investor(Base):
    __tablename__ = "investors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    years_active = Column(Integer, nullable=True)
    portfolio_size = Column(Integer, nullable=True)
    board_seat = Column(Boolean, nullable=True)
    location = Column(String, nullable=True)
    investment_size = Column(Integer, nullable=True)