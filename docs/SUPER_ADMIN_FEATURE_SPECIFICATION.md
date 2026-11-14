# Performax Super Admin Feature Specification & Architecture Document

This document provides a comprehensive inventory and functional specification of every feature, module, API endpoint, security control, and user interface available under the **Super Admin Governance Engine** in Performax.

---

## 1. Executive Summary & Persona Role Definition

The **Super Admin** persona is the top-tier system governor and security custodian within Performax. 

### Separation of Concerns
In accordance with strict enterprise governance standards:
* **Super Admin is NOT an operational role:** Super Admin does not evaluate employees, score appraisal forms, publish appraisal cycles, or verify milestone evidence. Those responsibilities belong exclusively to **HR Partners** and **Technical Managers**.
* **Super Admin is a governance and security role:** Super Admin oversees system-wide health, role assignments, the RBAC matrix, organizational taxonomy (departments, positions, job levels), system audit trails, announcement broadcasts, and anti-lockout safeguards.

---

## 2. Complete Inventory of Super Admin Features

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               SUPER ADMIN FEATURE TREE                                 │
├────────────────────────┬───────────────────────────────┬───────────────────────────────┤
│ Core Dashboards        │ Security & RBAC Governance    │ Organizational Structure      │
│ • Executive Dashboard  │ • Role & Permission Center    │ • Employee Master Directory   │
│ • Strategic Analytics  │ • Security Roles Governance   │ • Department Hierarchy        │
│ • System Pulse View    │ • Access Permissions Catalog  │ • Job Levels & Seniority      │
│                        │ • Access Control Matrix       │ • Positions & Career Tracks   │
├────────────────────────┼───────────────────────────────┼───────────────────────────────┤
│ Compliance & Audit     │ Communications & Broadcasts   │ Account Security Lifecycle    │
│ • System Audit Ledger  │ • Announcement Hub            │ • Account Locking / Unlocking │
│ • Record Management    │ • Priority Dispatcher         │ • Password Reset Provisions   │
│ • Operational Logs     │ • Notification History        │ • Super Admin Anti-Lockout    │
└────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

---

### Module 1: Executive Dashboard & Monitoring
* **Route:** `/dashboard`
* **Access Level:** Super Admin, Staff Administrators
* **Backend Endpoint:** `GET /api/superadmin/dashboard/`

#### Key Capabilities:
1. **System Health Metrics Cards:**
   * **Total Employees / Personnel:** Real-time count of all corporate profiles in the system.
   * **Active vs. Inactive Accounts:** Real-time count of active user credentials versus locked/deactivated profiles.
   * **Departmental Divisions:** Count of all configured business units and functional ERP departments.
   * **Security Roles:** Visual indicators for the 4 canonical security tiers.
2. **Role Distribution Breakdown:**
   * Graphical distribution showing headcount split across **Super Admin**, **HR Partner**, **Technical Manager**, and **Employee**.
3. **Embedded Real-Time Audit Stream:**
   * Live streaming ticker showing the 10 most recent security and governance actions (role adjustments, permission toggles, logins, and status transitions).
4. **Administrative Quick Actions:**
   * Direct shortcut launchers to the Permission Matrix, Security Roles, System Audit Logs, and Global Announcement Hub.

---

### Module 2: Centralized Role & Permission Center
* **Route:** `/superadmin/roles-permissions`
* **Access Level:** Super Admin Only (`ROLE_MANAGE`, `PERMISSION_MANAGE`)
* **Backend Endpoints:**
  * `GET /api/superadmin/users/` (with role, department, and text filters)
  * `GET /api/superadmin/roles/`
  * `PATCH /api/superadmin/users/<id>/role/`

#### Key Capabilities:
1. **Live Personnel Directory:**
   * Fast-filtered tabular directory of all registered system accounts.
   * Search by Full Name, Username, Corporate Email, or Employee Code (`EMP-xxx`).
   * Filter by canonical role (`SUPER_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE`).
2. **In-Place Security Role Reassignment:**
   * Dropdown selector in each row enabling instant elevation or reassignment of user roles.
   * Automatic background cache invalidation updating the user's dashboard and sidebar upon next request.
