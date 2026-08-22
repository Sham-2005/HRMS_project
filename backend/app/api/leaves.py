from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import date, timedelta
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter()

@router.post("", response_model=schemas.LeaveResponse)
def apply_leave(
    leave_in: schemas.LeaveCreate,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    if leave_in.start_date < date.today():
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be in the past."
        )
        
    if leave_in.end_date < leave_in.start_date:
        raise HTTPException(
            status_code=400,
            detail="End date must be greater than or equal to start date."
        )
        
    # Check if there is an overlapping leave request
    overlapping = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == current_employee.id,
        models.LeaveRequest.status != "REJECTED",
        or_(
            and_(models.LeaveRequest.start_date <= leave_in.start_date, models.LeaveRequest.end_date >= leave_in.start_date),
            and_(models.LeaveRequest.start_date <= leave_in.end_date, models.LeaveRequest.end_date >= leave_in.end_date)
        )
    ).first()
    
    if overlapping:
        raise HTTPException(
            status_code=400,
            detail=f"You already have a leave request during this period ({overlapping.start_date} to {overlapping.end_date})."
        )
        
    db_leave = models.LeaveRequest(
        employee_id=current_employee.id,
        leave_type=leave_in.leave_type.upper(),
        start_date=leave_in.start_date,
        end_date=leave_in.end_date,
        reason=leave_in.reason,
        status="PENDING"
    )
    db.add(db_leave)
    db.commit()
    db.refresh(db_leave)
    return db_leave

@router.get("/me", response_model=List[schemas.LeaveResponse])
def read_my_leaves(
    skip: int = 0,
    limit: int = 100,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == current_employee.id
    ).order_by(models.LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()
    return leaves

@router.get("", response_model=List[schemas.LeaveResponse])
def read_all_leaves(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.LeaveRequest).join(models.Employee)
    
    if status_filter:
        query = query.filter(models.LeaveRequest.status == status_filter.upper())
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_term),
                models.Employee.last_name.like(search_term),
                models.Employee.employee_id.like(search_term)
            )
        )
        
    leaves = query.order_by(models.LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for l in leaves:
        l_dict = {
            "id": l.id,
            "employee_id": l.employee_id,
            "leave_type": l.leave_type,
            "start_date": l.start_date,
            "end_date": l.end_date,
            "reason": l.reason,
            "status": l.status,
            "admin_comments": l.admin_comments,
            "created_at": l.created_at,
            "employee_name": f"{l.employee.first_name} {l.employee.last_name}",
            "employee_code": l.employee.employee_id
        }
        results.append(l_dict)
        
    return results

@router.patch("/{id}/status", response_model=schemas.LeaveResponse)
def update_leave_status(
    id: int,
    status_in: schemas.LeaveUpdateStatus,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    leave = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
        
    # Prevent invalid transitions
    if leave.status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail=f"This leave request is already {leave.status} and cannot be modified."
        )
        
    new_status = status_in.status.upper()
    if new_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be either APPROVED or REJECTED"
        )
        
    leave.status = new_status
    leave.admin_comments = status_in.admin_comments
    
    # Notify employee
    db_notification = models.Notification(
        employee_id=leave.employee_id,
        title=f"Leave Request {new_status.capitalize()}",
        message=f"Your leave request from {leave.start_date} to {leave.end_date} has been {new_status.lower()} by Admin/HR. Comment: {leave.admin_comments or 'No comments.'}",
        is_read=False
    )
    db.add(db_notification)
    
    # If approved, populate attendance table for those dates with status "LEAVE"
    if new_status == "APPROVED":
        curr_date = leave.start_date
        while curr_date <= leave.end_date:
            # Check if attendance record already exists (e.g. they check in early, then get approved leave)
            # If so, update it. If not, create a new one.
            existing_att = db.query(models.Attendance).filter(
                models.Attendance.employee_id == leave.employee_id,
                models.Attendance.date == curr_date
            ).first()
            
            if existing_att:
                existing_att.status = "LEAVE"
            else:
                db_att = models.Attendance(
                    employee_id=leave.employee_id,
                    date=curr_date,
                    status="LEAVE",
                    work_hours=0.0
                )
                db.add(db_att)
            curr_date += timedelta(days=1)
            
    db.commit()
    db.refresh(leave)
    return leave
