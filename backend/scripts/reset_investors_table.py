"""Dev-only script: drop and recreate the investors table from models.

Warning: This will DROP the investors table and all data. Use only in development.
"""
from app.database import engine, Base
from app.models.investor import Investor

if __name__ == "__main__":
    print("Dropping and recreating all tables (development only)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Done.")
