-- =====================================================================
-- PERFORMAX Intern Performance Management System (EPMS)
-- Complete Relational Database DDL Schema (PostgreSQL / MySQL / SQLite compatible)
-- =====================================================================

-- 1. Accounts & Authentication
CREATE TABLE IF NOT EXISTS accounts_user (
    id CHAR(36) PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'INTERN',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_staff BOOLEAN NOT NULL DEFAULT 0,
    is_superuser BOOLEAN NOT NULL DEFAULT 0,
    password_change_required BOOLEAN NOT NULL DEFAULT 0,
    password_changed_at TIMESTAMP NULL,
    date_joined TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_role ON accounts_user(role);
CREATE INDEX IF NOT EXISTS idx_user_email ON accounts_user(email);

CREATE TABLE IF NOT EXISTS accounts_rolepermission (
    id CHAR(36) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_code)
);

CREATE TABLE IF NOT EXISTS accounts_emailotp (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT 0
);

-- 2. Organization Structure
CREATE TABLE IF NOT EXISTS organization_department (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NULL UNIQUE,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_team (
    id CHAR(36) PRIMARY KEY,
    department_id CHAR(36) NOT NULL,
    manager_id CHAR(36) NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES organization_department(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES accounts_user(id) ON DELETE SET NULL,
    UNIQUE(department_id, name)
);

-- 3. Employee Directory
CREATE TABLE IF NOT EXISTS employees_employeeprofile (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL UNIQUE,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_id CHAR(36) NULL,
    manager_id CHAR(36) NULL,
    designation VARCHAR(100) NOT NULL,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    joining_date DATE NULL,
    phone_number VARCHAR(20) NULL,
    competencies TEXT DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES accounts_user(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES organization_department(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES accounts_user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_emp_manager ON employees_employeeprofile(manager_id);
CREATE INDEX IF NOT EXISTS idx_emp_dept ON employees_employeeprofile(department_id);

-- 4. Performance Cycles & Appraisal Engine
CREATE TABLE IF NOT EXISTS performance_performancecycle (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    goals_weight DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    manager_weight DECIMAL(5,2) NOT NULL DEFAULT 40.00,
    self_weight DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    self_assessment_deadline DATE NULL,
    evidence_deadline DATE NULL,
    current_phase VARCHAR(50) NOT NULL DEFAULT 'Active Evaluation',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS performance_evaluationcriterion (
    id CHAR(36) PRIMARY KEY,
    cycle_id CHAR(36) NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT DEFAULT '',
    maximum_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    weight DECIMAL(5,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (cycle_id) REFERENCES performance_performancecycle(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_appraisal (
    id CHAR(36) PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    cycle_id CHAR(36) NOT NULL,
    reviewer_id CHAR(36) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    overall_score DECIMAL(5,2) NULL,
    classification VARCHAR(50) NULL,
    strengths TEXT DEFAULT '[]',
    areas_for_improvement TEXT DEFAULT '[]',
    recommendations TEXT DEFAULT '',
    allow_intern_reply BOOLEAN NOT NULL DEFAULT 1,
    self_comments TEXT DEFAULT '',
    reviewer_comments TEXT DEFAULT '',
    final_comments TEXT DEFAULT '',
    submitted_at TIMESTAMP NULL,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_employeeprofile(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES performance_performancecycle(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES accounts_user(id) ON DELETE SET NULL,
    UNIQUE(employee_id, cycle_id)
);

CREATE TABLE IF NOT EXISTS performance_appraisalrating (
    id CHAR(36) PRIMARY KEY,
    appraisal_id CHAR(36) NOT NULL,
    criterion_id CHAR(36) NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    comments TEXT DEFAULT '',
    FOREIGN KEY (appraisal_id) REFERENCES performance_appraisal(id) ON DELETE CASCADE,
    FOREIGN KEY (criterion_id) REFERENCES performance_evaluationcriterion(id) ON DELETE CASCADE,
    UNIQUE(appraisal_id, criterion_id)
);

-- 5. Goals & KPI Milestones
CREATE TABLE IF NOT EXISTS goals_goal (
    id CHAR(36) PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    cycle_id CHAR(36) NOT NULL,
    assigned_by_id CHAR(36) NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_employeeprofile(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES performance_performancecycle(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_id) REFERENCES accounts_user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS goals_kpi (
    id CHAR(36) PRIMARY KEY,
    goal_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    target_value DECIMAL(10,2) NOT NULL,
    achieved_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) NOT NULL DEFAULT '%',
    FOREIGN KEY (goal_id) REFERENCES goals_goal(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals_goalprogress (
    id CHAR(36) PRIMARY KEY,
    goal_id CHAR(36) NOT NULL,
    reported_by_id CHAR(36) NULL,
    progress_percentage DECIMAL(5,2) NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES goals_goal(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by_id) REFERENCES accounts_user(id) ON DELETE SET NULL
);

-- 6. Evidence Submissions & Continuous Feedback
CREATE TABLE IF NOT EXISTS evidence_evidencesubmission (
    id CHAR(36) PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    goal_id CHAR(36) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT DEFAULT '',
    external_url VARCHAR(500) NULL,
    file_attachment VARCHAR(100) NULL,
    review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    reviewed_by_id CHAR(36) NULL,
    review_notes TEXT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees_employeeprofile(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals_goal(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_id) REFERENCES accounts_user(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback_feedback (
    id CHAR(36) PRIMARY KEY,
    sender_id CHAR(36) NOT NULL,
    recipient_id CHAR(36) NOT NULL,
    goal_id CHAR(36) NULL,
    feedback_type VARCHAR(20) NOT NULL DEFAULT 'POSITIVE',
    visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES accounts_user(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES accounts_user(id) ON DELETE CASCADE,
    FOREIGN KEY (goal_id) REFERENCES goals_goal(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback_feedbackcomment (
    id CHAR(36) PRIMARY KEY,
    feedback_id CHAR(36) NOT NULL,
    author_id CHAR(36) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (feedback_id) REFERENCES feedback_feedback(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES accounts_user(id) ON DELETE CASCADE
);

-- 7. Daily Attendance & Training
CREATE TABLE IF NOT EXISTS attendance_attendancerecord (
    id CHAR(36) PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
    check_in_time TIME NULL,
    check_out_time TIME NULL,
    notes TEXT DEFAULT '',
    FOREIGN KEY (employee_id) REFERENCES employees_employeeprofile(id) ON DELETE CASCADE,
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS training_trainingcourse (
    id CHAR(36) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(50) NOT NULL,
    duration_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    is_mandatory BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS training_employeetraining (
    id CHAR(36) PRIMARY KEY,
    employee_id CHAR(36) NOT NULL,
    course_id CHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ENROLLED',
    completion_date DATE NULL,
    score DECIMAL(5,2) NULL,
    FOREIGN KEY (employee_id) REFERENCES employees_employeeprofile(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES training_trainingcourse(id) ON DELETE CASCADE,
    UNIQUE(employee_id, course_id)
);

-- 8. Audit Trail
CREATE TABLE IF NOT EXISTS audit_auditlog (
    id CHAR(36) PRIMARY KEY,
    actor_id CHAR(36) NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45) NULL,
    old_values TEXT DEFAULT '{}',
    new_values TEXT DEFAULT '{}',
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_id) REFERENCES accounts_user(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_auditlog(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_auditlog(action);
