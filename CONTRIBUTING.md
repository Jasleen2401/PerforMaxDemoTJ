# Contributing to Performax 🚀

Thank you for contributing to the **Intern Performance Management System (PMS)**!

To maintain code quality, security, and stability across our engineering team, please follow these guidelines:

---

## ⚡ Quick Start with Docker (Zero Installation)

You do **not** need to install Python, Node.js, or PostgreSQL on your host computer:

```bash
# 1. Clone & enter repository
git clone https://github.com/JatinM007/Performax.git
cd Performax

# 2. Setup environment variables
cp .env.example .env

# 3. Spin up full stack
docker compose up --build
```

---

## 📋 Contribution Checklist

Before submitting code:
1. **Create a branch:** Never commit directly to `main`. Use `feature/<name>` or `fix/<name>`.
2. **Write tests:** Add tests for new endpoints or business logic in `backend/apps/`.
3. **Verify locally:**
   - Backend tests: `docker compose exec backend python manage.py test apps` (or `python manage.py test apps`)
   - Frontend build: `docker compose exec frontend npm run build` (or `npm run build`)
4. **Follow commit conventions:** e.g., `feat(goals): add goal weighting validator`.
5. **Open a Pull Request:** Complete the checklist in `.github/pull_request_template.md`.
6. **Obtain Code Owner Approval:** At least one review approval from `@jk2518` or `@JatinM007` is required.

For full workflow details, see [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md).
