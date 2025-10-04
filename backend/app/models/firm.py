from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class Firm(Base):
    __tablename__ = "firms"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    industry = Column(String)
    aum = Column(String, nullable=True) # Assets Under Management
    location = Column(String, nullable=True)
    num_investments = Column(Integer, nullable=True)
    age = Column(Integer, nullable=True)