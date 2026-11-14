# PERFORMAX EPMS — Module-Wise Software Testing Specification & Test Suite

**Project:** PERFORMAX Enterprise Performance Management System  
**Repository:** [https://github.com/jk2518/Performax](https://github.com/jk2518/Performax)  
**Document Version:** 1.0.0  
**Test Suite Type:** Comprehensive Black-Box, White-Box, Integration & Security Test Specification  
**Execution Environment:** Django 5 REST Framework + React / Vite + PostgreSQL / SQLite  
**Last Verified:** October 2026  
**Overall Execution Result:** **100% Pass (All Modules Operational)**

---

## 1. Test Architecture & Traceability Matrix

The test framework evaluates the four primary persona modules and the underlying cross-cutting calculation engine:

```
+-----------------------------------------------------------------------------------+
|                        PERFORMAX EPMS Test Architecture                           |
+--------------------+--------------------+--------------------+--------------------+
| 1. Super Admin     | 2. HR Operations   | 3. Tech Manager    | 4. Intern Portal   |
| Governance & RBAC  | Lifecycle & Terms  | Hub & Evaluations  | Learning & PRs     |
+--------------------+--------------------+--------------------+--------------------+
|                5. Cross-Module Scoring Engine & Data Propagation                  |
+-----------------------------------------------------------------------------------+
```

### Module Summary Matrix

| Module ID | Module Name | Scope & Responsibilities | Test Case IDs | Status |
|---|---|---|---|:---:|
| **MOD-01** | **Super Admin Governance** | Authentication, JWT Claims, Role Matrix, Telemetry, Audit Logs | `TC-SA-01` to `TC-SA-08` | ✅ 8/8 PASS |
| **MOD-02** | **HR Operations** | Intern Roster, Cohorts/Batches, Mentor Directory, Grading, Publishing | `TC-HR-01` to `TC-HR-10` | ✅ 10/10 PASS |
| **MOD-03** | **Tech Manager Hub** | Mentees Dossier, Task Delegation, Code Evidence, Appraisals, Drafts | `TC-TM-01` to `TC-TM-10` | ✅ 10/10 PASS |
| **MOD-04** | **Intern Portal** | Scorecard, PR Submissions, Goals Progress, Feedback Replies, Self-Review | `TC-INT-01` to `TC-INT-08` | ✅ 8/8 PASS |
| **MOD-05** | **Scoring & Appraisals Engine** | 5-Factor & 8-Competency Calculations, Weights, Status State Machine | `TC-AE-01` to `TC-AE-08` | ✅ 8/8 PASS |
| **Total** | **5 Enterprise Modules** | **Full System Functional & Security Coverage** | **44 Test Cases** | **✅ 100% PASS** |

---

## 2. Module 1: Super Admin & Governance (`MOD-01`)

### Test Cases

| Test Case ID | Feature / Area | Test Scenario | Preconditions | Test Steps & Input | Expected Result | Actual Result | Priority | Status |
|---|---|---|---|---|---|---|:---:|:---:|
| **TC-SA-01** | Authentication | 1-Click Demo Persona Sign-In | User on `/login` screen | 1. Click "HR Partner" or "Super Admin" quick button.<br>2. Payload: Demo credentials auto-sent. | System verifies JWT token, synchronizes hashed passwords, and navigates to correct role dashboard. | Immediate HTTP 200, JWT access/refresh tokens stored in localStorage, redirected. | P1 | ✅ PASS |
| **TC-SA-02** | Token Claims | JWT Payload Custom Claims Verification | Super Admin credentials | 1. `POST /auth/login/`<br>2. Inspect decoded JWT payload. | Payload contains `user_id`, `email`, `role`, `roles: ['ADMIN', 'SUPER_ADMIN']`, and permissions array. | Claims present; role guards decode properly. | P1 | ✅ PASS |
| **TC-SA-03** | RBAC Guard | Unauthorized Endpoint Rejection | Authenticated as `INTERN` | 1. Send `GET /api/superadmin/system-records/` with Intern Bearer token. | Server returns HTTP 403 Forbidden with security denial message. | HTTP 403 returned; non-admin blocked. | P1 | ✅ PASS |
| **TC-SA-04** | Unauthenticated | Route Access Without Token | No token | 1. Send `GET /api/employees/all` without `Authorization` header. | HTTP 401 Unauthorized returned. | HTTP 401 returned. | P1 | ✅ PASS |
| **TC-SA-05** | User Profile | Profile Image Upload & Media URL Handling | Super Admin authenticated | 1. Upload JPEG/PNG via `PUT /emp/me/profile/`<br>2. Query `GET /emp/me/`. | Server returns valid media URL (`/media/profiles/...`) rendered properly in UI header. | Image URL returned; preview visible in header. | P2 | ✅ PASS |
| **TC-SA-06** | Role Matrix | Permission Matrix Modification & Persistence | Super Admin on `/admin/roles` | 1. Toggle `CAN_MANAGE_CYCLES` permission.<br>2. Reload page / refresh token. | Custom permissions persist across browser refreshes without resetting. | Permissions persist in DB and JWT response. | P2 | ✅ PASS |
| **TC-SA-07** | Org Hierarchy | Department & Team Creation | Super Admin authenticated | 1. `POST /api/organization/departments/` with `name="AI Research"`<br>2. `GET /api/organization/departments/`. | Department created with UUID and returned in active departments roster. | Department created with HTTP 201. | P2 | ✅ PASS |
| **TC-SA-08** | Audit Trail | System Audit Event Recording | System actions executed | 1. Execute an administrative status toggle.<br>2. Query `GET /api/audit/logs/`. | Action recorded with timestamp, acting user ID, IP address, and change details. | Audit log row appended with full metadata. | P2 | ✅ PASS |

---

## 3. Module 2: HR Operations & Internship Lifecycle (`MOD-02`)

### Test Cases

| Test Case ID | Feature / Area | Test Scenario | Preconditions | Test Steps & Input | Expected Result | Actual Result | Priority | Status |
|---|---|---|---|---|---|---|:---:|:---:|
| **TC-HR-01** | Intern Onboarding | Add Individual Intern via Form | HR Partner authenticated | 1. Click "+ Add Intern"<br>2. Input: Name="Kavya Iyer", Batch="Batch B", Mentor="Marcus Vance".<br>3. Submit form. | Intern saved to database, unique `employeeCode` generated, assigned to Marcus. | HTTP 201; intern appears in roster immediately. | P1 | ✅ PASS |
| **TC-HR-02** | Bulk CSV Import | Import Interns via CSV Spreadsheet | Valid CSV file prepared | 1. Open CSV modal.<br>2. Upload 2-intern CSV.<br>3. Click "Import". | Backend validates rows, provisions accounts, maps departments, returns import count. | Both interns ingested without duplicates. | P2 | ✅ PASS |
| **TC-HR-03** | Status Control | Intern Account Activation Toggle | Active intern in table | 1. Click "Active" badge on intern row.<br>2. Send `PATCH /emp/{id}/deactivate`. | Status changes to `DEACTIVATED`; intern login locked immediately. | HTTP 200; badge updates to "Deactivated". | P1 | ✅ PASS |
| **TC-HR-04** | Mentor Directory | Mentors Summary Card Interaction | HR Dashboard loaded | 1. Click "MENTORS" stat card.<br>2. Inspect screen. | Project Mentors Directory Modal opens with all mentors, mentee counts, and quick actions. | Modal opens showing Marcus Vance, Elena Rostova, David Kim with accurate mentee counts. | P1 | ✅ PASS |
| **TC-HR-05** | Mentee Allocation | Filter Intern Table by Mentor | Mentors Directory Modal open | 1. Click "View Assigned Mentees" on Marcus Vance card. | Modal closes, intern table filters exclusively to Marcus Vance's direct reports. | Table filtered; filter badge shows active. | P2 | ✅ PASS |
| **TC-HR-06** | Mentor Assignment | Inline Mentor Reassignment | Intern assigned to mentor | 1. Change Mentor dropdown on intern row to "Elena Rostova".<br>2. Send `PUT /emp/{id}/`. | Database updates `directManagerId`; Elena's mentee count increments. | HTTP 200; mentor updated dynamically. | P1 | ✅ PASS |
| **TC-HR-07** | Term Launch | Launch New Evaluation Term / Quarter | HR Partner authenticated | 1. Click "+ New Batch / Term"<br>2. Payload: `name="MIRAI Q3 2026"`, dates `2026-07-01` to `2026-09-30`. | Evaluation cycle created with status `ACTIVE`; dropdowns across modules update. | HTTP 201; cycle visible in manager and intern views. | P1 | ✅ PASS |
| **TC-HR-08** | Goal Assignment | Assign Term KPI to Intern | Active cycle exists | 1. `POST /api/goals/` with `title="Optimize Query Latency"`, weight=20%. | Goal saved, linked to intern profile and current performance cycle. | HTTP 201; goal progress initialized at 0%. | P2 | ✅ PASS |
| **TC-HR-09** | 8-Competency Grade | Grade Intern Across 8 Competencies | Intern completed review | 1. Open "Grade" modal.<br>2. Rate Technical (3 criteria) & Behavioral (5 criteria).<br>3. Save appraisal. | Composite score computed based on 60/40 ratio; classification assigned. | HTTP 200; score recorded to `Appraisal` table. | P1 | ✅ PASS |
| **TC-HR-10** | Publishing | Publish Scorecard to Intern | Appraisal in review | 1. Select intern row.<br>2. Click "Publish Scorecard". | `status` transitions to `PUBLISHED`; `published_at` timestamp set; intern results unmasked. | Intern can view scorecard on their portal. | P1 | ✅ PASS |

---

## 4. Module 3: Tech Manager & Mentor Hub (`MOD-03`)

### Test Cases

| Test Case ID | Feature / Area | Test Scenario | Preconditions | Test Steps & Input | Expected Result | Actual Result | Priority | Status |
|---|---|---|---|---|---|---|:---:|:---:|
| **TC-TM-01** | Roster Retrieval | View Assigned Mentees Roster | Manager authenticated (`marcus.tech@company.com`) | 1. Send `GET /api/manager/mentees/`. | Returns all 84 interns assigned to Marcus with goal counts, pending reviews, and active appraisal links. | HTTP 200; complete mentee cards rendered. | P1 | ✅ PASS |
| **TC-TM-02** | Mentee Search | Filter Mentees by Keyword | Mentees roster loaded | 1. `GET /api/manager/mentees/?search=Aakash` | Only mentees matching keyword "Aakash" returned. | Single matching mentee dossier returned. | P2 | ✅ PASS |
| **TC-TM-03** | Task Assignment | Assign Technical Task to Mentee | Mentee selected | 1. `POST /api/manager/tasks/` with `title="Implement Redis Caching"`, priority="HIGH". | Task created with status `PENDING` and assigned to intern. | HTTP 201; task visible in intern task list. | P1 | ✅ PASS |
| **TC-TM-04** | Capability Review | Record Technical Capability Assessment | Criteria configured | 1. `POST /api/manager/technical-reviews/` with scores for 5 engineering categories. | Benchmark ratings stored; mentor remarks saved. | HTTP 201; ratings saved to database. | P2 | ✅ PASS |
| **TC-TM-05** | Evidence Review | Approve Intern GitHub PR Evidence | Intern submitted PR | 1. Open Evidence tab.<br>2. Click "Approve PR #42".<br>3. Send decision payload with notes. | Evidence status changes to `APPROVED`; intern milestone progress auto-updates. | HTTP 200; approval badge displayed. | P1 | ✅ PASS |
| **TC-TM-06** | Continuous Feedback | Submit Qualitative Feedback | Intern selected | 1. `POST /api/feedback/` with type="PRAISE", message="Excellent architecture design". | Feedback stored with timestamp and sender profile. | HTTP 201; feedback visible on intern dashboard. | P2 | ✅ PASS |
| **TC-TM-07** | Evaluation Form | Load Manager Evaluation Form | Appraisal / Employee UUID | 1. `GET /api/manager-evaluations/form/{id}/`. | Loads 5 evaluation criteria, weightages, employee metadata (`employeeCode`, `positionName`, `departmentName`). | HTTP 200; form populated with 5 questions; `isSelfSubmitted: true`. | P1 | ✅ PASS |
| **TC-TM-08** | Dynamic UUID Lookup | Open Evaluation by Employee ID Fallback | Appraisal record exists | 1. Request form using `EmployeeProfile.id` instead of `Appraisal.id`. | Backend `_resolve_appraisal` resolves employee to active appraisal without HTTP 500. | HTTP 200; appraisal resolved smoothly. | P1 | ✅ PASS |
| **TC-TM-09** | Draft Preservation | Save Evaluation Progress as Draft | Evaluation partially rated | 1. `POST /api/manager-evaluations/{id}/draft/` with rating answers. | Draft saved with status `DRAFT`; form reload retains entered scores. | HTTP 200; scores reloaded on return. | P2 | ✅ PASS |
| **TC-TM-10** | Submit Review | Finalize & Submit Manager Review | All criteria rated (1.0–5.0) | 1. `POST /api/manager-evaluations/{id}/submit/` with final remarks. | Weighted overall score calculated (e.g. 80.0/100); appraisal promoted to `SUBMITTED`. | HTTP 200; overallScore computed; submit button completes. | P1 | ✅ PASS |

---

## 5. Module 4: Intern Learning & Performance Portal (`MOD-04`)

### Test Cases

| Test Case ID | Feature / Area | Test Scenario | Preconditions | Test Steps & Input | Expected Result | Actual Result | Priority | Status |
|---|---|---|---|---|---|---|:---:|:---:|
| **TC-INT-01** | Overview | Load Intern Personal Dashboard | Intern authenticated (`alex.chen@college.edu`) | 1. `GET /intern/overview/`. | Returns intern details, assigned mentor name, overall goal progress, upcoming deadlines. | HTTP 200; personalized dashboard rendered. | P1 | ✅ PASS |
| **TC-INT-02** | Milestone Update | Update Goal Completion Percentage | Intern has active goals | 1. Move progress slider to 85%.<br>2. Send `PATCH /api/goals/{id}/progress/`. | Progress updated in database; timestamp logged in progress history. | HTTP 200; progress percentage recorded. | P2 | ✅ PASS |
| **TC-INT-03** | Evidence Upload | Submit GitHub PR & Deliverable Link | Task in progress | 1. `POST /api/evidence/` with `title="JWT Auth"`, URL="https://github.com/org/repo/pull/12". | Deliverable recorded with status `PENDING` awaiting mentor review. | HTTP 201; evidence row appears in mentor queue. | P1 | ✅ PASS |
| **TC-INT-04** | Threaded Reply | Reply to Mentor Feedback Note | Mentor provided feedback | 1. `POST /api/intern/feedback/{id}/reply/` with `reply="Thank you, addressed in commit."`. | Reply appended to discussion thread; mentor alerted. | HTTP 200; reply visible in feedback thread. | P2 | ✅ PASS |
| **TC-INT-05** | Self-Appraisal Form | Load Active Self-Assessment Questions | Term evaluation open | 1. `GET /api/self-assessment/form/{id}/`. | Returns qualitative reflection fields and 1.0–10.0 rating criteria. | HTTP 200; form rendered with all criteria. | P1 | ✅ PASS |
| **TC-INT-06** | Cycle Date Range | Self-Appraisal Submission in 2026 | Active cycle configured | 1. Submit ratings and reflections.<br>2. Verify no date lockout error. | Submission succeeds without "No active cycle open" error. | HTTP 200; self-ratings recorded. | P1 | ✅ PASS |
| **TC-INT-07** | Privacy Shield | Unpublished Score Shielding | Appraisal status `DRAFT` or `SUBMITTED` | 1. Intern navigates to Results tab before HR publishing. | Final composite score masked; "Results Pending HR Approval" banner displayed. | Score hidden; privacy intact. | P1 | ✅ PASS |
| **TC-INT-08** | Scorecard Reveal | Published Scorecard View | Appraisal status `PUBLISHED` | 1. Intern navigates to Results tab after publishing. | Grade banner (e.g. Achieved / 85.4%), 8-competency chart, and mentor remarks unmasked. | Full scorecard unmasked with download button. | P1 | ✅ PASS |

---

## 6. Module 5: Scoring Engine & Cross-Module Pipeline (`MOD-05`)

### Test Cases

| Test Case ID | Feature / Area | Test Scenario | Preconditions | Test Steps & Input | Expected Result | Actual Result | Priority | Status |
|---|---|---|---|---|---|---|:---:|:---:|
| **TC-AE-01** | Math Formula | 5-Factor Weighted Score Computation | Criteria: Problem Solving (25%), Tech (25%), Quality (20%), Collab (15%), Velocity (15%) | 1. Rates criteria: [4.0, 5.0, 4.0, 5.0, 4.0] (out of 5.0).<br>2. Submit evaluation. | Calculated Score: $4.0(0.25) + 5.0(0.25) + 4.0(0.20) + 5.0(0.15) + 4.0(0.15) = 4.4 / 5.0 = 88.0\%$. | Exact composite score `88.0` stored without floating point drift. | P1 | ✅ PASS |
| **TC-AE-02** | Classification | Automatic Tier Classification | Score calculated | 1. Overall score: `92.0` -> Achieved<br>2. Overall score: `78.0` -> Progressing<br>3. Overall score: `64.0` -> Focus Required | Classification assigned according to business thresholds (≥85%, 70–84%, <70%). | Correct classification string persisted. | P2 | ✅ PASS |
| **TC-AE-03** | State Machine | Appraisal State Lifecycle Transitions | Initial status `DRAFT` | 1. Transition: `DRAFT` -> `SUBMITTED` (Manager)<br>2. Transition: `SUBMITTED` -> `UNDER_REVIEW` (HR)<br>3. Transition: `UNDER_REVIEW` -> `HR_APPROVED`<br>4. Transition: `HR_APPROVED` -> `PUBLISHED` | Each transition validates prerequisite state; invalid backward transitions rejected. | State transitions execute in linear order. | P1 | ✅ PASS |
| **TC-AE-04** | Concurrency Safety | Duplicate Appraisal Prevention | Intern and Cycle exist | 1. Attempt creating second appraisal for identical `(employee, cycle, type)`. | Database rejects with `IntegrityError` / HTTP 409 unique constraint. | Unique together constraint enforced; duplicate prevented. | P1 | ✅ PASS |
| **TC-AE-05** | Cross-Module Sync | Instant Data Propagation to Manager | HR assigns intern to manager | 1. HR updates intern's mentor to Marcus.<br>2. Query `GET /api/manager/mentees/`. | Intern appears immediately in Marcus's mentee roster without server restart. | Real-time propagation verified across API calls. | P1 | ✅ PASS |
| **TC-AE-06** | Null-Safety | Missing Reviewer / Manager Graceful Handling | Appraisal without manager assigned | 1. Query appraisal detail where `reviewer=None`. | `map_appraisal` returns safe fallback strings without raising `AttributeError`. | HTTP 200 returned; "Manager" fallback rendered. | P1 | ✅ PASS |
| **TC-AE-07** | Custom User Model | `get_full_name()` Method Safety | Custom `User` inherits `AbstractBaseUser` | 1. Call `user.get_full_name()` on manager user. | Returns profile full name or constructed string; never raises `AttributeError`. | Full name returned smoothly. | P1 | ✅ PASS |
| **TC-AE-08** | Stat Calculations | HR Dashboard Stat Aggregation | 86 Interns in database | 1. Compute Total, Active, Achieved, Progressing, Focus Required counts. | Counters aggregate accurately matching database rows. | Real-time counts render on 5 summary cards. | P2 | ✅ PASS |

---

## 7. Automated Test Execution Commands

To execute the test suites directly from the command line:

### Backend Django Test Suite
```bash
# Navigate to backend directory
cd backend

# Run all automated tests
python manage.py test apps --verbosity=2

# Run targeted module test suites
python manage.py test apps.accounts       # Module 1: Auth & Governance
python manage.py test apps.employees      # Module 2: Employee & Intern Models
python manage.py test apps.goals          # Module 3 & 4: Goals & Tasks
python manage.py test apps.performance    # Module 5: Scoring & Appraisals
python manage.py test apps.attendance     # Module 2 & 5: Attendance & Audits
```

### Frontend Type Safety & Build Verification
```bash
# Navigate to frontend directory
cd epms_frontend

# Verify TypeScript type integrity across all components
npx tsc --noEmit

# Verify production Vite build bundling
npm run build
```

---

## 8. Test Sign-Off & Verification Certificate

- **Total Test Cases Specified:** 44
- **Automated / API Verified:** 44
- **Passed:** 44 (100%)
- **Failed:** 0 (0%)
- **System Readiness:** Production Ready
- **Sign-Off Date:** October 2026
