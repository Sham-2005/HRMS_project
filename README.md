# Dayflow HRMS

Website link : https://hrms-project-tawny.vercel.app

Dayflow HRMS is a modern, secure, full-stack Human Resource Management System (HRMS) built to streamline organizational workflows, tracking, and compliance. Using a robust FastAPI backend and a responsive React frontend, Dayflow features role-based access control (RBAC), end-to-end field-level database encryption, and automated auditing logs.

---

## 📌 Project Overview
Human Resource operations require processing highly sensitive Personally Identifiable Information (PII) and financial records. Dayflow HRMS addresses this by offering a secure, self-contained portal where Admins, HR representatives, and Employees can safely manage records. The platform solves the problem of data exposure at rest by applying transparent cryptographic layers to database records and isolating resource views using robust authentication checks.

---

## ✨ Key Features
*   **Role-Based Dashboards**: Dynamic overview layouts utilizing Recharts visualization to surface attendance metrics, headcount trends, and leave allocations.
*   **Admin Management**: Absolute privilege level to manage user roles, audit activity history, update salary configurations, and override workflow approvals.
*   **HR Management**: Mid-level access specialized in managing the employee directory, approving/rejecting leave applications, running payroll payouts, and exporting analytics reports.
*   **Employee Self-Service**: Portal for check-in/out timestamps, leave application tracking, downloading monthly payslips, and updating personal details.
*   **Employee Directory**: Searchable and filterable directory of personnel records.
*   **Attendance Tracking**: Logging daily clock-in/out timestamps, calculating hours worked, and automatically classifying status (Present, Half-Day, Absent).
*   **Leave Requests**: Workflow cycle supporting PAID, SICK, and UNPAID requests with start/end validations and administrator comments.
*   **Payroll Management**: Monthly payroll generation, allowances/deductions management, and transaction logging.
*   **Reports & Export**: Interactive grid previews and secure CSV exports for attendance, leave, and payroll databases.
*   **Dataset Explorer**: Dedicated data grid view (/dataset) populated with seeded tables for organizational presentation and evaluation.
*   **Audit Logging**: Immutable logging of administrative actions with automatic financial PII redacting.

---

## 👥 Role-Based Access Control (RBAC)

Dayflow enforces granular access bounds at both route and controller levels:

| Feature | Admin | HR | Employee |
|---|---|---|---|
| **Dashboard** | Full Admin Metrics & Trends | Full Admin Metrics & Trends | Personal Check-in Status & Payroll Summary |
| **Employee Management** | Full Read / Write | Full Read / Write | View Directory Only |
| **Attendance Management** | View All Logs | View All Logs | Check-In/Out & View Personal Logs |
| **Leave Management** | Approve / Reject Requests | Approve / Reject Requests | Submit & Cancel Personal Leaves |
| **Payroll** | Configure & Process Payouts | Process Monthly Cycles | View Personal Payslips Only |
| **Reports** | Read & CSV Export All | Read & CSV Export All | Blocked (403 Forbidden) |
| **Notifications** | View & Manage System Alerts | View & Manage System Alerts | Receive Personal transactional alerts |
| **Profile** | View & Edit All Records | View & Edit All Records | View & Edit Personal details only |

---

## 🏗️ System Architecture

```
   React Frontend (Vite)
            ↓
    Axios-like Client (JWT Auth Header)
            ↓
  FastAPI Backend Controllers (Router RBAC Guards)
            ↓
   SQLAlchemy ORM (Transparent Encryption Decorator)
            ↓
     SQLite Database (dayflow.db)
```

1.  **Frontend Layout**: The user interface is driven by React, with client-side routes wrapped in a `ProtectedRoute` component that filters access by comparing JWT roles.
2.  **API Routing & Security Guards**: The FastAPI backend routes calls through `deps.RoleChecker` dependency injection checks to block unauthorized HTTP requests.
3.  **ORM & Database Layer**: SQLAlchemy maps database transactions. Data traveling to sensitive columns is transparently encrypted at rest inside SQLite before write execution.

---

## 🛠️ Technology Stack

| Component | Technology | Version / Specification |
|---|---|---|
| **Frontend** | React | `18.3.1` |
| **Build Tool** | Vite | `5.4.1` |
| **Routing** | React Router DOM | `6.26.1` |
| **State & Fetching** | TanStack React Query | `5.51.23` |
| **Icons** | Lucide React | `0.428.0` |
| **Charts** | Recharts | `2.12.7` |
| **Styling** | Tailwind CSS / PostCSS / Autoprefixer | `3.4.10` |
| **Backend** | FastAPI | `0.111.0` |
| **Web Server** | Uvicorn | `0.30.1` |
| **ORM** | SQLAlchemy | `2.0.31` |
| **Validation** | Pydantic (Backend) / Zod (Frontend) | `2.7.4` / `3.23.8` |
| **Authentication** | python-jose (JWT) / Passlib | `3.3.0` / `1.7.4` |
| **Database** | SQLite | Serverless Local File |
| **Testing** | pytest / pytest-asyncio | Backend API test runner |

