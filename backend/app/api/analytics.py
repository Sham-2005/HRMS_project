from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta, datetime
from typing import List, Dict, Any
from app.database import get_db
from app.models import models
from app.api import deps

router = APIRouter()

@router.get("/admin")
def get_admin_analytics(
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    today = date.today()
    
    # 1. Total active employees
    total_employees = db.query(models.Employee).count()
    
    # 2. Present today
    present_today = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status.in_(["PRESENT", "HALF_DAY"])
    ).count()
    
    # 3. On Leave today
    leave_today = db.query(models.Attendance).filter(
        models.Attendance.date == today,
        models.Attendance.status == "LEAVE"
    ).count()
    
    # 4. Absent today
    absent_today = max(0, total_employees - present_today - leave_today)
    
    # 5. Pending leaves
    pending_leaves = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.status == "PENDING"
    ).count()
    
    # 6. Recent Audit Logs (Activity feed)
    recent_logs = db.query(models.AuditLog).order_by(
        models.AuditLog.timestamp.desc()
    ).limit(5).all()
    
    logs_data = []
    for log in recent_logs:
        logs_data.append({
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_email": log.user.email if log.user else "System"
        })
        
    # 7. Attendance Trend (Last 7 days)
    attendance_trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_present = db.query(models.Attendance).filter(
            models.Attendance.date == day,
            models.Attendance.status.in_(["PRESENT", "HALF_DAY"])
        ).count()
        day_leave = db.query(models.Attendance).filter(
            models.Attendance.date == day,
            models.Attendance.status == "LEAVE"
        ).count()
        day_absent = max(0, total_employees - day_present - day_leave)
        
        attendance_trend.append({
            "date": day.strftime("%b %d"),
            "Present": day_present,
            "On Leave": day_leave,
            "Absent": day_absent
        })
        
    # 8. Leave Distribution
    leave_counts = db.query(
        models.LeaveRequest.leave_type,
        func.count(models.LeaveRequest.id)
    ).filter(
        models.LeaveRequest.status == "APPROVED"
    ).group_by(models.LeaveRequest.leave_type).all()
    
    leave_distribution = [
        {"name": "Paid Leave", "value": 0},
        {"name": "Sick Leave", "value": 0},
        {"name": "Unpaid Leave", "value": 0}
    ]
    
    for ltype, count in leave_counts:
        if ltype == "PAID":
            leave_distribution[0]["value"] = count
        elif ltype == "SICK":
            leave_distribution[1]["value"] = count
        elif ltype == "UNPAID":
            leave_distribution[2]["value"] = count
            
    return {
        "kpis": {
            "total_employees": total_employees,
            "present_today": present_today,
            "leave_today": leave_today,
            "absent_today": absent_today,
            "pending_leaves": pending_leaves
        },
        "recent_activity": logs_data,
        "attendance_trend": attendance_trend,
        "leave_distribution": leave_distribution
    }

@router.get("/employee")
def get_employee_analytics(
    current_employee: models.Employee = Depends(deps.get_current_employee),
    db: Session = Depends(get_db)
):
    today = date.today()
    current_month_start = today.replace(day=1)
    
    # 1. Attendance Summary (This Month)
    total_present = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date >= current_month_start,
        models.Attendance.status == "PRESENT"
    ).count()
    
    total_half_days = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date >= current_month_start,
        models.Attendance.status == "HALF_DAY"
    ).count()
    
    total_leaves = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date >= current_month_start,
        models.Attendance.status == "LEAVE"
    ).count()
    
    # Calculate days in month elapsed
    days_elapsed = (today - current_month_start).days + 1
    # Simple calculation for absent days
    # Weekends are not counted as absent for simplicity in this MVP
    # Let's count actual recorded ABSENT status
    total_absents = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date >= current_month_start,
        models.Attendance.status == "ABSENT"
    ).count()

    # 2. Leave balance (Simple mock representation)
    # Total annual paid leaves: 15, sick: 10, unpaid: unlimited
    approved_paid = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == current_employee.id,
        models.LeaveRequest.leave_type == "PAID",
        models.LeaveRequest.status == "APPROVED"
    ).count()
    
    approved_sick = db.query(models.LeaveRequest).filter(
        models.LeaveRequest.employee_id == current_employee.id,
        models.LeaveRequest.leave_type == "SICK",
        models.LeaveRequest.status == "APPROVED"
    ).count()
    
    leave_balance = {
        "paid": max(0, 15 - approved_paid),
        "sick": max(0, 10 - approved_sick),
        "unpaid_taken": db.query(models.LeaveRequest).filter(
            models.LeaveRequest.employee_id == current_employee.id,
            models.LeaveRequest.leave_type == "UNPAID",
            models.LeaveRequest.status == "APPROVED"
        ).count()
    }
    
    # 3. Check-in status for today
    today_attendance = db.query(models.Attendance).filter(
        models.Attendance.employee_id == current_employee.id,
        models.Attendance.date == today
    ).first()
    
    today_status = {
        "checked_in": today_attendance is not None,
        "checked_out": today_attendance is not None and today_attendance.check_out is not None,
        "check_in_time": today_attendance.check_in.strftime("%H:%M:%S") if today_attendance and today_attendance.check_in else None,
        "check_out_time": today_attendance.check_out.strftime("%H:%M:%S") if today_attendance and today_attendance.check_out else None,
        "status": today_attendance.status if today_attendance else "NOT_MARKED"
    }
    
    # 4. Latest Payroll Info
    latest_payroll = db.query(models.Payroll).filter(
        models.Payroll.employee_id == current_employee.id
    ).order_by(models.Payroll.month.desc()).first()
    
    payroll_info = None
    if latest_payroll:
        payroll_info = {
            "month": latest_payroll.month,
            "net_salary": latest_payroll.net_salary,
            "status": latest_payroll.status
        }
    else:
        # Fallback to employee's standard salary structure
        payroll_info = {
            "month": today.strftime("%Y-%m"),
            "net_salary": current_employee.net_salary,
            "status": "UNPAID (Standard Package)"
        }
        
    return {
        "attendance_summary": {
            "present": total_present,
            "half_day": total_half_days,
            "leave": total_leaves,
            "absent": total_absents
        },
        "leave_balance": leave_balance,
        "today_status": today_status,
        "latest_payroll": payroll_info
    }