3. **Individual Permission Inspector:**
   * View the total effective permission count for any specific user.
   * Inspect the exact entitlements granted by that user's role.
4. **Anti-Lockout Protection (Critical Invariant):**
   * The system prevents demoting or deactivating the last active Super Admin account, protecting the organization from permanent administrative lockout.

---

### Module 3: Security Roles Governance
* **Route:** `/roles`
* **Access Level:** Super Admin, HR Partners (Read-Only)
* **Backend Endpoints:**
  * `GET /api/superadmin/roles/`
  * `GET /api/superadmin/users/`
  * `PATCH /api/superadmin/users/<id>/role/`

#### Key Capabilities:
1. **Four Canonical Security Role Profiles:**
   * **Super Admin:** Executive Governance, System Records, Audit Logs, and Master Permissions.
   * **HR Partner:** Appraisal Cycles, Form Templates, KPI Library, and Company Performance Pulse.
   * **Technical Manager:** Direct Report Objectives, Evidence Reviews, Score Appraisals, and 1-on-1s.
   * **Employee:** Individual Contributor, Self-Assessments, Goal Milestones, Evidence Submissions, and Attendance.
2. **Interactive Role Distribution Cards:**
   * Displays assigned user headcount, active account counts, and total system permissions per role.
   * Single-click card filtering: Clicking any role card immediately filters the directory below to display only users in that role.
3. **Role Reassignment Modal:**
   * Dedicated modal with privilege risk warnings before confirming a role change.

---

### Module 4: Access Permissions Catalog
* **Route:** `/permissions`
* **Access Level:** Super Admin
* **Backend Endpoints:**
  * `GET /api/superadmin/permissions/catalog/`
  * `GET /api/superadmin/permissions/matrix/`

#### Key Capabilities:
1. **Catalog Directory of 25 System Permissions:**
   * Comprehensive registry of all entitlement keys recognized by the platform backend.
2. **Category Groupings:**
   * **System Administration:** `ALL`, `SYSTEM_AUDIT`, `ROLE_MANAGE`, `PERMISSION_MANAGE`, `USER_MANAGE`.
   * **Appraisal Cycle & Governance:** `CYCLE_MANAGE`, `CRITERIA_MANAGE`, `APPRAISAL_PUBLISH`, `APPRAISAL_VIEW_ALL`.
   * **Goal & Performance Execution:** `GOAL_ASSIGN`, `GOAL_VIEW_OWN`, `GOAL_VIEW_TEAM`, `EVIDENCE_REVIEW`, `EVIDENCE_SUBMIT`, `APPRAISAL_EVALUATE`, `APPRAISAL_SELF_EVALUATE`.
   * **Performance Improvement & Operations:** `PIP_CREATE`, `PIP_VIEW_OWN`, `PIP_VIEW_ALL`, `MEETING_MANAGE`, `ATTENDANCE_LOG`, `IDP_VIEW`, `KPI_LIBRARY_MANAGE`.
   * **Feedback & Recognition:** `FEEDBACK_VIEW`, `FEEDBACK_GIVE`.
3. **Entitlement Grid Indicators:**
   * Real-time badges and checkmarks displaying which roles currently possess each entitlement.
   * Search filter by code name, description, or capability category.

---

### Module 5: Interactive Access Control Matrix
* **Route:** `/permissions/matrix`
* **Access Level:** Super Admin Only (`PERMISSION_MANAGE`)
* **Backend Endpoints:**
  * `GET /api/superadmin/permissions/matrix/`
  * `PUT /api/superadmin/permissions/matrix/`
  * `POST /api/superadmin/permissions/matrix/reset/`

#### Key Capabilities:
1. **Interactive Checkbox Permission Grid:**
   * Column-by-row matrix mapping all 25 permissions across Super Admin, HR, Manager, and Employee.
   * Instant local state toggling with dirty-state detection.
2. **Atomic Matrix Persistence:**
   * Single-click **Save Matrix Changes** persists the entire configuration inside a database transaction (`@transaction.atomic`).
3. **Unified Identity Synchronization:**
   * Modifying permissions for `Employee` automatically synchronizes the backend legacy alias `Intern`, ensuring zero discrepancies.
