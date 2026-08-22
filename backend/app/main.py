from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.api import (
    auth,
    employees,
    attendance,
    leaves, 
    payroll,
    notifications,
    analytics,
    reports
)
import os

# Ensure static directories exist
os.makedirs(os.path.join("static", "profile_pictures"), exist_ok=True)
os.makedirs(os.path.join("static", "documents"), exist_ok=True)

# Create SQLite database tables if they do not exist
Base.metadata.create_all(bind=engine)

# Auto-verify and repair demo users on startup
try:
    from app.database import SessionLocal
    from app.models import models
    from app.core import security
    db = SessionLocal()
    
    demo_users = [
        {"email": "admin@dayflow.com", "password": "admin123", "role": "ADMIN"},
        {"email": "hr1@dayflow.com", "password": "hr123", "role": "HR"},
        {"email": "emp1@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
    ]
    
    needs_seeding = False
    for demo in demo_users:
        user = db.query(models.User).filter(models.User.email == demo["email"]).first()
        if not user:
            print(f"[AUTO-SEED] Demo user {demo['email']} is missing. Seeding required.", flush=True)
            needs_seeding = True
            break
        elif user.role != demo["role"]:
            print(f"[AUTO-SEED] Demo user {demo['email']} has incorrect role {user.role}. Seeding required.", flush=True)
            needs_seeding = True
            break
        elif not security.verify_password(demo["password"], user.hashed_password):
            print(f"[AUTO-SEED] Demo user {demo['email']} has invalid password hash. Seeding required.", flush=True)
            needs_seeding = True
            break
            
    db.close()
    
    if needs_seeding:
        print("[AUTO-SEED] Seeding database to restore demo credentials...", flush=True)
        try:
            import sys
            parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if parent_dir not in sys.path:
                sys.path.append(parent_dir)
            from seed import seed_db
            seed_db(drop_tables=True)
            print("[AUTO-SEED] Database seeded successfully!", flush=True)
        except Exception as seed_err:
            print(f"[AUTO-SEED] Failed to run seed_db: {seed_err}", flush=True)
    else:
        print("[AUTO-SEED] All demo credentials are valid and present. Skipping seeding.", flush=True)
except Exception as db_err:
    print(f"[AUTO-SEED] Could not verify database demo credentials: {db_err}", flush=True)

app = FastAPI(
    title="Dayflow HRMS API",
    description="Backend API for Dayflow Human Resource Management System",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

additional_origins = os.getenv("ALLOWED_ORIGINS")
if additional_origins:
    origins.extend([o.strip() for o in additional_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploading pictures/documents
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/employees", tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(leaves.router, prefix="/api/leaves", tags=["Leaves"])
app.include_router(payroll.router, prefix="/api/payroll", tags=["Payroll"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])

@app.get("/")
def read_root():
    return {
        "message": "Welcome to Dayflow HRMS API. Visit /docs for documentation.",
        "status": "online"
    }



