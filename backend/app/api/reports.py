from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
import io
import csv
from app.database import get_db
from app.models import models
from app.api import deps

router = APIRouter()

# 1. Attendance Report
@router.get("/attendance")
def get_attendance_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Attendance).join(models.Employee)
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
        
    records = query.order_by(models.Attendance.date.desc()).all()
    
    return [
        {
            "date": r.date,
            "employee_id": r.employee.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
            "check_in": r.check_in.strftime("%H:%M:%S") if r.check_in else None,
            "check_out": r.check_out.strftime("%H:%M:%S") if r.check_out else None,
            "status": r.status,
            "work_hours": r.work_hours
        }
        for r in records
    ]

@router.get("/attendance/csv")
def get_attendance_report_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Attendance).join(models.Employee)
    if start_date:
        query = query.filter(models.Attendance.date >= start_date)
    if end_date:
        query = query.filter(models.Attendance.date <= end_date)
        
    records = query.order_by(models.Attendance.date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Employee ID", "Employee Name", "Check In", "Check Out", "Status", "Work Hours"])
    
    for r in records:
        writer.writerow([
            r.date,
            r.employee.employee_id,
            f"{r.employee.first_name} {r.employee.last_name}",
            r.check_in.strftime("%H:%M:%S") if r.check_in else "N/A",
            r.check_out.strftime("%H:%M:%S") if r.check_out else "N/A",
            r.status,
            r.work_hours
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_report_{date.today()}.csv"}
    )

# 2. Leave Report
@router.get("/leaves")
def get_leave_report(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.LeaveRequest).join(models.Employee)
    if start_date:
        query = query.filter(models.LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.filter(models.LeaveRequest.end_date <= end_date)
        
    records = query.order_by(models.LeaveRequest.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "employee_id": r.employee.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
            "leave_type": r.leave_type,
            "start_date": r.start_date,
            "end_date": r.end_date,
            "status": r.status,
            "reason": r.reason,
            "admin_comments": r.admin_comments,
            "created_at": r.created_at
        }
        for r in records
    ]

@router.get("/leaves/csv")
def get_leave_report_csv(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.LeaveRequest).join(models.Employee)
    if start_date:
        query = query.filter(models.LeaveRequest.start_date >= start_date)
    if end_date:
        query = query.filter(models.LeaveRequest.end_date <= end_date)
        
    records = query.order_by(models.LeaveRequest.created_at.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Status", "Reason", "Admin Comments"])
    
    for r in records:
        writer.writerow([
            r.employee.employee_id,
            f"{r.employee.first_name} {r.employee.last_name}",
            r.leave_type,
            r.start_date,
            r.end_date,
            r.status,
            r.reason,
            r.admin_comments or "N/A"
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=leave_report_{date.today()}.csv"}
    )

# 3. Payroll Report
@router.get("/payroll")
def get_payroll_report(
    month: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Payroll).join(models.Employee)
    if month:
        query = query.filter(models.Payroll.month == month)
        
    records = query.order_by(models.Payroll.month.desc()).all()
    
    return [
        {
            "month": r.month,
            "employee_id": r.employee.employee_id,
            "employee_name": f"{r.employee.first_name} {r.employee.last_name}",
            "base_salary": r.base_salary,
            "allowances": r.allowances,
            "deductions": r.deductions,
            "net_salary": r.net_salary,
            "status": r.status,
            "processed_date": r.processed_date,
            "transaction_id": r.transaction_id
        }
        for r in records
    ]

@router.get("/payroll/csv")
def get_payroll_report_csv(
    month: Optional[str] = None,
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    query = db.query(models.Payroll).join(models.Employee)
    if month:
        query = query.filter(models.Payroll.month == month)
        
    records = query.order_by(models.Payroll.month.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Month", "Employee ID", "Employee Name", "Base Salary", "Allowances", "Deductions", "Net Salary", "Status", "Processed Date", "Transaction ID"])
    
    for r in records:
        writer.writerow([
            r.month,
            r.employee.employee_id,
            f"{r.employee.first_name} {r.employee.last_name}",
            r.base_salary,
            r.allowances,
            r.deductions,
            r.net_salary,
            r.status,
            r.processed_date,
            r.transaction_id or "N/A"
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=payroll_report_{date.today()}.csv"}
    )
