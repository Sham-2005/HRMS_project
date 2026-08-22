import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Default to SQLite database in the current folder if environment variable not set
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dayflow.db")

# If it's a relative SQLite URL, make it absolute relative to the 'backend' directory
if DATABASE_URL.startswith("sqlite"):
    url_path = DATABASE_URL.split("sqlite:///")[-1]
    if not os.path.isabs(url_path.replace("./", "")):
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        clean_path = url_path.replace("./", "")
        abs_db_path = os.path.abspath(os.path.join(backend_dir, clean_path))
        DATABASE_URL = f"sqlite:///{abs_db_path}"

# For SQLite, we need connect_args={"check_same_thread": False}
print(f"[DATABASE] Resolved DATABASE_URL: {DATABASE_URL}", flush=True)
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
