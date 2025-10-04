from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Connection string from Supabase Project Settings → Database
load_dotenv()  # loads .env

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Move get_db here
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()