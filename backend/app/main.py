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

app = FastAPI(
    title="Dayflow HRMS API",
    description="Backend API for Dayflow Human Resource Management System",
    version="1.0.0"
)

# CORS Configuration
# Adjust origins in production
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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



