# 🚀 Performax Team Git & Collaboration Workflow

This document defines the team Git lifecycle, branching conventions, Docker workflows, and pull request verification rules for the **Performax (Intern Performance Management System)** project.

---

## 1. 👥 Team Core Principles

1. **`main` is protected:** No direct pushes to `main`. Every code change enters `main` only through a peer-reviewed Pull Request (PR) approved by `@jk2518` with passing CI tests.
2. **Zero Host Dependency Setup:** Teammates do not need to install Python, Node.js, or PostgreSQL on their machines. Everything is containerized with Docker.
3. **Automated Verification:** GitHub Actions CI builds and verifies every branch and pull request against real PostgreSQL and automated test suites.
4. **Mandatory Peer Review:** Code Owner approval (`@jk2518`) is required before merging.

---

## 2. 🐳 Zero-Setup Local Development (Docker)

To start the entire application (PostgreSQL + Django API + React Frontend) without installing local libraries:

```bash
# 1. Clone the repository
git clone https://github.com/jk2518/Performax.git
cd Performax

# 2. Copy the environment template
cp .env.example .env

# 3. Start all containers (installs all libraries inside Docker automatically)
docker compose up --build
```

### Accessing Local Services
- **Web App (Frontend):** [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger):** [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **PostgreSQL Database:** `localhost:5432` (`intern_pms_db`)

### Stopping Containers
```bash
# Stop containers (preserves database data)
docker compose down

# Stop and remove all persistent data (clean slate)
docker compose down -v
```

---

## 3. 🌿 The 4 Core Module Branches

The project architecture is divided across 4 distinct functional modules. Each team member works on their respective module branch:

| Module Branch | Assigned Domain & Responsibilities |
|---|---|
| **`feature/intern-module`** | Intern Dashboard, Attendance clock-in, Goal progress tracking, Evidence submission, Self-assessment |
| **`feature/mentor-module`** | Mentor Dashboard, Goal & KPI assignment, Evidence reviews, Appraisal scoring, 360 feedback, PIP |
| **`feature/hr-module`** | HR Dashboard, Appraisal cycles, Criteria weights, Organization analytics, Report publishing |
| **`feature/superadmin-module`** | Super Admin Console, User management, RBAC role permissions, Audit trail logs |

---

## 4. 🌿 Branching Strategy for Developers

Always branch from up-to-date `main` or your designated module branch:

```bash
# Fetch latest branches from GitHub
git fetch origin

# Switch to your module branch
git switch feature/mentor-module
git pull origin feature/mentor-module

# (Optional) Create a specific task sub-branch:
git switch -c feature/mentor-kpi-review feature/mentor-module
```

### Branch Naming Conventions
- `feature/<module>-<task>`: New features (e.g., `feature/mentor-evidence-review`, `feature/hr-cycle-config`)
- `fix/<module>-<bug>`: Bug fixes (e.g., `fix/intern-attendance-date`, `fix/mentor-score-calc`)
- `refactor/<name>`: Code cleanup or restructuring
- `test/<name>`: Adding or improving automated tests
- `docs/<name>`: Documentation updates

---

## 5. 📝 Commit Standards

Write clear, structured commit messages following Conventional Commits:

```bash
git add .
git commit -m "feat(mentor): add qualitative feedback form for intern appraisal"
```

| Type | When to use |
|---|---|
| `feat:` | A new feature or endpoint |
| `fix:` | A bug fix |
| `test:` | Adding or modifying tests |
| `refactor:` | Refactoring without changing behavior |
| `docs:` | Documentation changes only |
| `chore:` | Dependency updates, tooling, or Docker config |

---

## 6. 🔄 Pull Request & Peer Review Lifecycle

```mermaid
flowchart TD
    A["Developer pushes module branch"] --> B["Open Pull Request to 'main'"]
    B --> C["GitHub Actions CI Triggers Automatically"]
    C --> D{"CI Status"}
    D -- "❌ Build/Test Failed" --> E["PR Blocked: Developer fixes & pushes updates"]
    E --> C
    D -- "✅ All Checks Pass" --> F["Reviewer tests live preview & inspects code diff"]
    F --> G{"Review Decision"}
    G -- "Request Changes" --> E
    G -- "Approve PR" --> H["Merge allowed into main by @jk2518"]
```

### Step 1: Push Branch and Open PR
```bash
git push origin feature/mentor-module
```
1. Go to the GitHub repository: [https://github.com/jk2518/Performax](https://github.com/jk2518/Performax).
2. Click **Compare & pull request**.
3. Set **Base:** `main` and **Compare:** `feature/mentor-module`.
4. Fill out the provided **Pull Request Template**.

### Step 2: Automated CI Checks
When you open a PR, GitHub Actions automatically:
- Starts PostgreSQL 16
- Runs database migrations
- Runs Django system checks and automated tests (`python manage.py test apps`)
- Installs frontend packages and builds the React bundle (`npm run build`)

> [!IMPORTANT]
> If any CI test fails, the PR will display a **Red Cross (❌)** and cannot be merged. Fix the issue locally, commit, and push again. The PR updates automatically.

### Step 3: Peer Code Review & Live Preview
Reviewers inspect the **"Files changed"** tab and preview the live code:
- **Local Live Preview:** Reviewer runs `git switch feature/mentor-module` and `docker compose up` to test the full live application at `http://localhost:5173`.
- **Cloud Preview (Vercel):** Click the automated Vercel preview deployment link in the PR comments.

### Step 4: Merging into `main`
Once the PR has:
- ✅ Green CI status
- ✅ Code Owner approval (`@jk2518`)
- Click **Squash and merge** (or **Merge pull request**).

---

## 7. 🛠️ Managing Merge Conflicts

If someone merged changes into `main` while you were working on your module branch:

```bash
# 1. Update your local main
git switch main
git pull origin main

# 2. Merge main into your module branch
git switch feature/mentor-module
git merge main

# 3. Resolve conflicts in VS Code, then:
git add .
git commit -m "fix(merge): resolve conflicts with main"
git push origin feature/mentor-module
```
