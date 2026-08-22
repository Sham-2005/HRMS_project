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

# Use an in-memory SQLite database for testing to avoid Windows file lock issues
from sqlalchemy.pool import StaticPool
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
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
    engine.dispose()

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
            "password": "P@ssword12345!",
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
            "password": "P@ssword12345!"
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
            "password": "AdminP@ssword123!",
            "role": "ADMIN"
        }
    )
    assert reg_admin.status_code == 200
    
    # Login Employee
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "P@ssword12345!"}).json()["access_token"]
    # Login Admin
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "AdminP@ssword123!"}).json()["access_token"]
    
    headers_emp = {"Authorization": f"Bearer {emp_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    
    # Try accessing admin analytics
    resp_emp = client.get("/api/analytics/admin", headers=headers_emp)
    assert resp_emp.status_code == 403  # Forbidden
    
    resp_admin = client.get("/api/analytics/admin", headers=headers_admin)
    assert resp_admin.status_code == 200  # Allowed

def test_attendance_flow():
    # Login
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "P@ssword12345!"}).json()["access_token"]
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
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "P@ssword12345!"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "AdminP@ssword123!"}).json()["access_token"]
    
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
    emp_token = client.post("/api/auth/login", json={"email": "test@dayflow.com", "password": "P@ssword12345!"}).json()["access_token"]
    admin_token = client.post("/api/auth/login", json={"email": "testadmin@dayflow.com", "password": "AdminP@ssword123!"}).json()["access_token"]
    
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

def test_secure_password_hashing():
    from app.models import models
    from app.core import security
    
    # 1. Register a new user
    email = "hashed_test@dayflow.com"
    pwd = "Secure@2026Pwd!"
    reg_response = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_HASH_01",
            "first_name": "Hash",
            "last_name": "Test",
            "email": email,
            "password": pwd,
            "role": "EMPLOYEE"
        }
    )
    assert reg_response.status_code == 200
    reg_data = reg_response.json()
    assert "hashed_password" not in reg_data
    assert "password" not in reg_data
    
    # 2. Directly verify database storage is hashed
    db = TestingSessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.email == email).first()
        assert db_user is not None
        assert db_user.hashed_password != pwd
        assert security.is_bcrypt_hash(db_user.hashed_password)
    finally:
        db.close()
        
    # 3. Verify incorrect password login fails
    login_fail = client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": "wrongpassword"
        }
    )
    assert login_fail.status_code == 401
    assert "Incorrect email or password" in login_fail.json()["detail"]
    
    # 4. Verify password hashes are never returned by login responses
    login_success = client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": pwd
        }
    )
    assert login_success.status_code == 200
    login_data = login_success.json()
    assert "hashed_password" not in login_data
    assert "password" not in login_data
    
    # 5. Verify plaintext migration
    plain_email = "plain_test@dayflow.com"
    plain_pwd = "legacyplaintext123"
    
    db = TestingSessionLocal()
    try:
        # Create a user with plaintext password directly in the database
        db_user = models.User(
            email=plain_email,
            hashed_password=plain_pwd, # Storing as plaintext directly
            role="EMPLOYEE",
            is_active=True
        )
        db.add(db_user)
        db.commit()
        
        # Verify it is indeed plaintext in DB first
        db.refresh(db_user)
        assert db_user.hashed_password == plain_pwd
        assert not security.is_bcrypt_hash(db_user.hashed_password)
    finally:
        db.close()
        
    # Attempt login with plaintext password
    login_mig_resp = client.post(
        "/api/auth/login",
        json={
            "email": plain_email,
            "password": plain_pwd
        }
    )
    assert login_mig_resp.status_code == 200
    
    # Verify it has been migrated in the database to a secure hash
    db = TestingSessionLocal()
    try:
        db_user = db.query(models.User).filter(models.User.email == plain_email).first()
        assert db_user is not None
        assert db_user.hashed_password != plain_pwd
        assert security.is_bcrypt_hash(db_user.hashed_password)
        
        # Verify we can login again now that it is hashed
        login_again_resp = client.post(
            "/api/auth/login",
            json={
                "email": plain_email,
                "password": plain_pwd
            }
        )
        assert login_again_resp.status_code == 200
    finally:
        db.close()