@router.get("/dataset-records")
def get_dataset_records(
    current_user: models.User = Depends(deps.RoleChecker(["ADMIN", "HR"])),
    db: Session = Depends(get_db)
):
    # 1. Employees (with masked/filtered data for presentation)
    employees = db.query(models.Employee).all()
    emp_data = []
    for e in employees:
        emp_data.append({
            "id": e.id,
            "employee_id": e.employee_id,
            "name": f"{e.first_name} {e.last_name}",
            "email": e.email,
            "department": e.department or "N/A",
            "designation": e.designation or "N/A",
            "joining_date": str(e.joining_date) if e.joining_date else "N/A",
            "base_salary": e.base_salary,
            "allowances": e.allowances,
            "deductions": e.deductions,
            "net_salary": e.net_salary,
            "phone": e.phone[:6] + "XXXX" if e.phone else "N/A",
            "address": e.address[:10] + "..." if e.address else "N/A"
        })

    # 2. Attendance
    attendance = db.query(models.Attendance).all()
    att_data = []
    for a in attendance:
        att_data.append({
            "id": a.id,
            "employee_id": a.employee.employee_id if a.employee else "N/A",
            "employee_name": f"{a.employee.first_name} {a.employee.last_name}" if a.employee else "N/A",
            "date": str(a.date),
            "check_in": a.check_in.strftime("%H:%M:%S") if a.check_in else "N/A",
            "check_out": a.check_out.strftime("%H:%M:%S") if a.check_out else "N/A",
            "status": a.status,
            "work_hours": a.work_hours
        })

    # 3. Leaves
    leaves = db.query(models.LeaveRequest).all()
    leave_data = []
    for l in leaves:
        leave_data.append({
            "id": l.id,
            "employee_id": l.employee.employee_id if l.employee else "N/A",
            "employee_name": f"{l.employee.first_name} {l.employee.last_name}" if l.employee else "N/A",
            "leave_type": l.leave_type,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "status": l.status,
            "reason": l.reason,
            "admin_comments": l.admin_comments or "N/A"
        })

    # 4. Payroll
    payrolls = db.query(models.Payroll).all()
    payroll_data = []
    for p in payrolls:
        payroll_data.append({
            "id": p.id,
            "employee_id": p.employee.employee_id if p.employee else "N/A",
            "employee_name": f"{p.employee.first_name} {p.employee.last_name}" if p.employee else "N/A",
            "month": p.month,
            "base_salary": p.base_salary,
            "allowances": p.allowances,
            "deductions": p.deductions,
            "net_salary": p.net_salary,
            "status": p.status,
            "processed_date": str(p.processed_date) if p.processed_date else "N/A",
            "transaction_id": p.transaction_id or "N/A"
        })

    # 5. Notifications
    notifications = db.query(models.Notification).all()
    notif_data = []
    for n in notifications:
        notif_data.append({
            "id": n.id,
            "employee_id": n.employee.employee_id if n.employee else "N/A",
            "employee_name": f"{n.employee.first_name} {n.employee.last_name}" if n.employee else "N/A",
            "title": n.title,
            "message": n.message,
            "is_read": "Read" if n.is_read else "Unread",
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M:%S") if n.created_at else "N/A"
        })

    # 6. Audit Logs
    audit_logs = db.query(models.AuditLog).all()
    audit_data = []
    for log in audit_logs:
        audit_data.append({
            "id": log.id,
            "user_email": log.user.email if log.user else "System",
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.strftime("%Y-%m-%d %H:%M:%S") if log.timestamp else "N/A"
        })

    total_records = len(emp_data) + len(att_data) + len(leave_data) + len(payroll_data) + len(notif_data) + len(audit_data)

    return {
        "stats": {
            "total_records": total_records,
            "employees_count": len(emp_data),
            "attendance_count": len(att_data),
            "leaves_count": len(leave_data),
            "payroll_count": len(payroll_data),
            "notifications_count": len(notif_data),
            "audit_logs_count": len(audit_data)
        },
        "records": {
            "employees": emp_data,
            "attendance": att_data,
            "leaves": leave_data,
            "payroll": payroll_data,
            "notifications": notif_data,
            "audit_logs": audit_data
        }
    }

