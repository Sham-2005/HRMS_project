from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import models
from app.schemas import schemas
from app.core import security
from app.api import deps
from pydantic import BaseModel, EmailStr, field_validator
import re

router = APIRouter()

class UserRegister(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str = "EMPLOYEE"  # ADMIN, HR, EMPLOYEE

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 12:
            raise ValueError("Password must contain at least 12 characters.")
        if len(v) > 72:
            raise ValueError("Password must be at most 72 characters long.")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain an uppercase letter.")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain a lowercase letter.")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain a number.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain a special character.")
        return v

@router.post("/register", response_model=schemas.UserResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Check if user already exists
    user_exists = db.query(models.User).filter(models.User.email == user_in.email).first()
    if user_exists:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists"
        )
    
    # Check if employee_id already exists
    emp_exists = db.query(models.Employee).filter(models.Employee.employee_id == user_in.employee_id).first()
    if emp_exists:
        raise HTTPException(
            status_code=400,
            detail="An employee with this Employee ID already exists"
        )

    # Create user
    hashed_password = security.get_password_hash(user_in.password)
    db_user = models.User(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role.upper(),
        is_active=True
    )
    db.add(db_user)
    db.flush()  # Get user.id

    # Create employee profile
    db_employee = models.Employee(
        user_id=db_user.id,
        employee_id=user_in.employee_id,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        email=user_in.email,
        # Default salaries
        base_salary=50000.0 if user_in.role.upper() == "EMPLOYEE" else 75000.0,
        allowances=10000.0,
        deductions=5000.0,
        net_salary=55000.0 if user_in.role.upper() == "EMPLOYEE" else 80000.0
    )
    db.add(db_employee)
    
    # Create a welcome notification
    db_notification = models.Notification(
        employee=db_employee,
        title="Welcome to Dayflow!",
        message=f"Hi {user_in.first_name}, your employee account has been created successfully. Welcome aboard!",
        is_read=False
    )
    db.add(db_notification)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    print(f"[LOGIN ATTEMPT] email={login_data.email} user_found={user is not None}", flush=True)
    
    if not user:
        # Run dummy verify to protect against timing attacks
        security.verify_password(login_data.password, security.DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    is_plaintext = not security.is_bcrypt_hash(user.hashed_password)
    
    pwd_verified = security.verify_password(login_data.password, user.hashed_password)
    print(f"[PASSWORD VERIFICATION] email={login_data.email} success={pwd_verified}", flush=True)
    
    if not pwd_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if is_plaintext:
        # Automatically migrate the plaintext password to a secure hash
        user.hashed_password = security.get_password_hash(login_data.password)
        db.commit()
        db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = security.create_access_token(
        subject=user.email, role=user.role
    )
    return {"access_token": access_token, "token_type": "bearer"}

# Form login support for Swagger UI
@router.post("/login-form", response_model=schemas.Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        # Run dummy verify to protect against timing attacks
        security.verify_password(form_data.password, security.DUMMY_HASH)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    is_plaintext = not security.is_bcrypt_hash(user.hashed_password)
    
    if not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if is_plaintext:
        # Automatically migrate the plaintext password to a secure hash
        user.hashed_password = security.get_password_hash(form_data.password)
        db.commit()
        db.refresh(user)
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    access_token = security.create_access_token(
        subject=user.email, role=user.role
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(
    current_user: models.User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    employee = db.query(models.Employee).filter(models.Employee.user_id == current_user.id).first()
    
    employee_data = None
    if employee:
        employee_data = {
            "id": employee.id,
            "employee_id": employee.employee_id,
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
        }
        
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "employee": employee_data
    }
