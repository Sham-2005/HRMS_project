from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, time, datetime

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "EMPLOYEE"  # ADMIN, HR, EMPLOYEE

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- TOKEN SCHEMAS ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

# --- EMPLOYEE SCHEMAS ---
class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[date] = None

class EmployeeCreate(EmployeeBase):
    employee_id: str
    user_id: Optional[int] = None
    base_salary: Optional[float] = 0.0
    allowances: Optional[float] = 0.0
    deductions: Optional[float] = 0.0

class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture: Optional[str] = None
    # HR/Admin specific fields
    department: Optional[str] = None
    designation: Optional[str] = None
    joining_date: Optional[date] = None

class EmployeeResponse(EmployeeBase):
    id: int
    employee_id: str
    user_id: Optional[int]
    profile_picture: Optional[str]
    base_salary: float
    allowances: float
    deductions: float
    net_salary: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Extended employee view with user role
class EmployeeWithUserResponse(EmployeeResponse):
    role: Optional[str] = None

# --- ATTENDANCE SCHEMAS ---
class AttendanceBase(BaseModel):
    date: date
    check_in: Optional[time] = None
    check_out: Optional[time] = None
    status: str = "ABSENT"  # PRESENT, ABSENT, HALF_DAY, LEAVE
    work_hours: float = 0.0

class AttendanceCreate(AttendanceBase):
    employee_id: int

class AttendanceResponse(AttendanceBase):
    id: int
    employee_id: int
    # Allow joining employee info
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True

# --- LEAVE REQUEST SCHEMAS ---
class LeaveBase(BaseModel):
    leave_type: str  # PAID, SICK, UNPAID
    start_date: date
    end_date: date
    reason: str

class LeaveCreate(LeaveBase):
    pass

class LeaveUpdateStatus(BaseModel):
    status: str  # APPROVED, REJECTED
    admin_comments: Optional[str] = None

class LeaveResponse(LeaveBase):
    id: int
    employee_id: int
    status: str
    admin_comments: Optional[str]
    created_at: datetime
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True

# --- PAYROLL SCHEMAS ---
class PayrollBase(BaseModel):
    month: str  # YYYY-MM
    base_salary: float
    allowances: float
    deductions: float
    net_salary: float
    status: str = "UNPAID"  # PAID, UNPAID
    processed_date: Optional[date] = None
    transaction_id: Optional[str] = None

class PayrollCreate(PayrollBase):
    employee_id: int

class PayrollResponse(PayrollBase):
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None

    class Config:
        from_attributes = True

class SalaryStructureUpdate(BaseModel):
    base_salary: float
    allowances: float
    deductions: float

# --- DOCUMENT SCHEMAS ---
class DocumentBase(BaseModel):
    title: str
    document_type: str

class DocumentCreate(DocumentBase):
    file_path: str
    employee_id: int

class DocumentResponse(DocumentBase):
    id: int
    employee_id: int
    file_path: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# --- NOTIFICATION SCHEMAS ---
class NotificationBase(BaseModel):
    title: str
    message: str

class NotificationResponse(NotificationBase):
    id: int
    employee_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- AUDIT LOG SCHEMAS ---
class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: str
    timestamp: datetime
    user_email: Optional[str] = None

    class Config:
        from_attributes = True