4. **One-Click Factory Reset:**
   * **Reset Defaults** button restores platform standard RBAC definitions if an administrator makes accidental breaking changes.

---

### Module 6: System Audit Trails & Record Management
* **Route:** `/superadmin/audit-logs`, `/admin/records`, `/audit-logs`
* **Access Level:** Super Admin (`SYSTEM_AUDIT`)
* **Backend Endpoints:**
  * `GET /api/superadmin/audit-logs/`
  * `GET /api/superadmin/system-records/`

#### Key Capabilities:
1. **Immutable Security Ledger:**
   * Strictly append-only log storing every security-sensitive operation across the platform.
2. **Audited Operation Types:**
   * User Authentication: Logins, logouts, session timeouts, and failed attempts.
   * RBAC Transitions: Who changed whose role, old role vs. new role, and exact timestamp.
   * Permission Matrix Toggles: Modifications to permission code grants.
   * Account Status: Lockouts, unlock actions, and profile activations.
   * Appraisal Operations: Cycle initiation, score approvals, and form publish events.
3. **Log Filtering & Diagnostics:**
   * Filter by Actor, Entity Type (`User`, `Role`, `Cycle`), Severity (`INFO`, `WARNING`, `CRITICAL`), and Date Range.
   * Inspect detailed JSON metadata containing client IP, user agent, and payload diffs.

---

### Module 7: Global Announcement Hub
* **Route:** `/superadmin/notifications`
* **Access Level:** Super Admin
* **Backend Endpoints:**
  * `GET /api/notifications/`
  * `POST /api/notifications/broadcast/`

#### Key Capabilities:
1. **Broadcast Composer:**
   * Create and send company-wide or role-targeted announcements.
   * Set announcement priority: `Normal`, `High`, or `Urgent`.
2. **Target Audience Selector:**
   * Dispatch to `All Personnel`, `Managers Only`, `HR Partners Only`, or `Employees Only`.
3. **Real-Time Notification Delivery:**
   * Instantly increments notification counters on the header bell icon for target users across active sessions.
4. **Historical Broadcast Ledger:**
   * Review past announcements, dispatch timestamps, and message archives.

---

### Module 8: Master Employee & Org Hierarchy Management
* **Route:** `/employees`, `/departments`, `/job-levels`, `/positions`
* **Access Level:** Super Admin & HR Partner (`USER_MANAGE`)
* **Backend Endpoints:**
  * `GET /api/employees/`, `POST /api/employees/`, `PUT /api/employees/<id>/`
  * `GET /api/departments/`, `POST /api/departments/`
  * `GET /api/job-levels/`, `POST /api/job-levels/`
  * `GET /api/positions/`, `POST /api/positions/`

#### Key Capabilities:
1. **Employee Profile Management:**
   * Onboarding: Create new employees with automatic initial password assignment (lowercase first name).
   * Profile Records: National registration, contact addresses, emergency contacts, compensation, and joining dates.
2. **Organizational Hierarchy & Taxonomy:**
   * **Job Levels & Seniority Bands:** L1 (Associate/Intern) through L6 (Director/Executive).
   * **Standard Positions:** Master titles (`Backend Software Intern`, `Software Engineer`, `QA Lead`, `Staff Engineering Manager`, `Director of People & Culture`).
   * **Reporting Lines:** Link direct reporting relationships (`manager_id`) for evaluation rollups.
   * **Dual Department Classification:** Operational ERP Department vs. Parent Banking / Corporate Unit.

---

### Module 9: Strategic Analytics & System Pulse
* **Route:** `/analytics`
* **Access Level:** Super Admin & HR Partners (`REPORT_VIEW_ALL`)
* **Backend Endpoint:** `GET /api/reports/strategic-analytics/`

#### Key Capabilities:
1. **Interactive Strategic Analytics Center:**
   * Multi-tab analytics console: Performance Pulse, 9-Box Talent Matrix, Top Performers Podium, and Scenario Modeling Sandbox.
2. **9-Box Talent Grid:**
   * Real-time plotting of staff across **Performance** (1–5) versus **Potential** (Low, Medium, High).
   * Identifies "High Potential Stars", "Core Contributors", and "Dilemmas" requiring intervention.