def test_password_policy_enforcement():
    # 1. Test weak password (too short)
    res_short = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_01",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_short@dayflow.com",
            "password": "Short1!",
            "role": "EMPLOYEE"
        }
    )
    assert res_short.status_code == 422
    assert "Password must contain at least 12 characters." in res_short.text
    
    # 2. Test weak password (no uppercase)
    res_no_upper = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_02",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_noupper@dayflow.com",
            "password": "weakpassword123!",
            "role": "EMPLOYEE"
        }
    )
    assert res_no_upper.status_code == 422
    assert "Password must contain an uppercase letter." in res_no_upper.text
    
    # 3. Test weak password (no lowercase)
    res_no_lower = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_03",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_nolower@dayflow.com",
            "password": "WEAKPASSWORD123!",
            "role": "EMPLOYEE"
        }
    )
    assert res_no_lower.status_code == 422
    assert "Password must contain a lowercase letter." in res_no_lower.text
    
    # 4. Test weak password (no number)
    res_no_digit = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_04",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_nodigit@dayflow.com",
            "password": "WeakPassword!",
            "role": "EMPLOYEE"
        }
    )
    assert res_no_digit.status_code == 422
    assert "Password must contain a number." in res_no_digit.text
    
    # 5. Test weak password (no special char)
    res_no_spec = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_05",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_nospec@dayflow.com",
            "password": "WeakPassword123",
            "role": "EMPLOYEE"
        }
    )
    assert res_no_spec.status_code == 422
    assert "Password must contain a special character." in res_no_spec.text
    
    # 6. Test too long password (over 72 characters)
    res_too_long = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_WEAK_06",
            "first_name": "Weak",
            "last_name": "User",
            "email": "weak_toolong@dayflow.com",
            "password": "A" * 73 + "a1!",
            "role": "EMPLOYEE"
        }
    )
    assert res_too_long.status_code == 422
    assert "Password must be at most 72 characters long." in res_too_long.text
    
    # 7. Test valid strong password registration succeeds
    res_valid = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_STRONG_01",
            "first_name": "Strong",
            "last_name": "User",
            "email": "strong_user@dayflow.com",
            "password": "Sham@2026HRMS!",
            "role": "EMPLOYEE"
        }
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["email"] == "strong_user@dayflow.com"