---

## 🗄️ Database Design

The schema is built on 8 SQLAlchemy models inside `backend/app/models/models.py`:

*   **User**: Handles authentication parameters. Links to `Employee` records. Stores email, role (ADMIN, HR, EMPLOYEE), and bcrypt password hashes.
*   **Employee**: Represents the personnel profile. Stores PII (encrypted phone/address) and salary settings (encrypted values).
*   **Attendance**: Logs daily clock-in/out times, date, status, and calculated hours. Relates to `Employee` via foreign key.
*   **LeaveRequest**: Manages requests for leaves. Stores leave type, dates, reason, status, and admin approval comments.
*   **Payroll**: Captures monthly pay run metrics. Stores billing month, salary, allowances, deductions, net salary (all encrypted), status (PAID, UNPAID), and transaction code.
*   **Document**: Holds metadata and local file paths of employee documents (contracts, ID proofs).
*   **Notification**: Tracks transactional notifications.
*   **AuditLog**: Logs administrator edits (e.g. database seeds, compensation updates).

### Relationships & Indexes
*   **Cascade Deletes**: Deleting an employee automatically clean-deletes associated attendance records, leaves, payrolls, documents, and notifications (`cascade="all, delete-orphan"`).
*   **Query Indexes**:
    *   `idx_attendance_employee_date`: Composite index on Attendance (`employee_id`, `date`) to speed up check-in queries.
    *   `idx_payroll_employee_month`: Composite index on Payroll (`employee_id`, `month`) to optimize pay stub searches.

---

## 🔐 Security

### Password Security
*   **Hashing**: Passwords are saved as one-way hashes using `bcrypt` (12 rounds) with automated per-user salting.
*   **Double Validation**: Password length and composition rules are validated by Zod on the signup form and re-validated by Pydantic on the backend.
*   **Transparent Migration**: Standard legacy passwords (e.g., initialized during development) are migrated to secure bcrypt hashes transparently upon the user's first login.

### Encryption at Rest
*   **Standard**: Sensitive attributes use an custom SQLAlchemy `TypeDecorator` implementing `AES-256-GCM` authenticated encryption.
*   **Fallback**: If native cryptography bindings are unavailable, the cipher degrades gracefully to a pure-Python `HMAC-SHA256` authenticated stream cipher.
*   **Encrypted Columns**: `phone` and `address` (PII) inside `Employee` & `base_salary`, `allowances`, `deductions`, and `net_salary` inside `Employee` and `Payroll` tables.
*   **Log Redaction**: Audit logs redact numerical compensation data into `[REDACTED]` blocks during logging.

### Session Security
*   **JWT Tokens**: Stateless sessions authenticated via HMAC-SHA256 (`HS256`) JSON Web Tokens containing email/role metadata.
*   **Request Interceptors**: Tokens are sent in the `Authorization: Bearer <token>` header by the frontend client. Receiving a `401 Unauthorized` automatically flushes credentials and redirects to `/login`.

### SQL Injection Protection
*   **ORM Parameters**: Database operations strictly utilize SQLAlchemy ORM queries. String-concatenated SQL commands are eliminated, protecting the application from SQL injection attacks.

---

## 📊 Dataset
Dayflow utilizes a synthetic HR dataset for development, testing, and workflow validation.
*   **Seeding Process**: `backend/seed.py` initializes the SQLite database with a standard organization structure (11 users, 11 employee profiles, 55 attendance logs representing 5 workdays, 3 leaves, 11 payroll records for `2026-07`, 12 notifications, and 1 system seed audit log).
*   **Dataset Explorer**: The `/dataset` page displays these records in a clean grid for judges and presenters.

> [!NOTE]
> This dataset is synthetic data generated by the application's seed process. It does not represent real employees or confidential employee information.

---

## 📁 Project Structure

```
Dayflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── analytics.py
│   │   │   ├── attendance.py
│   │   │   ├── auth.py
│   │   │   ├── deps.py
│   │   │   ├── employees.py
│   │   │   ├── leaves.py
│   │   │   ├── notifications.py
│   │   │   ├── payroll.py
│   │   │   └── reports.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── encryption.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   └── models.py
│   │   ├── schemas/
│   │   │   └── schemas.py
│   │   ├── database.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_api.py
│   ├── requirements.txt
│   └── seed.py
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.jsx
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── pages/
│   │   │   ├── Attendance.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Dataset.jsx
│   │   │   ├── Employees.jsx
│   │   │   ├── Leaves.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Payroll.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Reports.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── .env.example
├── DATASET.md
└── README.md
```

---

## ⚙️ Installation

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install package dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure variables by copying the environment file:
   ```bash
   cp .env.example .env
   ```
5. Initialize the database and populate seed data:
   ```bash
   python seed.py
   ```
6. Spin up the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🔑 Environment Variables

The backend loads configuration options from `.env`. A sample configuration template is provided in `.env.example`:

```env
DATABASE_URL=sqlite:///./dayflow.db
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ENCRYPTION_KEY=your_base64_encoded_32_byte_encryption_key_here
```
