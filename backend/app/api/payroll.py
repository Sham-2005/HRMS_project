from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.api import deps

router = APIRouter()

@router.get("/me", response_model=List[schemas.PayrollResponse])
def read_my_payroll(
    skip: int = 0,
    limit: int = 100,
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    payrolls = db.query(models.Payroll).filter(
        models.Payroll.employee_id == current_employee.id
    ).order_by(models.Payroll.month.desc()).offset(skip).limit(limit).all()
    return payrolls

@router.get("", response_model=List[schemas.PayrollResponse])
def read_all_payroll(
    skip: int = 0,
    limit: int = 100,
    month: Optional[str] = None,
    search: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Payroll).join(models.Employee)
    
    if month:
        query = query.filter(models.Payroll.month == month)
        
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                models.Employee.first_name.like(search_term),
                models.Employee.last_name.like(search_term),
                models.Employee.employee_id.like(search_term)
            )
        )
        
    payrolls = query.order_by(models.Payroll.month.desc()).offset(skip).limit(limit).all()
    
    results = []
    for p in payrolls:
        p_dict = {
            "id": p.id,
            "employee_id": p.employee_id,
            "month": p.month,
            "base_salary": p.base_salary,
            "allowances": p.allowances,
            "deductions": p.deductions,
            "net_salary": p.net_salary,
            "status": p.status,
            "processed_date": p.processed_date,
            "transaction_id": p.transaction_id,
            "employee_name": f"{p.employee.first_name} {p.employee.last_name}",
            "employee_code": p.employee.employee_id
        }
        results.append(p_dict)
        
    return results

# Update Employee Salary Structure
@router.put("/employees/{id}/salary-structure", response_model=schemas.EmployeeResponse)
def update_salary_structure(
    id: int,
    salary_in: schemas.SalaryStructureUpdate,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    old_base = employee.base_salary
    old_allowances = employee.allowances
    old_deductions = employee.deductions
    old_net = employee.net_salary
    
    new_base = salary_in.base_salary
    new_allowances = salary_in.allowances
    new_deductions = salary_in.deductions
    new_net = new_base + new_allowances - new_deductions
    
    # Update employee model
    employee.base_salary = new_base
    employee.allowances = new_allowances
    employee.deductions = new_deductions
    employee.net_salary = new_net
    employee.updated_at = datetime.utcnow()
    
    # Audit log entry (Redacted specific monetary values to prevent PII/financial leakage in audit logs)
    audit_details = (
        f"Updated salary structure for employee {employee.first_name} {employee.last_name} (ID: {employee.employee_id}). "
        f"Old values: [REDACTED], New values: [REDACTED]."
    )
    db_audit = models.AuditLog(
        user_id=current_user.id,
        action="UPDATE_SALARY_STRUCTURE",
        details=audit_details
    )
    db.add(db_audit)
    
    # Notification for employee
    db_notification = models.Notification(
        employee_id=employee.id,
        title="Salary Structure Updated",
        message=(
            f"Your salary structure has been updated by Admin/HR. "
            f"New Net Salary: {new_net:.2f} (Base: {new_base:.2f}, Allowances: {new_allowances:.2f}, Deductions: {new_deductions:.2f})."
        ),
        is_read=False
    )
    db.add(db_notification)
    
    db.commit()
    db.refresh(employee)
    return employee

# Process Payroll for a Month
@router.post("/process", status_code=201)
def process_payroll(
    month: str,  # YYYY-MM
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    # Validate format YYYY-MM
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        raise HTTPException(status_code=400, detail="Month must be in YYYY-MM format")
        
    # Get all active employees
    employees = db.query(models.Employee).all()
    
    processed_count = 0
    skipped_count = 0
    
    for emp in employees:
        # Check if payroll already exists for this employee and month
        existing = db.query(models.Payroll).filter(
            models.Payroll.employee_id == emp.id,
            models.Payroll.month == month
        ).first()
        
        if existing:
            skipped_count += 1
            continue
            
        # Create payroll record from employee's current salary structure
        db_payroll = models.Payroll(
            employee_id=emp.id,
            month=month,
            base_salary=emp.base_salary,
            allowances=emp.allowances,
            deductions=emp.deductions,
            net_salary=emp.net_salary,
            status="PAID",  # Auto mark as paid for simple demo
            processed_date=date.today(),
            transaction_id=f"TXN-{month.replace('-', '')}-{emp.employee_id}"
        )
        db.add(db_payroll)
        
        # Notification
        db_notification = models.Notification(
            employee_id=emp.id,
            title=f"Payroll processed for {month}",
            message=f"Your payroll for {month} has been processed and paid. Net Amount: {emp.net_salary:.2f}.",
            is_read=False
        )
        db.add(db_notification)
        processed_count += 1
        
    db.commit()
    
    # Audit log
    audit_details = f"Processed payroll for month {month}. Processed: {processed_count}, Skipped (already exists): {skipped_count}."
    db_audit = models.AuditLog(
        user_id=current_user.id,
        action="PROCESS_PAYROLL",
        details=audit_details
    )
    db.add(db_audit)
    db.commit()
    
    return {
        "detail": f"Payroll processing complete.",
        "processed": processed_count,
        "skipped": skipped_count
    }