3. **Scenario Modeling Sandbox:**
   * Interactive sensitivity sliders allowing administrators to model simulated company-wide score calibrations and bonus impact.

---

## 3. RBAC Architecture & Permission Reference Table

### Master Permission Reference

| Code | Permission Name | Domain | Default Roles |
| :--- | :--- | :--- | :--- |
| `ALL` | Super Admin Master Bypass | System Administration | Super Admin |
| `SYSTEM_AUDIT` | System Audit Trails | System Administration | Super Admin |
| `ROLE_MANAGE` | Role Management & Reassignment | System Administration | Super Admin |
| `PERMISSION_MANAGE` | Permission Matrix Configuration | System Administration | Super Admin |
| `USER_MANAGE` | User Account Provisioning | System Administration | Super Admin |
| `REPORT_VIEW_ALL` | Organization Analytics Access | System Administration | Super Admin, HR |
| `CYCLE_MANAGE` | Appraisal Cycle Administration | Appraisal Governance | HR |
| `CRITERIA_MANAGE` | Evaluation Criteria & Form Builder | Appraisal Governance | HR |
| `APPRAISAL_PUBLISH` | Publish & Finalize Review Scores | Appraisal Governance | HR |
| `APPRAISAL_VIEW_TEAM`| Departmental Review Visibility | Appraisal Governance | HR, Manager |
| `GOAL_ASSIGN` | Goal & KRA Assignment | Goal Execution | Manager |
| `EVIDENCE_REVIEW` | Milestone Deliverable Review | Goal Execution | Manager |
| `APPRAISAL_EVALUATE` | Manager Review Scoring | Goal Execution | Manager |
| `PIP_CREATE` | Initiate Performance Improvement Plan | Operations & Coaching | Manager |
| `MEETING_MANAGE` | 1-on-1 Sync Meeting Management | Operations & Coaching | Manager |
| `GOAL_VIEW_OWN` | View Personal Goals & Milestones | Individual Performance | Employee |
| `EVIDENCE_SUBMIT` | Submit Milestone Work Deliverables | Individual Performance | Employee |
| `APPRAISAL_SELF_EVALUATE` | Submit Self-Appraisal Form | Individual Performance | Employee |
| `ATTENDANCE_LOG` | Daily Attendance Tracking | Operations & Coaching | Employee |
| `IDP_VIEW` | Individual Development Plan Visibility| Operations & Coaching | Employee |
| `PIP_VIEW_OWN` | Personal PIP Tracking | Operations & Coaching | Employee |
| `PIP_VIEW_ALL` | Organization PIP Oversight | Operations & Coaching | HR |
| `KPI_LIBRARY_MANAGE` | KPI Master Library Management | Appraisal Governance | HR |
| `FEEDBACK_VIEW` | Continuous Feedback Stream | Feedback & Recognition | Super Admin, HR, Manager, Employee |
| `FEEDBACK_GIVE` | Peer Feedback Dispatch | Feedback & Recognition | HR, Manager, Employee |

---

## 4. Technical Architecture: How Super Admin Works Under the Hood

### Dual-Layer Security Verification

```
  HTTP Request (Bearer JWT Token)
               │
               ▼
  [Layer 1: DRF View Permission]
   Check: IsAuthenticated & IsSuperAdmin (UserRole.SUPER_ADMIN or is_superuser)
               │
               ▼
  [Layer 2: Service-Level Code Validation]
   RolePermissionService.get_effective_permissions_for_user(request.user)
   Check: Code matches 'ROLE_MANAGE', 'SYSTEM_AUDIT', or 'ALL'
               │
               ▼
  [Atomic ORM Transaction]
   Executes query / mutation inside @transaction.atomic block
               │
               ▼
  [Audit Log Hook]
   AuditService.log(actor=request.user, action="ROLE_UPDATE", ...)
```

### Frontend State Invalidation Pipeline
* Built on **RTK Query** with strict cache tags:
  * Mutating user roles invalidates `['SuperAdminUsers', 'SuperAdminRoles', 'Employee', 'Audit']`.
  * Mutating the permission matrix invalidates `['SuperAdminPermissionsMatrix', 'SuperAdminRoles']`.
  * Results in instant, zero-reload UI updates across dashboards and user directories.