def test_sensitive_data_protection():
    from sqlalchemy import text
    import base64
    from app.models import models
    
    # 1. Register and Login as Admin to create and configure an employee
    admin_email = "sec_admin@dayflow.com"
    admin_pwd = "AdminP@ssword123!"
    
    db = TestingSessionLocal()
    try:
        existing_admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if existing_admin:
            db.delete(existing_admin)
            db.commit()
    finally:
        db.close()
        
    admin_reg = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_SEC_ADMIN",
            "first_name": "Security",
            "last_name": "Admin",
            "email": admin_email,
            "password": admin_pwd,
            "role": "ADMIN"
        }
    )
    assert admin_reg.status_code == 200
    
    admin_login = client.post(
        "/api/auth/login",
        json={"email": admin_email, "password": admin_pwd}
    )
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    emp_email = "sec_test_emp@dayflow.com"
    emp_phone = "+19998887777"
    emp_addr = "123 Security Avenue, Crypt City"
    emp_base = 85000.0
    
    # Clean up existing test employee from previous runs if any
    db = TestingSessionLocal()
    try:
        existing_user = db.query(models.User).filter(models.User.email == emp_email).first()
        if existing_user:
            db.delete(existing_user)
            db.commit()
    finally:
        db.close()
    
    # Register test employee
    reg_resp = client.post(
        "/api/auth/register",
        json={
            "employee_id": "EMP_SEC_01",
            "first_name": "Security",
            "last_name": "Test",
            "email": emp_email,
            "password": "StrongPassword123!",
            "role": "EMPLOYEE"
        }
    )
    assert reg_resp.status_code == 200
    
    # Get Employee ID from the database using User email
    db = TestingSessionLocal()
    try:
        db_emp = db.query(models.Employee).filter(models.Employee.email == emp_email).first()
        emp_id = db_emp.id
    finally:
        db.close()
    
    # Update employee contact details (phone, address) as Admin
    update_resp = client.put(
        f"/api/employees/{emp_id}",
        headers=admin_headers,
        json={
            "first_name": "Security",
            "last_name": "Test",
            "phone": emp_phone,
            "address": emp_addr
        }
    )
    assert update_resp.status_code == 200
    
    # Update salary structure as Admin
    sal_resp = client.put(
        f"/api/payroll/employees/{emp_id}/salary-structure",
        headers=admin_headers,
        json={
            "base_salary": emp_base,
            "allowances": 5000.0,
            "deductions": 2000.0
        }
    )
    assert sal_resp.status_code == 200
    
    # Check that API returns transparently decrypted data to admin
    assert sal_resp.json()["base_salary"] == emp_base
    assert update_resp.json()["phone"] == emp_phone
    assert update_resp.json()["address"] == emp_addr
    
    # 2. Query database directly using SQL connection to check encryption at rest
    db = TestingSessionLocal()
    try:
        result = db.execute(text(f"SELECT phone, address, base_salary FROM employees WHERE id = {emp_id}")).first()
        raw_phone = result[0]
        raw_address = result[1]
        raw_base_salary = result[2]
        
        # Verify they are encrypted base64 strings and NOT raw plaintext values
        assert raw_phone != emp_phone
        assert raw_address != emp_addr
        assert raw_base_salary != str(emp_base)
        assert raw_base_salary != emp_base
        
        # Since it is encrypted, it must be base64 decodable and > 12 bytes (nonce + ciphertext)
        combined_phone = base64.b64decode(raw_phone.encode())
        assert len(combined_phone) > 12
    finally:
        db.close()
        
    # 3. Verify that update AuditLog did not contain raw salary values (Log Redaction)
    db = TestingSessionLocal()
    try:
        audit = db.query(models.AuditLog).filter(models.AuditLog.action == "UPDATE_SALARY_STRUCTURE").order_by(models.AuditLog.timestamp.desc()).first()
        assert audit is not None
        assert "85000" not in audit.details
        assert "[REDACTED]" in audit.details
    finally:
        db.close()
        
    # 4. RBAC Isolation: Login as Employee to test access control
    emp_login = client.post(
        "/api/auth/login",
        json={"email": emp_email, "password": "StrongPassword123!"}
    )
    assert emp_login.status_code == 200
    emp_token = emp_login.json()["access_token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}
    
    # Employee cannot retrieve another employee's sensitive profile info
    other_emp_resp = client.get(f"/api/employees/1", headers=emp_headers)
    assert other_emp_resp.status_code == 403
    
    # Employee cannot query all employees
    all_emp_resp = client.get("/api/employees", headers=emp_headers)
    assert all_emp_resp.status_code == 403
    
    # Employee cannot query all payrolls
    all_payroll_resp = client.get("/api/payroll", headers=emp_headers)
    assert all_payroll_resp.status_code == 403
    
    # Employee cannot update salary structures
    mod_salary_resp = client.put(
        f"/api/payroll/employees/{emp_id}/salary-structure",
        headers=emp_headers,
        json={"base_salary": 99999.0, "allowances": 0.0, "deductions": 0.0}
    )
    assert mod_salary_resp.status_code == 403
    
    # Employee can retrieve their own profile/payroll data
    my_profile_resp = client.get(f"/api/employees/{emp_id}", headers=emp_headers)
    assert my_profile_resp.status_code == 200
    assert my_profile_resp.json()["phone"] == emp_phone
    
    # 5. Security: Password hashes are never returned by API
    assert "hashed_password" not in my_profile_resp.json()
    assert "password" not in my_profile_resp.json()
    
    me_resp = client.get("/api/auth/me", headers=emp_headers)
    assert me_resp.status_code == 200
    assert "hashed_password" not in me_resp.json()
    assert "password" not in me_resp.json()
    assert "hashed_password" not in me_resp.json()["employee"]
    assert "password" not in me_resp.json()["employee"]
