import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Index,
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship
from app.database import Base
from app.core.encryption import encrypt_string, decrypt_string

class EncryptedString(TypeDecorator):
    """Transparently encrypts and decrypts strings using AES-256-GCM."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_string(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt_string(value)

class EncryptedFloat(TypeDecorator):
    """Transparently encrypts and decrypts float values using AES-256-GCM."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt_string(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        dec = decrypt_string(value)
        try:
            return float(dec)
        except ValueError:
            return 0.0

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="EMPLOYEE")  # ADMIN, HR, EMPLOYEE
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationship to Employee (one-to-one or one-to-many depending on design, here User └── Employee means 1-to-1)
    employee = relationship("Employee", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(EncryptedString, nullable=True)
    address = Column(EncryptedString, nullable=True)
    profile_picture = Column(String, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    joining_date = Column(Date, default=datetime.date.today)
    
    # Salary Structure (Current)
    base_salary = Column(EncryptedFloat, default=0.0)
    allowances = Column(EncryptedFloat, default=0.0)
    deductions = Column(EncryptedFloat, default=0.0)
    net_salary = Column(EncryptedFloat, default=0.0)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="employee")
    attendance = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    leave_requests = relationship("LeaveRequest", back_populates="employee", cascade="all, delete-orphan")
    payrolls = relationship("Payroll", back_populates="employee", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="employee", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="employee", cascade="all, delete-orphan")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True, nullable=False)
    date = Column(Date, index=True, nullable=False)
    check_in = Column(Time, nullable=True)
    check_out = Column(Time, nullable=True)
    status = Column(String, nullable=False, default="ABSENT")  # PRESENT, ABSENT, HALF_DAY, LEAVE
    work_hours = Column(Float, default=0.0)

    employee = relationship("Employee", back_populates="attendance")

    # Composite index for search optimization
    __table_args__ = (
        Index("idx_attendance_employee_date", "employee_id", "date"),
    )

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True, nullable=False)
    leave_type = Column(String, nullable=False)  # PAID, SICK, UNPAID
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String, nullable=False, index=True, default="PENDING")  # PENDING, APPROVED, REJECTED
    admin_comments = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="leave_requests")

class Payroll(Base):
    __tablename__ = "payroll"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), index=True, nullable=False)
    month = Column(String, nullable=False)  # YYYY-MM
    base_salary = Column(EncryptedFloat, nullable=False)
    allowances = Column(EncryptedFloat, nullable=False)
    deductions = Column(EncryptedFloat, nullable=False)
    net_salary = Column(EncryptedFloat, nullable=False)
    status = Column(String, nullable=False, default="UNPAID")  # PAID, UNPAID
    processed_date = Column(Date, nullable=True)
    transaction_id = Column(String, nullable=True)

    employee = relationship("Employee", back_populates="payrolls")

    # Composite unique index to prevent duplicate payrolls for same employee in same month
    __table_args__ = (
        Index("idx_payroll_employee_month", "employee_id", "month"),
    )

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    document_type = Column(String, nullable=False)  # ID_PROOF, CONTRACT, DEGREE, OTHER
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="documents")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    employee = relationship("Employee", back_populates="notifications")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)  # e.g., UPDATE_SALARY, DELETE_EMPLOYEE
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")
