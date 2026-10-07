# Software Test Cases: Tech Manager & Mentor Module (M-01 to M-12)

**System:** PERFORMAX Intern Performance Management System (EPMS)  
**Target Module:** `apps/manager` & Mentor Operations Center UI (`/manager/hub`)  
**Test Suite File:** [`backend/tests_manager_mentor.py`](file:///C:/Users/DELL/OneDrive/internship/jatin_demo/backend/tests_manager_mentor.py) & [`backend/apps/manager/tests.py`](file:///C:/Users/DELL/OneDrive/internship/jatin_demo/backend/apps/manager/tests.py)  
**Version:** 1.0.0  
**Test Runner:** Pytest / Django `TestCase` / REST Client  

---

## 1. Test Scope & Feature Traceability Matrix

| Feature ID | Feature Name | Description & Purpose | Endpoint(s) | Test Cases |
|---|---|---|---|---|
| **M-01** | **View Assigned Interns/Employees** | Provide Mentor access to assigned mentees with real-time performance summary | `GET /api/manager/mentees/`<br>`GET /api/manager/interns/` | TC-M01-01, TC-M01-02, TC-M01-03 |
| **M-02** | **Assign Tasks** | Create and assign deliverables/tasks with target metrics to an intern | `POST /api/manager/tasks/` | TC-M02-01, TC-M02-02, TC-M02-03 |
| **M-03** | **Manage Tasks & Goals** | Track, filter, and update status and completion percentages of assigned tasks | `GET /api/manager/tasks/`<br>`PATCH /api/manager/tasks/{id}/`<br>`PATCH /api/manager/tasks/{id}/status/` | TC-M03-01, TC-M03-02, TC-M03-03 |
| **M-04** | **Manage Technical Capability Parameters** | Configure competency matrix parameters, benchmark scores, and criteria weights | `GET /api/manager/technical-parameters/`<br>`POST /api/manager/technical-parameters/`<br>`PATCH /api/manager/technical-parameters/{id}/` | TC-M04-01, TC-M04-02, TC-M04-03 |
| **M-05** | **Review Technical Capability** | Evaluate an intern against defined benchmarks and record mentor assessments | `GET /api/manager/technical-reviews/`<br>`POST /api/manager/technical-reviews/` | TC-M05-01, TC-M05-02, TC-M05-03 |
| **M-06** | **View Evidence** | Inspect PR links/deliverables submitted by mentees and issue approval decisions | `GET /api/manager/evidence/`<br>`POST /api/manager/evidence/{id}/decision/` | TC-M06-01, TC-M06-02, TC-M06-03 |
| **M-07** | **Give Feedback** | Deliver praise, coaching, or constructive continuous feedback to an intern | `POST /api/manager/feedback/` | TC-M07-01, TC-M07-02 |
| **M-08** | **Review Employee Feedback** | Read feedback provided by interns and append mentor comments/reflections | `GET /api/manager/employee-feedbacks/`<br>`POST /api/manager/employee-feedbacks/{id}/comment/` | TC-M08-01, TC-M08-02 |
| **M-09** | **Conduct Performance Review** | Load assigned mentee appraisal evaluation forms and criteria ratings | `GET /api/manager/appraisals/`<br>`GET /api/manager/appraisals/{id}/` | TC-M09-01, TC-M09-02 |
| **M-10** | **Save Review (Draft)** | Progressively save mentor scores and reflections without locking the cycle | `POST /api/manager/appraisals/{id}/save-draft/` | TC-M10-01, TC-M10-02 |
| **M-11** | **Submit Review** | Finalize review, calculate weighted total score, and promote to SUBMITTED | `POST /api/manager/appraisals/{id}/submit/` | TC-M11-01, TC-M11-02, TC-M11-03 |
| **M-12** | **View Previous Reviews** | Access audit logs and historical performance records for assigned mentees | `GET /api/manager/historical-reviews/` | TC-M12-01, TC-M12-02 |
| **SEC** | **Security & RBAC Enforcement** | Guard endpoints against unauthorized roles and enforce cross-mentor isolation | All `/api/manager/*` endpoints | TC-SEC-01, TC-SEC-02, TC-SEC-03 |

---

## 2. Detailed Test Cases

### M-01: View Assigned Interns/Employees

#### `TC-M01-01`: View Assigned Interns List (Positive)
- **Objective:** Verify that a logged-in Manager can retrieve their assigned mentees list with complete metrics.
- **Pre-conditions:** Manager `manager_marcus` is authenticated; at least one intern profile is assigned to Marcus.
- **Request:** `GET /api/manager/mentees/` with header `Authorization: Bearer <manager_token>`.
- **Expected Result:**
  - HTTP `200 OK`
  - Response body contains `code: 200`, `message`, `data: []`
  - Each item includes `id`, `employeeCode`, `fullName`, `email`, `designation`, `department`, `metrics` (`totalGoals`, `completedGoals`, `avgGoalProgress`, `pendingEvidence`), and `activeAppraisal`.
- **Priority:** P1 (Critical)

#### `TC-M01-02`: Filter Mentees by Search Term & Department (Positive)
- **Objective:** Verify search and filtering capabilities by intern name, employee code, or department.
- **Pre-conditions:** Direct reports exist with distinct names and departments.
- **Request:** `GET /api/manager/mentees/?search=Alex&department=Engineering`
- **Expected Result:**
  - HTTP `200 OK`
  - Only records matching name "Alex" and department "Engineering" are returned.
- **Priority:** P2 (High)

#### `TC-M01-03`: Mentees View Without Authentication (Negative)
- **Objective:** Verify unauthenticated requests are rejected.
- **Request:** `GET /api/manager/mentees/` without `Authorization` header.
- **Expected Result:** HTTP `401 Unauthorized`.
- **Priority:** P1 (Critical)

---

### M-02: Assign Tasks

#### `TC-M02-01`: Assign New Task with KPI Target to Mentee (Positive)
- **Objective:** Verify a manager can assign a new task with quantitative target value to their mentee.
- **Pre-conditions:** Active Performance Cycle exists; target mentee profile exists.
- **Request:** `POST /api/manager/tasks/`
  ```json
  {
    "employee_id": "<mentee_uuid>",
    "title": "Design RBAC Authentication Module",
    "description": "Implement JWT and role permissions middleware",
    "priority": "HIGH",
    "target_value": 100,
    "unit": "%",
    "due_date": "2026-10-15"
  }
  ```
- **Expected Result:**
  - HTTP `201 Created`
  - DB creates a `Goal` record with status `NOT_STARTED` and associated `KPI` milestone.
- **Priority:** P1 (Critical)

#### `TC-M02-02`: Assign Task with Missing Required Title (Negative)
- **Objective:** Verify validation prevents creating tasks without title.
- **Request:** `POST /api/manager/tasks/` with `{"employee_id": "<mentee_uuid>", "title": ""}`.
- **Expected Result:** HTTP `400 Bad Request` with message indicating title is required.
- **Priority:** P2 (High)

#### `TC-M02-03`: Assign Task to Non-Existent Employee (Negative)
- **Objective:** Verify error handling when passing invalid employee ID.
- **Request:** `POST /api/manager/tasks/` with `{"employee_id": "00000000-0000-0000-0000-000000000000", "title": "Test"}`.
- **Expected Result:** HTTP `404 Not Found`.
- **Priority:** P2 (High)

---

### M-03: Manage Tasks & Goals

#### `TC-M03-01`: Retrieve Manager Assigned Tasks (Positive)
- **Objective:** Verify manager can list all tasks assigned across their mentees.
- **Request:** `GET /api/manager/tasks/`
- **Expected Result:** HTTP `200 OK` returning array of tasks with priority, status, and milestone values.
- **Priority:** P2 (High)

#### `TC-M03-02`: Update Task Status & Progress Percentage (Positive)
- **Objective:** Verify updating progress updates task status and completion percentage.
- **Request:** `PATCH /api/manager/tasks/{task_id}/`
  ```json
  {
    "status": "IN_PROGRESS",
    "completion_percentage": 50.0,
    "comment": "Core views implemented"
  }
  ```
- **Expected Result:**
  - HTTP `200 OK`
  - Response shows `completionPercentage: 50.0`, `status: "IN_PROGRESS"`.
- **Priority:** P1 (Critical)

#### `TC-M03-03`: Set Task Completion to 100% (Boundary/Positive)
- **Objective:** Verify completing a task marks status as `COMPLETED`.
- **Request:** `PATCH /api/manager/tasks/{task_id}/` with `{"status": "COMPLETED", "completion_percentage": 100.0}`.
- **Expected Result:** HTTP `200 OK`; `completionPercentage` becomes `100.0` and status is `COMPLETED`.
- **Priority:** P2 (High)

---

### M-04: Manage Technical Capability Parameters

#### `TC-M04-01`: Create Technical Capability Parameter (Positive)
- **Objective:** Verify manager/mentor can add technical capability parameters for evaluation.
- **Request:** `POST /api/manager/technical-parameters/`
  ```json
  {
    "name": "Cloud Deployment & Docker",
    "category": "DevOps",
    "description": "Ability to containerize and deploy microservices",
    "benchmark_score": 4.0,
    "weight": 20.0
  }
  ```
- **Expected Result:** HTTP `201 Created` with parameter ID and active flag set to true.
- **Priority:** P2 (High)

#### `TC-M04-02`: Retrieve Active Technical Capability Parameters (Positive)
- **Objective:** List all active parameters defined for the performance cycle.
- **Request:** `GET /api/manager/technical-parameters/`
- **Expected Result:** HTTP `200 OK` returning list with benchmark scores and criteria weights.
- **Priority:** P2 (High)

#### `TC-M04-03`: Create Parameter Missing Name (Negative)
- **Objective:** Verify parameter creation requires name.
- **Request:** `POST /api/manager/technical-parameters/` with `{"name": ""}`.
- **Expected Result:** HTTP `400 Bad Request`.
- **Priority:** P3 (Medium)

---

### M-05: Review Technical Capability

#### `TC-M05-01`: Submit Technical Capability Ratings for Mentee (Positive)
- **Objective:** Verify mentor can score mentee technical parameters and record assessments.
- **Request:** `POST /api/manager/technical-reviews/`
  ```json
  {
    "employee_id": "<mentee_uuid>",
    "status": "SUBMITTED",
    "reviews": [
      {
        "parameter_id": "<param_uuid>",
        "score": 4.5,
        "mentor_assessment": "High technical proficiency with automated test cases."
      }
    ]
  }
  ```
- **Expected Result:** HTTP `200 OK` with confirmation message.
- **Priority:** P1 (Critical)

#### `TC-M05-02`: Fetch Mentee Technical Review Dossier (Positive)
- **Objective:** Retrieve technical capability dossier including average score and individual assessments.
- **Request:** `GET /api/manager/technical-reviews/?employee_id=<mentee_uuid>`
- **Expected Result:** HTTP `200 OK` returning `averageScore`, `parameters` list, and `availableEvidence`.
- **Priority:** P2 (High)

---

### M-06: View & Review Evidence

#### `TC-M06-01`: Retrieve Evidence Submissions for Assigned Mentees (Positive)
- **Objective:** Verify manager sees evidence submitted by direct reports.
- **Request:** `GET /api/manager/evidence/`
- **Expected Result:** HTTP `200 OK` returning evidence items with title, externalUrl, and reviewStatus.
- **Priority:** P1 (Critical)

#### `TC-M06-02`: Approve Evidence Submission (Positive)
- **Objective:** Verify mentor can approve evidence with remarks.
- **Request:** `POST /api/manager/evidence/{evidence_id}/decision/`
  ```json
  {
    "status": "APPROVED",
    "remarks": "Verified PR merged to main branch."
  }
  ```
- **Expected Result:** HTTP `200 OK`; evidence status updated to `APPROVED`.
- **Priority:** P1 (Critical)

#### `TC-M06-03`: Request Revision on Evidence (Positive)
- **Objective:** Verify mentor can reject or request revision on unsatisfactory deliverables.
- **Request:** `POST /api/manager/evidence/{evidence_id}/decision/`
  ```json
  {
    "status": "REVISION_REQUESTED",
    "remarks": "Please attach test execution coverage report."
  }
  ```
- **Expected Result:** HTTP `200 OK`; evidence status updated to `REVISION_REQUESTED`.
- **Priority:** P2 (High)

---

### M-07: Give Feedback

#### `TC-M07-01`: Submit Praise/Feedback to Mentee (Positive)
- **Objective:** Verify manager can send continuous praise/feedback to an assigned intern.
- **Request:** `POST /api/manager/feedback/`
  ```json
  {
    "employee_id": "<mentee_uuid>",
    "feedback_type": "PRAISE",
    "message": "Exceeded expectations in test suite implementation!",
    "visibility": "PUBLIC"
  }
  ```
- **Expected Result:** HTTP `201 Created` with published feedback ID.
- **Priority:** P2 (High)

#### `TC-M07-02`: Submit Feedback with Empty Message (Negative)
- **Objective:** Validation ensures empty feedback messages cannot be submitted.
- **Request:** `POST /api/manager/feedback/` with `{"employee_id": "<mentee_uuid>", "message": ""}`.
- **Expected Result:** HTTP `400 Bad Request`.
- **Priority:** P2 (High)

---

### M-08: Review Employee Feedback

#### `TC-M08-01`: View Feedbacks Received from Interns (Positive)
- **Objective:** Verify manager can review employee feedback and reflection records.
- **Request:** `GET /api/manager/employee-feedbacks/`
- **Expected Result:** HTTP `200 OK` returning feedback list with author and comments.
- **Priority:** P2 (High)

#### `TC-M08-02`: Post Mentor Comment on Feedback (Positive)
- **Objective:** Verify manager can add a mentor note to an employee feedback item.
- **Request:** `POST /api/manager/employee-feedbacks/{feedback_id}/comment/`
  ```json
  {
    "comment": "Thanks for the feedback; let's discuss further in our 1-1."
  }
  ```
- **Expected Result:** HTTP `201 Created` with comment ID.
- **Priority:** P2 (High)

---

### M-09, M-10, M-11: Performance Review Lifecycle

#### `TC-M09-01`: Load Mentee Appraisals for Evaluation (Positive)
- **Objective:** Verify manager can load pending performance reviews for assigned mentees.
- **Request:** `GET /api/manager/appraisals/`
- **Expected Result:** HTTP `200 OK` returning appraisals with employee details, cycle name, and status.
- **Priority:** P1 (Critical)

#### `TC-M10-01`: Save Incomplete Review as Draft (Progressive Saving) (Positive)
- **Objective:** Verify review scores can be saved progressively as draft without submission.
- **Request:** `POST /api/manager/appraisals/{appraisal_id}/save-draft/`
  ```json
  {
    "reviewer_comments": "Preliminary review draft.",
    "ratings": [
      { "criterion_id": "<criterion_uuid>", "score": 4.5, "comments": "Strong delivery" }
    ]
  }
  ```
- **Expected Result:** HTTP `200 OK`; appraisal status remains `DRAFT`.
- **Priority:** P1 (Critical)

#### `TC-M11-01`: Submit Completed Performance Review (Positive)
- **Objective:** Verify finalizing review validates criteria, calculates weighted score, and updates status to `SUBMITTED`.
- **Request:** `POST /api/manager/appraisals/{appraisal_id}/submit/`
  ```json
  {
    "reviewer_comments": "Final review completed. Recommended for full-time conversion."
  }
  ```
- **Expected Result:**
  - HTTP `200 OK`
  - `status: "SUBMITTED"`
  - `overallScore` is calculated using weighted criterion scores.
  - `submittedAt` timestamp recorded.
- **Priority:** P1 (Critical)

#### `TC-M11-02`: Submit Review Without Ratings (Negative)
- **Objective:** Verify validation prevents submitting an appraisal when criteria ratings have not been saved.
- **Pre-conditions:** Appraisal has zero criteria ratings.
- **Request:** `POST /api/manager/appraisals/{appraisal_id}/submit/`
- **Expected Result:** HTTP `400 Bad Request` with message indicating criteria must be scored.
- **Priority:** P1 (Critical)

---

### M-12: View Previous Reviews

#### `TC-M12-01`: Retrieve Historical Reviews Archive (Positive)
- **Objective:** Verify mentor has access to past historical cycles and review ratings.
- **Request:** `GET /api/manager/historical-reviews/`
- **Expected Result:** HTTP `200 OK` returning list of historical appraisals with criteria breakdowns.
- **Priority:** P2 (High)

#### `TC-M12-02`: Filter Historical Reviews by Specific Intern (Positive)
- **Objective:** Filter past reviews for a specific employee.
- **Request:** `GET /api/manager/historical-reviews/?employee_id=<mentee_uuid>`
- **Expected Result:** HTTP `200 OK` filtered to only that employee's review history.
- **Priority:** P2 (High)

---

### Security & RBAC Enforcement

#### `TC-SEC-01`: Access Manager Endpoints with INTERN Role (Negative/Security)
- **Objective:** Verify strict RBAC prevents non-manager roles from accessing mentor endpoints.
- **Pre-conditions:** Logged in as `intern_alex` (`role=INTERN`).
- **Request:** `GET /api/manager/mentees/` with intern token.
- **Expected Result:** HTTP `403 Forbidden`.
- **Priority:** P1 (Blocker)

#### `TC-SEC-02`: Cross-Manager Data Isolation (Security)
- **Objective:** Verify a manager cannot view or mutate another manager's direct reports.
- **Pre-conditions:** `manager_elena` logged in; `alex` is assigned to `manager_marcus`.
- **Request:** `GET /api/manager/mentees/` as `manager_elena`.
- **Expected Result:** Alex is NOT included in Elena's response list.
- **Priority:** P1 (Blocker)

---

## 3. Automated Test Execution

Run the complete 22-test automated suite from the terminal:

```bash
cd backend
python tests_manager_mentor.py
```

Or run using Django's native test runner:

```bash
python manage.py test apps.manager
```

### Verified Test Run Output:
```
================================================================================
 EXECUTING SOFTWARE TEST SUITE: TECH MANAGER & MENTOR MODULE (M-01 to M-12)
================================================================================
  [PASS] TC-M01-01: M-01 View assigned mentees returns 200 OK with report list
  [PASS] TC-M01-02: M-01 Filter mentees by query parameter returns filtered list
  [PASS] TC-M02-01: M-02 Assign new task to mentee succeeds with 201 Created
  [PASS] TC-M02-02: M-02 Assign task without required title/employee returns 400 Bad Request
  [PASS] TC-M03-01: M-03 Retrieve manager tasks returns active task list
  [PASS] TC-M03-02: M-03 Update task status and progress to 50% returns 200 OK
  [PASS] TC-M04-01: M-04 Create technical capability parameter returns 201 Created
  [PASS] TC-M04-02: M-04 Retrieve technical parameters returns list of benchmarks
  [PASS] TC-M05-01: M-05 Submit technical capability review scores returns 200 OK
  [PASS] TC-M05-02: M-05 Fetch mentee technical review dossier returns scored benchmarks
  [PASS] TC-M06-01: M-06 View evidence submissions returns submitted evidence list
  [PASS] TC-M06-02: M-06 Approve evidence submission updates status to APPROVED
  [PASS] TC-M07-01: M-07 Give feedback to mentee succeeds with 201 Created
  [PASS] TC-M07-02: M-07 Give feedback without message returns 400 Bad Request
  [PASS] TC-M08-01: M-08 Review employee feedbacks returns feedback feed
  [PASS] TC-M08-02: M-08 Add mentor comment to feedback returns 201 Created
  [PASS] TC-M09-01: M-09 View mentee appraisals for evaluation returns 200 OK
  [PASS] TC-M10-01: M-10 Save incomplete review as draft returns 200 with DRAFT status
  [PASS] TC-M11-01: M-11 Submit finalized review calculates overall score & sets SUBMITTED status
  [PASS] TC-M12-01: M-12 View previous reviews archive returns historical records with ratings
  [PASS] TC-SEC-01: RBAC: Intern accessing manager endpoint is blocked with 403 Forbidden
  [PASS] TC-SEC-02: Data Scoping: Other manager cannot see Marcus's assigned direct reports
================================================================================
 TEST EXECUTION SUMMARY: 22/22 Passed (100.0%) | 0 Failed
================================================================================
```
