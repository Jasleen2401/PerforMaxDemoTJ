# Contributing to Performax 🚀

Thank you for contributing to the **Intern Performance Management System (PMS)**!

To maintain code quality, security, and stability across our engineering team, please follow these guidelines:

---

## ⚡ Quick Start with Docker (Zero Installation)

You do **not** need to install Python, Node.js, or PostgreSQL on your host computer:

```bash
# 1. Clone & enter repository
git clone https://github.com/jk2518/Performax.git
cd Performax

# 2. Setup environment variables
cp .env.example .env

# 3. Spin up full stack
docker compose up --build
```

---

## 🌿 The 4 Official Module Branches

All feature development is organized into 4 core domain branches:

| Module Branch | Domain / Responsibility |
|---|---|
| **`feature/intern-module`** | Intern Dashboard, Attendance, Evidence Upload, Self-Assessment |
| **`feature/hr-module`** | HR Partner Dashboard, Appraisal Cycles, Criteria Weights, Bell Curve Reports |
| **`feature/mentor-module`** | Mentor Dashboard, Goal/KPI Assignment, Reviews, Appraisal Scoring, PIP |
| **`feature/superadmin-module`** | Super Admin Console, User RBAC Permissions, Audit Trails |

---

## 📋 Contribution Checklist

Before submitting code:
1. **Never commit directly to `main`:** Always work on your module branch (or create sub-branches from it).
2. **Write tests:** Add tests for new endpoints or business logic in `backend/apps/`.
3. **Verify locally:**
   - Backend tests: `docker compose exec backend python manage.py test apps` (or `python manage.py test apps`)
   - Frontend build: `docker compose exec frontend npm run build` (or `npm run build`)
4. **Follow commit conventions:** e.g., `feat(mentor): add KPI evaluation slider`.
5. **Open a Pull Request:** Target `main` and complete the checklist in `.github/pull_request_template.md`.
6. **Obtain Code Owner Approval:** Final review and merge approval from `@jk2518` is required.

For full workflow details, see [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).
