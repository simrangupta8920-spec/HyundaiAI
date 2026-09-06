import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

is_sqlite = db_url.startswith("sqlite")

# In Vercel serverless functions, the root directory is read-only.
# If SQLite is used on Vercel without PostgreSQL, redirect to /tmp/showroom.db
if is_sqlite and (os.environ.get("VERCEL") or os.environ.get("VERCEL_ENV")):
    db_url = "sqlite:////tmp/showroom.db"

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(db_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

from sqlalchemy import text

def init_db():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE conversation_session ADD COLUMN customer_state_json TEXT"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE escalation ADD COLUMN showroom_id VARCHAR(50)"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE escalation ADD COLUMN assigned_executive VARCHAR(200)"))
            conn.commit()
        except Exception:
            pass
