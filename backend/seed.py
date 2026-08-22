import sys
import os
import datetime

# Add the current directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models import models
from app.core import security

def seed_db(drop_tables: bool = True):
    if drop_tables:
        print("Re-creating database tables...")
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Inserting seed data...")

        # 1. Create Users
        users_to_create = [
            # Admin
            {"email": "admin@dayflow.com", "password": "admin123", "role": "ADMIN"},
            # HR Users
            {"email": "hr1@dayflow.com", "password": "hr123", "role": "HR"},
            {"email": "hr2@dayflow.com", "password": "hr123", "role": "HR"},
            # Employees
            {"email": "emp1@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp2@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp3@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp4@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp5@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp6@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp7@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
            {"email": "emp8@dayflow.com", "password": "emp123", "role": "EMPLOYEE"},
        ]

        created_users = []
        for user_data in users_to_create:
            hashed_pwd = security.get_password_hash(user_data["password"])
            db_user = models.User(
                email=user_data["email"],
                hashed_password=hashed_pwd,
                role=user_data["role"],
                is_active=True
            )
            db.add(db_user)
            created_users.append(db_user)
        db.flush()

        # 2. Create Employees
        employees_to_create = [
            # Admin Employee Profile
            {
                "email": "admin@dayflow.com", "employee_id": "EMP000",
                "first_name": "System", "last_name": "Administrator",
                "phone": "+15550100", "address": "100 Admin Plaza, San Francisco, CA",
                "department": "IT", "designation": "System Administrator",
                "base_salary": 120000.0, "allowances": 20000.0, "deductions": 10000.0, "net_salary": 130000.0
            },
            # HR Profiles
            {
                "email": "hr1@dayflow.com", "employee_id": "EMP101",
                "first_name": "Sarah", "last_name": "Connor",
                "phone": "+15550101", "address": "201 Resistance Rd, Los Angeles, CA",
                "department": "HR", "designation": "HR Director",
                "base_salary": 90000.0, "allowances": 15000.0, "deductions": 8000.0, "net_salary": 97000.0
            },
            {
                "email": "hr2@dayflow.com", "employee_id": "EMP102",
                "first_name": "Michael", "last_name": "Scott",
                "phone": "+15550102", "address": "1725 Slough Avenue, Scranton, PA",
                "department": "HR", "designation": "HR Specialist",
                "base_salary": 75000.0, "allowances": 12000.0, "deductions": 6000.0, "net_salary": 81000.0
            },
            # Employee Profiles
            {
                "email": "emp1@dayflow.com", "employee_id": "EMP001",
                "first_name": "John", "last_name": "Doe",
                "phone": "+15550103", "address": "123 Elm St, Springfield, IL",
                "department": "Engineering", "designation": "Senior Engineer",
                "base_salary": 95000.0, "allowances": 10000.0, "deductions": 8000.0, "net_salary": 97000.0
            },
            {
                "email": "emp2@dayflow.com", "employee_id": "EMP002",
                "first_name": "Jane", "last_name": "Smith",
                "phone": "+15550104", "address": "456 Oak St, Chicago, IL",
                "department": "Engineering", "designation": "Software Engineer",
                "base_salary": 80000.0, "allowances": 8000.0, "deductions": 6000.0, "net_salary": 82000.0
            },
            {
                "email": "emp3@dayflow.com", "employee_id": "EMP003",
                "first_name": "Bob", "last_name": "Johnson",
                "phone": "+15550105", "address": "789 Pine St, Boston, MA",
                "department": "Engineering", "designation": "Junior Developer",
                "base_salary": 60000.0, "allowances": 6000.0, "deductions": 4000.0, "net_salary": 62000.0
            },
            {
                "email": "emp4@dayflow.com", "employee_id": "EMP004",
                "first_name": "Alice", "last_name": "Williams",
                "phone": "+15550106", "address": "101 Maple St, Seattle, WA",
                "department": "Marketing", "designation": "Marketing Manager",
                "base_salary": 78000.0, "allowances": 8000.0, "deductions": 5000.0, "net_salary": 81000.0
            },
            {
                "email": "emp5@dayflow.com", "employee_id": "EMP005",
                "first_name": "Charlie", "last_name": "Brown",
                "phone": "+15550107", "address": "202 Birch St, Minneapolis, MN",
                "department": "Sales", "designation": "Sales Executive",
                "base_salary": 55000.0, "allowances": 15000.0, "deductions": 5000.0, "net_salary": 65000.0
            },
            {
                "email": "emp6@dayflow.com", "employee_id": "EMP006",
                "first_name": "Diana", "last_name": "Prince",
                "phone": "+15550108", "address": "777 Amazon Way, Gateway, VA",
                "department": "Legal", "designation": "Legal Counsel",
                "base_salary": 110000.0, "allowances": 15000.0, "deductions": 10000.0, "net_salary": 115000.0
            },
            {
                "email": "emp7@dayflow.com", "employee_id": "EMP007",
                "first_name": "Bruce", "last_name": "Wayne",
                "phone": "+15550109", "address": "1007 Mountain Drive, Gotham City, NJ",
                "department": "Executive", "designation": "Chief Executive Officer",
                "base_salary": 250000.0, "allowances": 50000.0, "deductions": 20000.0, "net_salary": 280000.0
            },
            {
                "email": "emp8@dayflow.com", "employee_id": "EMP008",
                "first_name": "Clark", "last_name": "Kent",
                "phone": "+15550110", "address": "344 Clinton Street, Metropolis, NY",
                "department": "Public Relations", "designation": "PR Lead",
                "base_salary": 70000.0, "allowances": 7000.0, "deductions": 4000.0, "net_salary": 73000.0
            },
        ]

        created_employees = []
        for emp_data in employees_to_create:
            # Match user by email
            matched_user = next((u for u in created_users if u.email == emp_data["email"]), None)
            user_id = matched_user.id if matched_user else None
            
            db_employee = models.Employee(
                user_id=user_id,
                employee_id=emp_data["employee_id"],
                first_name=emp_data["first_name"],
                last_name=emp_data["last_name"],
                email=emp_data["email"],
                phone=emp_data["phone"],
                address=emp_data["address"],
                department=emp_data["department"],
                designation=emp_data["designation"],
                joining_date=datetime.date.today() - datetime.timedelta(days=180),
                base_salary=emp_data["base_salary"],
                allowances=emp_data["allowances"],
                deductions=emp_data["deductions"],
                net_salary=emp_data["net_salary"]
            )
            db.add(db_employee)
            created_employees.append(db_employee)
        db.flush()

        # 3. Create Attendance Records for last 7 days (for all employees)
        print("Creating attendance records...")
        today = datetime.date.today()
        # Employee profiles start from index 3 (created_employees[3] is John Doe)
        for emp in created_employees:
            # Let's seed last 7 days (skipping weekends for simplicity, or just seeding daily check-ins)
            for i in range(7, 0, -1):
                day = today - datetime.timedelta(days=i)
                # Check if it was a weekend
                if day.weekday() >= 5:
                    continue  # Skip weekends
                
                # Mock status
                import random
                rand = random.random()
                if rand < 0.85:
                    status = "PRESENT"
                    check_in = datetime.time(9, random.randint(0, 15), random.randint(0, 59))
                    check_out = datetime.time(17, random.randint(30, 59), random.randint(0, 59))
                    work_hours = 8.5
                elif rand < 0.93:
                    status = "HALF_DAY"
                    check_in = datetime.time(9, random.randint(0, 5), random.randint(0, 59))
                    check_out = datetime.time(13, random.randint(0, 10), random.randint(0, 59))
                    work_hours = 4.1
                else:
                    status = "ABSENT"
                    check_in = None
                    check_out = None
                    work_hours = 0.0

                db_attendance = models.Attendance(
                    employee_id=emp.id,
                    date=day,
                    check_in=check_in,
                    check_out=check_out,
                    status=status,
                    work_hours=work_hours
                )
                db.add(db_attendance)

        # 4. Create Leave Requests
        print("Creating leave requests...")
        # emp1: Approved leave in past
        db.add(models.LeaveRequest(
            employee_id=created_employees[3].id,  # emp1
            leave_type="SICK",
            start_date=today - datetime.timedelta(days=12),
            end_date=today - datetime.timedelta(days=11),
            reason="Flu",
            status="APPROVED",
            admin_comments="Get well soon!"
        ))
        # emp2: Pending leave in future
        db.add(models.LeaveRequest(
            employee_id=created_employees[4].id,  # emp2
            leave_type="PAID",
            start_date=today + datetime.timedelta(days=5),
            end_date=today + datetime.timedelta(days=7),
            reason="Family vacation",
            status="PENDING"
        ))
        # emp3: Rejected leave
        db.add(models.LeaveRequest(
            employee_id=created_employees[5].id,  # emp3
            leave_type="UNPAID",
            start_date=today - datetime.timedelta(days=15),
            end_date=today - datetime.timedelta(days=14),
            reason="Personal work",
            status="REJECTED",
            admin_comments="Denied due to high project workload."
        ))

        # 5. Create Payroll Records
        print("Creating payroll records...")
        # Seed for last month (e.g. 2026-07) for all employees
        for emp in created_employees:
            db_payroll = models.Payroll(
                employee_id=emp.id,
                month="2026-07",
                base_salary=emp.base_salary,
                allowances=emp.allowances,
                deductions=emp.deductions,
                net_salary=emp.net_salary,
                status="PAID",
                processed_date=today - datetime.timedelta(days=22),
                transaction_id=f"TXN-202607-{emp.employee_id}"
            )
            db.add(db_payroll)

        # 6. Create Notifications
        print("Creating notifications...")
        for emp in created_employees:
            db.add(models.Notification(
                employee_id=emp.id,
                title="Welcome to Dayflow",
                message=f"Hello {emp.first_name}, welcome to the Dayflow Human Resource Management System.",
                is_read=False,
                created_at=datetime.datetime.utcnow() - datetime.timedelta(days=30)
            ))
            
        # Add a specific unread notification for emp1
        db.add(models.Notification(
            employee_id=created_employees[3].id,
            title="Monthly Payslip Available",
            message="Your payslip for July 2026 is now available for download.",
            is_read=False,
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=22)
        ))

        # 7. Create Audit Logs
        print("Creating audit logs...")
        db.add(models.AuditLog(
            user_id=created_users[0].id,  # Admin
            action="SEED_DATABASE",
            details="System database was initialized with demo seed data.",
            timestamp=datetime.datetime.utcnow()
        ))

        db.commit()
        print("Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
