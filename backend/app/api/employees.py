from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps
import os
import shutil
import datetime

router = APIRouter()

@router.get("", response_model=List[schemas.EmployeeWithUserResponse])
def read_employees(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    department: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Employee)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_filter),
                models.Employee.last_name.like(search_filter),
                models.Employee.employee_id.like(search_filter),
                models.Employee.email.like(search_filter)
            )
        )
        
    if department:
        query = query.filter(models.Employee.department == department)
        
    employees = query.offset(skip).limit(limit).all()
    
    # Map users' roles to response
    results = []
    for emp in employees:
        role = None
        if emp.user:
            role = emp.user.role
        
        # We convert to a dict to inject role
        emp_dict = {
            "id": emp.id,
            "employee_id": emp.employee_id,
            "user_id": emp.user_id,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "phone": emp.phone,
            "address": emp.address,
            "profile_picture": emp.profile_picture,
            "department": emp.department,
            "designation": emp.designation,
            "joining_date": emp.joining_date,
            "base_salary": emp.base_salary,
            "allowances": emp.allowances,
            "deductions": emp.deductions,
            "net_salary": emp.net_salary,
            "created_at": emp.created_at,
            "updated_at": emp.updated_at,
            "role": role
        }
        results.append(emp_dict)
        
    return results

@router.get("/{id}", response_model=schemas.EmployeeWithUserResponse)
def read_employee_by_id(
    id: int,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Security: check if employee is viewing their own profile, or user is admin/HR
    if current_user.role not in ["ADMIN", "HR"] and employee.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this employee's profile"
        )
        
    role = employee.user.role if employee.user else None
    
    emp_dict = {
        "id": employee.id,
        "employee_id": employee.employee_id,
        "user_id": employee.user_id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "email": employee.email,
        "phone": employee.phone,
        "address": employee.address,
        "profile_picture": employee.profile_picture,
        "department": employee.department,
        "designation": employee.designation,
        "joining_date": employee.joining_date,
        "base_salary": employee.base_salary,
        "allowances": employee.allowances,
        "deductions": employee.deductions,
        "net_salary": employee.net_salary,
        "created_at": employee.created_at,
        "updated_at": employee.updated_at,
        "role": role
    }
    return emp_dict

@router.put("/{id}", response_model=schemas.EmployeeResponse)
def update_employee(
    id: int,
    emp_in: schemas.EmployeeUpdate,
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Check authorization
    is_self = (employee.user_id == current_user.id)
    is_admin_or_hr = (current_user.role in ["ADMIN", "HR"])
    
    if not is_self and not is_admin_or_hr:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to edit this profile"
        )
        
    # Fields to update
    update_data = emp_in.dict(exclude_unset=True)
    
    if not is_admin_or_hr:
        # Employee can only update these three fields
        allowed_employee_fields = ["phone", "address", "profile_picture"]
        update_data = {k: v for k, v in update_data.items() if k in allowed_employee_fields}
        
    # Handle other fields if admin/HR
    for field, value in update_data.items():
        setattr(employee, field, value)
        
    # Save updates
    employee.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(employee)
    return employee

# Upload profile picture endpoint
@router.post("/{id}/profile-picture")
def upload_profile_picture(
    id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    # Check auth
    if current_user.role not in ["ADMIN", "HR"] and employee.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    # Create static uploads directory
    uploads_dir = os.path.join("static", "profile_pictures")
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Save file
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"emp_{employee.employee_id}{file_extension}"
    file_path = os.path.join(uploads_dir, file_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update employee model
    # Convert path to web URL path (e.g. /static/profile_pictures/emp_001.png)
    web_path = f"/static/profile_pictures/{file_name}"
    employee.profile_picture = web_path
    employee.updated_at = datetime.datetime.utcnow()
    
    db.commit()
    return {"profile_picture": web_path}
