import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the parent directory to the python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import Base, get_db
from app.core import security

# Use a test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_dayflow.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Run tests
    yield
    
    # Tear down
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_dayflow.db"):
        os.remove("./test_dayflow.db")

client = TestClient(app)

def test_registration_and_login():
    # 1. Register Employee
    reg_response = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_T01",
            "first_name": "Test",
            "last_name": "User",
            "email": "test@dayflow.com",
            "password": "password123",
            "role": "EMPLOYEE"
        }
    )
    assert reg_response.status_code == 200
    assert reg_response.json()["email"] == "test@dayflow.com"
    assert reg_response.json()["role"] == "EMPLOYEE"

    # 2. Login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "test@dayflow.com",
            "password": "password123"
        }
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
    
    # Return tokens
    return login_response.json()["access_token"]

def test_rbac_restrictions():
    # Register an admin
    reg_admin = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_T02",
            "first_name": "Test",
            "last_name": "Admin",
            "email": "testadmin@dayflow.com",
            "password": "adminpassword",
            "role": "ADMIN"
        }
    )
    assert reg_admin.status_code == 200
    
    # Login Employee
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "password123"}).json()["access_token"]
    # Login Admin
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "adminpassword"}).json()["access_token"]
    
    headers_emp = {"Authorization": f"Bearer {emp_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # Try accessing admin analytics
    resp_emp = client.get("/api/analytics/admin", headers=headers_emp)
    assert resp_emp.status_code == 403  # Forbidden
    
    resp_admin = client.get("/api/analytics/admin", headers=headers_admin)
    assert resp_admin.status_code == 200  # Allowed

def test_attendance_flow():
    # Login
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {emp_token}"}
    
    # 1. Check in
    ci_resp = client.post("/api/attendance/check-in", headers=headers)
    assert ci_resp.status_code == 200
    assert ci_resp.json()["status"] == "PRESENT"
    
    # Double check in should fail
    ci_resp_double = client.post("/api/attendance/check-in", headers=headers)
    assert ci_resp_double.status_code == 400
    
    # 2. Check out
    co_resp = client.post("/api/attendance/check-out", headers=headers)
    assert co_resp.status_code == 200
    
    # Double check out should fail
    co_resp_double = client.post("/api/attendance/check-out", headers=headers)
    assert co_resp_double.status_code == 400

def test_leaves_flow():
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "password123"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "adminpassword"}).json()["access_token"]
    
    headers_emp = {"Authorization": f"Bearer {emp_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # 1. Apply Leave
    import datetime
    today = datetime.date.today()
    start = today + datetime.timedelta(days=10)
    end = today + datetime.timedelta(days=12)
    
    leave_resp = client.post(
        "/api/leaves",
        headers=headers_emp,
        json={
            "leave_type": "PAID",
            "start_date": str(start),
            "end_date": str(end),
            "reason": "Annual rest"
        }
    )
    assert leave_resp.status_code == 200
    leave_id = leave_resp.json()["id"]
    assert leave_resp.json()["status"] == "PENDING"
    
    # 2. Admin Approve
    approve_resp = client.patch(
        f"/api/leaves/{leave_id}/status",
        headers=headers_admin,
        json={
            "status": "APPROVED",
            "admin_comments": "Enjoy your time off!"
        }
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "APPROVED"
    assert approve_resp.json()["admin_comments"] == "Enjoy your time off!"
    
    # Try modifying status again (should fail)
    reject_resp = client.patch(
        f"/api/leaves/{leave_id}/status",
        headers=headers_admin,
        json={
            "status": "REJECTED"
        }
    )
    assert reject_resp.status_code == 400

def test_payroll_flow():
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "password123"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "adminpassword"}).json()["access_token"]
    
    headers_emp = {"Authorization": f"Bearer {emp_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # Get employee ID
    emp_profile = client.get("/api/auth/me", headers=headers_emp).json()["employee"]
    emp_id = emp_profile["id"]
    
    # Employee tries to update salary structure (should fail)
    sal_resp_emp = client.put(
        f"/api/payroll/employees/{emp_id}/salary-structure",
        headers=headers_emp,
        json={
            "base_salary": 90000.0,
            "allowances": 10000.0,
            "deductions": 5000.0
        }
    )
    assert sal_resp_emp.status_code == 403
    
    # Admin updates salary structure
    sal_resp_admin = client.put(
        f"/api/payroll/employees/{emp_id}/salary-structure",
        headers=headers_admin,
        json={
            "base_salary": 90000.0,
            "allowances": 15000.0,
            "deductions": 5000.0
        }
    )
    assert sal_resp_admin.status_code == 200
    assert sal_resp_admin.json()["net_salary"] == 100000.0
