from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, datetime, time
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter()

@router.post("/check-in", response_model=schemas.AttendanceResponse)
def check_in(
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    today = date.today()
    now_time = datetime.now().time()
    
    # Check if attendance already exists for today
    existing = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date == today
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already checked in today."
        )
        
    # Create new attendance record
    db_attendance = models.Attendance(
        employee_id=current_employee.id,
        date=today,
        check_in=now_time,
        status="PRESENT",
        work_hours=0.0
    )
    db.add(db_attendance)
    
    # Notification for check-in
    db_notification = models.Notification(
        employee_id=current_employee.id,
        title="Checked In Successfully",
        message=f"You checked in today at {now_time.strftime('%H:%M:%S')}.",
        is_read=False
    )
    db.add(db_notification)
    
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@router.post("/check-out", response_model=schemas.AttendanceResponse)
def check_out(
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    today = date.today()
    now_time = datetime.now().time()
    
    # Get attendance record
    attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date == today
    ).first()
    
    if not attendance:
        raise HTTPException(
            status_code=400,
            detail="You must check in first before checking out."
        )
        
    if attendance.check_out:
        raise HTTPException(
            status_code=400,
            detail="You have already checked out today."
        )
        
    # Calculate hours
    check_in_dt = datetime.combine(today, attendance.check_in)
    check_out_dt = datetime.combine(today, now_time)
    duration = check_out_dt - check_in_dt
    hours = duration.total_seconds() / 3600.0
    
    # Update attendance
    attendance.check_out = now_time
    attendance.work_hours = round(hours, 2)
    
    # Rules: check if half-day
    if hours < 4.0:
        attendance.status = "HALF_DAY"
    else:
        attendance.status = "PRESENT"
        
    # Notification for check-out
    db_notification = models.Notification(
        employee_id=current_employee.id,
        title="Checked Out Successfully",
        message=f"You checked out today at {now_time.strftime('%H:%M:%S')}. Total work hours: {attendance.work_hours}.",
        is_read=False
    )
    db.add(db_notification)
    
    db.commit()
    db.refresh(attendance)
    return attendance

@router.get("/me", response_model=List[schemas.AttendanceResponse])
def read_my_attendance(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    query = db.query(models.Attendance).filter(models.Attendance.employee_id == current_employee.id)
    
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
        
    # Order by date descending
    records = query.order_by(models.Attendance.date.desc()).offset(skip).limit(limit).all()
    return records

@router.get("", response_model=List[schemas.AttendanceResponse])
def read_all_attendance(
    skip: int = 0,
    limit: int = 100,
    date_filter: Optional[date] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Attendance).join(models.Employee)
    
    if date_filter:
        query = query.filter(models.Attendance.date == date_filter)
    if status_filter:
        query = query.filter(models.Attendance.status == status_filter.upper())
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_term),
                models.Employee.last_name.like(search_term),
                models.Employee.employee_id.like(search_term)
            )
        )
        
    records = query.order_by(models.Attendance.date.desc()).offset(skip).limit(limit).all()
    
    # Inject employee metadata for display
    results = []
    for r in records:
        r_dict = {
            "id": r.id,
            "employee_id": r.employee_id,
            "date": r.date,
            "check_in": r.check_in,
            "check_out": r.check_out,
            "status": r.status,
            "work_hours": r.work_hours,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
            "employee_code": r.employee.employee_id
        }
        results.append(r_dict)
        
    return results
