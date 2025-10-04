from sqlalchemy import Column, Integer, String
from app.database import Base

class Firm(Base):
    __tablename__ = "firms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String)