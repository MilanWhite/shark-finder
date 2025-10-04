from sqlalchemy import Column, Integer, String
from app.database import Base

class Investor(Base):
    __tablename__ = "investors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True)
    years_active = Column()
    portfolio_size = Column(Integer)
    board_seat = Column(Boolean)
    location = Column(String)
    investment_size = Column(Integer)