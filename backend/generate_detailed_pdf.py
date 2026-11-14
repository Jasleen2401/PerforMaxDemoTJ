import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Skip header/footer on cover page

        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Header
        self.drawString(54, 11 * inch - 36, "PERFORMAX™ | Enterprise Performance Management System")
        self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "Confidential System Architecture & Specifications")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Footer
        self.line(54, 48, 8.5 * inch - 54, 48)
        self.drawString(54, 34, "© 2026 Performax Systems. All rights reserved.")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 34, page_str)
        self.restoreState()

def build_pdf(filename="Performax_Comprehensive_System_Architecture.pdf"):
    pdf_path = os.path.join(os.path.dirname(__file__), filename)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=26,
        leading=32,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=10
    )
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=17,
        textColor=colors.HexColor('#475569'),
        spaceAfter=22
    )
    h1 = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=8,
        spaceAfter=6,
        keepWithNext=True
    )
    h2 = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )
    body = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155'),
        spaceAfter=4
    )
    code_block = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#0F172A')
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor('#1E293B')
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )
    table_cell_code = ParagraphStyle(
        'TableCellCode',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=6.8,
        leading=8.8,
        textColor=colors.HexColor('#4338CA')
    )

    story = []

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 35))
    story.append(Paragraph("PERFORMAX™", ParagraphStyle('SuperTitle', fontName='Helvetica-Bold', fontSize=14, leading=16, textColor=colors.HexColor('#4F46E5'))))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Enterprise Performance Management & Organizational Governance System", title_style))
    story.append(Paragraph("Complete Technical Architecture, RBAC Engine, Database Schema, Database Migrations, API Surface, and Master Credentials Specification", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2.5, color=colors.HexColor('#4F46E5'), spaceAfter=25))

    cover_meta = [
        [Paragraph("Document Version", table_cell_bold), Paragraph("2.4.0 (Enterprise Release)", table_cell)],
        [Paragraph("Target Architecture", table_cell_bold), Paragraph("Django 5.x REST Backend + React 18 TypeScript Frontend", table_cell)],
        [Paragraph("Classification", table_cell_bold), Paragraph("Confidential Internal Engineering & Operations Manual", table_cell)],
        [Paragraph("System Lead", table_cell_bold), Paragraph("Google Antigravity Engineering Pair Assistant", table_cell)],
        [Paragraph("Database Scope", table_cell_bold), Paragraph("52 Custom Relational Tables, 29 Django Migrations", table_cell)],
        [Paragraph("RBAC Scope", table_cell_bold), Paragraph("4 Roles, 25 Master Permission Entitlements, Live Matrix", table_cell)],
        [Paragraph("Document Length", table_cell_bold), Paragraph("Exactly 20 Pages (Comprehensive Reference)", table_cell)],
        [Paragraph("Generated Timestamp", table_cell_bold), Paragraph("October 2026", table_cell)],
    ]
    meta_table = Table(cover_meta, colWidths=[150, 350])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 30))
    story.append(Paragraph("<b>Notice:</b> This document contains proprietary technical and operational data regarding Performax. It specifies all platform endpoints, database schemas, foreign keys, cryptographic tokens, role matrices, and default user accounts.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TABLE OF CONTENTS & DOCUMENT ROADMAP
    # =========================================================================
    story.append(Paragraph("Table of Contents & Document Roadmap", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=12))

    toc_data = [
        [Paragraph("<b>Section 1: Executive Overview & Architectural Philosophy</b>", table_cell), Paragraph("Page 3", table_cell_bold)],
        [Paragraph("<b>Section 2: Complete Technology Stack (Frontend, Backend, DevOps)</b>", table_cell), Paragraph("Page 4", table_cell_bold)],
        [Paragraph("<b>Section 3: Verified Credentials, Master Personas & Initial Access</b>", table_cell), Paragraph("Page 5", table_cell_bold)],
        [Paragraph("<b>Section 4: Super Admin Governance Engine & Operational Separation</b>", table_cell), Paragraph("Page 6", table_cell_bold)],
        [Paragraph("<b>Section 5: Super Admin Feature Breakdown (Modules 1 to 5)</b>", table_cell), Paragraph("Page 7", table_cell_bold)],
        [Paragraph("<b>Section 6: Super Admin Feature Breakdown (Modules 6 to 9)</b>", table_cell), Paragraph("Page 8", table_cell_bold)],
        [Paragraph("<b>Section 7: Dual-Layered RBAC Architecture & Evaluation Flow</b>", table_cell), Paragraph("Page 9", table_cell_bold)],
        [Paragraph("<b>Section 8: Master Permission Catalog (All 25 System Entitlements)</b>", table_cell), Paragraph("Page 10", table_cell_bold)],
        [Paragraph("<b>Section 9: Access Control Matrix (Role-to-Permission Mapping)</b>", table_cell), Paragraph("Page 11", table_cell_bold)],
        [Paragraph("<b>Section 10: Core Relational Database Schema & Data Models (Part 1)</b>", table_cell), Paragraph("Page 12", table_cell_bold)],
        [Paragraph("<b>Section 11: Relational Database Schema & Domain Entities (Part 2)</b>", table_cell), Paragraph("Page 13", table_cell_bold)],
        [Paragraph("<b>Section 12: Comprehensive Database Migration History (29 Migrations)</b>", table_cell), Paragraph("Page 14", table_cell_bold)],
        [Paragraph("<b>Section 13: Complete 52 Custom Database Tables Inventory (Part 1)</b>", table_cell), Paragraph("Page 15", table_cell_bold)],
        [Paragraph("<b>Section 14: Complete 52 Custom Database Tables Inventory (Part 2)</b>", table_cell), Paragraph("Page 16", table_cell_bold)],
        [Paragraph("<b>Section 15: Core Functional Workflows (Appraisals, KRAs, Evidence)</b>", table_cell), Paragraph("Page 17", table_cell_bold)],
        [Paragraph("<b>Section 16: Feedback, Recognition, Training & Attendance Subsystems</b>", table_cell), Paragraph("Page 18", table_cell_bold)],
        [Paragraph("<b>Section 17: Strategic Analytics, 9-Box Matrix & Sandbox Engine</b>", table_cell), Paragraph("Page 19", table_cell_bold)],
        [Paragraph("<b>Section 18: Security Invariants, Operational Commands & Approval Sign-Off</b>", table_cell), Paragraph("Page 20", table_cell_bold)],
    ]
    toc_table = Table(toc_data, colWidths=[420, 80])
    toc_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(toc_table)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: SECTION 1: EXECUTIVE OVERVIEW & ARCHITECTURAL PHILOSOPHY
    # =========================================================================
    story.append(Paragraph("Section 1: Executive Overview & Architectural Philosophy", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>1.1 System Mission & Executive Purpose</b>", h2))
    story.append(Paragraph("Performax is an enterprise-grade Performance Management System (EPMS) designed to unite high-velocity engineering milestones with rigorous corporate governance. It aligns day-to-day code evidence, mentoring check-ins, multi-tier appraisal review cycles, continuous peer feedback, and organizational taxonomy under an integrated digital platform.", body))

    story.append(Paragraph("<b>1.2 Foundational Architectural Tenets</b>", h2))
    story.append(Paragraph("<b>1. Strict Separation of Governance vs. Execution:</b> System Administrators are governors, not evaluators. Super Admin oversees system health, user lifecycle states, RBAC permission matrices, and audit ledgers, but possesses no operational authority to alter appraisal scores or review team evidence deliverables.", body))
    story.append(Paragraph("<b>2. Unified Individual Contributor Identity (Employee = Intern):</b> Performax establishes <code>EMPLOYEE</code> as the canonical individual contributor identity. Rather than segregating interns into an isolated system tier with fragmented permissions, individual contributors share an identical security baseline with zero permissions duplication while maintaining access to mentorship portals.", body))
    story.append(Paragraph("<b>3. Immutable Compliance Audit Trails:</b> All administrative actions—such as role modifications, permission matrix overwrites, account locks, and review cycle publications—are permanently recorded in an append-only audit ledger containing actor ID, target entity, IP address, user-agent, and payload diffs.", body))
    story.append(Paragraph("<b>4. Transactional RBAC Synchronization:</b> Permission modifications are atomic. Every matrix update triggers instant cache invalidation across the Redux Toolkit Query cache, ensuring active browser sessions immediately reflect updated authorization gates without system downtime.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: SECTION 2: COMPLETE TECHNOLOGY STACK
    # =========================================================================
    story.append(Paragraph("Section 2: Complete Technology Stack (Frontend, Backend, DevOps)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>2.1 Backend Engineering Stack</b>", h2))
    backend_tech = [
        [Paragraph("Framework", table_cell_bold), Paragraph("Django 5.x with Django REST Framework (DRF)", table_cell)],
        [Paragraph("Runtime Environment", table_cell_bold), Paragraph("Python 3.11+ running in isolated POSIX virtual environment", table_cell)],
        [Paragraph("Authentication Engine", table_cell_bold), Paragraph("Dual-mode: JSON Web Tokens (JWT via simplejwt) + DRF Token Auth", table_cell)],
        [Paragraph("Cryptographic Hashing", table_cell_bold), Paragraph("PBKDF2 with SHA-256 password stretching (Django default hasher)", table_cell)],
        [Paragraph("Relational Database", table_cell_bold), Paragraph("SQLite (Local/Testing), PostgreSQL (Production/Staging environments)", table_cell)],
        [Paragraph("ORM & Optimization", table_cell_bold), Paragraph("Django ORM with selective prefetch_related and select_related", table_cell)],
        [Paragraph("Modular Domain Design", table_cell_bold), Paragraph("15 Domain Apps: accounts, organization, employees, performance, goals, etc.", table_cell)],
    ]
    t_backend = Table(backend_tech, colWidths=[140, 360])
    t_backend.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_backend)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>2.2 Frontend & UI Engineering Stack</b>", h2))
    frontend_tech = [
        [Paragraph("User Interface Library", table_cell_bold), Paragraph("React 18.2 with TypeScript in strict compilation mode", table_cell)],
        [Paragraph("Build & Bundling Engine", table_cell_bold), Paragraph("Vite 5.x with ultra-fast Hot Module Replacement (HMR)", table_cell)],
        [Paragraph("State & Cache Layer", table_cell_bold), Paragraph("Redux Toolkit (RTK) + RTK Query with tag-based cache invalidation", table_cell)],
        [Paragraph("Design System", table_cell_bold), Paragraph("Tailwind CSS v3, Glassmorphic frosted glass tokens, CSS Modules", table_cell)],
        [Paragraph("Iconography Suite", table_cell_bold), Paragraph("Lucide React iconography library", table_cell)],
        [Paragraph("Client-Side Routing", table_cell_bold), Paragraph("React Router v6 with declarative ProtectedRoute and Can capability guards", table_cell)],
    ]
    t_frontend = Table(frontend_tech, colWidths=[140, 360])
    t_frontend.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(t_frontend)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: SECTION 3: VERIFIED MASTER USER CREDENTIALS
    # =========================================================================
    story.append(Paragraph("Section 3: Verified Credentials, Master Personas & Initial Access", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("The system includes pre-seeded demonstration and operational accounts representing each tier of the organizational governance hierarchy. All passwords have been verified against the database password hashers.", body))

    creds_data = [
        [Paragraph("Role", table_cell_bold), Paragraph("Full Name", table_cell_bold), Paragraph("Username", table_cell_bold), Paragraph("Corporate Email", table_cell_bold), Paragraph("Default Password", table_cell_bold)],
        [Paragraph("SUPER_ADMIN", table_cell_code), Paragraph("System Admin", table_cell), Paragraph("admin", table_cell_bold), Paragraph("admin@company.com", table_cell), Paragraph("Admin@123", table_cell_code)],
        [Paragraph("HR", table_cell_code), Paragraph("Sarah Jenkins", table_cell), Paragraph("hr_sarah", table_cell_bold), Paragraph("sarah.hr@company.com", table_cell), Paragraph("SarahPassword123!", table_cell_code)],
        [Paragraph("MANAGER", table_cell_code), Paragraph("Marcus Vance", table_cell), Paragraph("manager_marcus", table_cell_bold), Paragraph("marcus.tech@company.com", table_cell), Paragraph("MarcusPassword123!", table_cell_code)],
        [Paragraph("MANAGER", table_cell_code), Paragraph("Elena Rostova", table_cell), Paragraph("manager_elena", table_cell_bold), Paragraph("elena.qa@company.com", table_cell), Paragraph("ElenaPassword123!", table_cell_code)],
        [Paragraph("EMPLOYEE", table_cell_code), Paragraph("Alex Rivera", table_cell), Paragraph("intern_alex", table_cell_bold), Paragraph("alex.dev@company.com", table_cell), Paragraph("AlexPassword123!", table_cell_code)],
        [Paragraph("EMPLOYEE", table_cell_code), Paragraph("Liam Patel", table_cell), Paragraph("intern_liam", table_cell_bold), Paragraph("liam.qa@company.com", table_cell), Paragraph("LiamPassword123!", table_cell_code)],
        [Paragraph("HR / EMP", table_cell_code), Paragraph("Maya Lin", table_cell), Paragraph("intern_maya", table_cell_bold), Paragraph("maya.ux@company.com", table_cell), Paragraph("MayaPassword123!", table_cell_code)],
        [Paragraph("EMPLOYEE", table_cell_code), Paragraph("Jatin Maurya", table_cell), Paragraph("jatin", table_cell_bold), Paragraph("jatin@dailoqa.com", table_cell), Paragraph("jatin", table_cell_code)],
    ]
    t_creds = Table(creds_data, colWidths=[70, 95, 85, 130, 120])
    t_creds.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
    ]))
    for row in range(1, len(creds_data)):
        if row % 2 == 0:
            t_creds.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(t_creds)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Password Generation Invariant for New Employees:</b>", h2))
    story.append(Paragraph("When an administrator onboards a new employee via <code>POST /api/employees/</code>, the system automatically initializes their temporary default password as their <b>first name in lowercase</b> (e.g., employee 'Jatin Maurya' defaults to password <code>jatin</code>). New users can update their passwords upon initial login.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: SECTION 4: SUPER ADMIN GOVERNANCE ENGINE
    # =========================================================================
    story.append(Paragraph("Section 4: Super Admin Governance Engine & Operational Separation", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>4.1 The Role of the Super Admin in Performax</b>", h2))
    story.append(Paragraph("In enterprise software, blurring executive admin functions with operational duties leads to compliance and auditing breakdowns. Performax enforces a strict boundary between <b>System Governance</b> and <b>Operational Management</b>.", body))

    matrix_comparison = [
        [Paragraph("Functional Area", table_cell_bold), Paragraph("Super Admin Capability", table_cell_bold), Paragraph("Operational Lead (HR / Manager)", table_cell_bold)],
        [Paragraph("User Accounts & Security", table_cell), Paragraph("Full authority to create, assign roles, lock, unlock", table_cell), Paragraph("View team members, recommend promotions", table_cell)],
        [Paragraph("RBAC Permission Matrix", table_cell), Paragraph("Master override, can grant/revoke any code", table_cell), Paragraph("No access to permission configuration", table_cell)],
        [Paragraph("Appraisal Review Cycles", table_cell), Paragraph("No operational involvement, cannot score", table_cell), Paragraph("HR designs, launches, and finalizes cycles", table_cell)],
        [Paragraph("Evidence & Goals", table_cell), Paragraph("Cannot approve deliverables or assign KRAs", table_cell), Paragraph("Manager assigns goals and evaluates evidence", table_cell)],
        [Paragraph("System Audit Trails", table_cell), Paragraph("Inspect, filter, and export immutable logs", table_cell), Paragraph("No access to raw administrative logs", table_cell)],
        [Paragraph("Global Announcements", table_cell), Paragraph("Broadcast urgent notifications to all users", table_cell), Paragraph("Team-level messaging only", table_cell)],
    ]
    t_comp = Table(matrix_comparison, colWidths=[120, 190, 190])
    t_comp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_comp)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: SECTION 5: SUPER ADMIN FEATURE BREAKDOWN (PART 1)
    # =========================================================================
    story.append(Paragraph("Section 5: Super Admin Feature Breakdown (Modules 1 to 5)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>Module 1: Executive Dashboard (<code>/dashboard</code>)</b>", h2))
    story.append(Paragraph("• <b>System KPI Diagnostics:</b> Live counters displaying Total Registered Personnel, Active User Accounts, Inactive Profiles, Departments, and Security Roles.<br/>"
                           "• <b>Role Breakdown Widget:</b> Headcount distribution graph across all 4 tiers.<br/>"
                           "• <b>Live Audit Stream:</b> Embedded ticker of the 10 most recent administrative actions.", body))

    story.append(Paragraph("<b>Module 2: Centralized Role & Permission Center (<code>/superadmin/roles-permissions</code>)</b>", h2))
    story.append(Paragraph("• <b>Unified Staff Directory:</b> Search by Name, Username, Corporate Email, or Employee Code with pagination.<br/>"
                           "• <b>In-Place Security Role Assignment:</b> Reassign user security tiers dynamically via instant drop-down menu.<br/>"
                           "• <b>Anti-Lockout Protection:</b> System prevents accidental demotion or deactivation of the last remaining active Super Admin.", body))

    story.append(Paragraph("<b>Module 3: Security Roles Governance (<code>/roles</code>)</b>", h2))
    story.append(Paragraph("• <b>Canonical Role Profiles:</b> Clear descriptions of Super Admin, HR Partner, Technical Manager, and Employee responsibilities.<br/>"
                           "• <b>Headcount & Entitlement Badges:</b> Real-time indicators of assigned users, active account counts, and permission totals.<br/>"
                           "• <b>Directory Filter:</b> Click any role card to view members of that role.<br/>"
                           "• <b>Role Reassignment Modal:</b> Confirmation modal with privilege risk warnings.", body))

    story.append(Paragraph("<b>Module 4: Access Permissions Catalog (<code>/permissions</code>)</b>", h2))
    story.append(Paragraph("• <b>25 System Entitlements:</b> Exhaustive registry of every capability key recognized by the platform.<br/>"
                           "• <b>Categorization:</b> Grouped by System Administration, Appraisal Cycle & Governance, Goal & Performance Execution, Operations, and Feedback.<br/>"
                           "• <b>Role Grant Indicators:</b> Checkmark badges showing which roles hold each entitlement.", body))

    story.append(Paragraph("<b>Module 5: Interactive Access Control Matrix (<code>/permissions/matrix</code>)</b>", h2))
    story.append(Paragraph("• <b>Interactive Grid:</b> Checkbox matrix mapping all 25 permissions across Super Admin, HR, Manager, and Employee.<br/>"
                           "• <b>Atomic Persistence:</b> Single-click 'Save Matrix Changes' commits the entire matrix inside a database transaction.<br/>"
                           "• <b>Factory Reset:</b> 'Reset Defaults' restores the default factory RBAC configuration.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: SECTION 6: SUPER ADMIN FEATURE BREAKDOWN (PART 2)
    # =========================================================================
    story.append(Paragraph("Section 6: Super Admin Feature Breakdown (Modules 6 to 9)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>Module 6: System Audit Trails & Records (<code>/superadmin/audit-logs</code>)</b>", h2))
    story.append(Paragraph("• <b>Append-Only Audit Ledger:</b> Immutable security logs tracking logins, logouts, role changes, permission modifications, cycle releases, and account locks.<br/>"
                           "• <b>Metadata Inspector:</b> Inspect IP address, user agent, actor ID, target entity, and payload diffs.<br/>"
                           "• <b>Filter Engine:</b> Filter by severity (INFO, WARNING, CRITICAL), Actor, and Date Range.", body))

    story.append(Paragraph("<b>Module 7: Global Announcement Hub (<code>/superadmin/notifications</code>)</b>", h2))
    story.append(Paragraph("• <b>Broadcast Dispatcher:</b> Dispatch announcements to All Personnel, Managers Only, HR Only, or Employees Only.<br/>"
                           "• <b>Priority Settings:</b> Normal, High, and Urgent priority flags.<br/>"
                           "• <b>Header Bell Sync:</b> Pushes notifications to the top-right notification bell for all targeted users in active sessions.<br/>"
                           "• <b>Broadcast Archive:</b> Historical log of all sent messages.", body))

    story.append(Paragraph("<b>Module 8: Master Employee & Org Hierarchy (<code>/employees</code>, <code>/departments</code>)</b>", h2))
    story.append(Paragraph("• <b>Employee Onboarding:</b> Full CRUD interface for personal, contact, compensation, and national registration details.<br/>"
                           "• <b>Job Levels & Bands:</b> Configure seniority bands from L1 (Associate/Intern) through L6 (Director/Executive).<br/>"
                           "• <b>Positions & Tracks:</b> Define master corporate titles (Software Engineer, QA Lead, HR Generalist, etc.).<br/>"
                           "• <b>Reporting Line Hierarchy:</b> Connect employees to their direct managers for evaluation rollups.<br/>"
                           "• <b>Department Structure:</b> Dual department taxonomy (ERP Operational Department vs. Parent Banking Division).", body))

    story.append(Paragraph("<b>Module 9: Strategic Analytics & System Pulse (<code>/analytics</code>)</b>", h2))
    story.append(Paragraph("• <b>9-Box Talent Matrix:</b> Real-time mapping of team members across Performance vs. Potential.<br/>"
                           "• <b>Olympic Podium:</b> Highlights top performers by review scores and milestone achievements.<br/>"
                           "• <b>Scenario Modeling Sandbox:</b> Interactive sliders to model corporate score calibrations and bonus impact.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: SECTION 7: DUAL-LAYERED RBAC ARCHITECTURE
    # =========================================================================
    story.append(Paragraph("Section 7: Dual-Layered RBAC Architecture & Evaluation Flow", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>7.1 The Dual-Layer Evaluation Mechanism</b>", h2))
    story.append(Paragraph("Performax uses a two-tier access validation pipeline. Every incoming request must pass both Layer 1 (Role Authentication) and Layer 2 (Capability Authorization) before accessing protected resources.", body))

    flowchart_text = """
    Incoming Request (Bearer JWT Token)
           │
           ▼
    [LAYER 1: DRF View Permission Class]
    • IsAuthenticated
    • IsSuperAdmin / IsHR / IsManager / IsEmployee
    • Validates coarse role membership or token claims
           │
           ▼
    [LAYER 2: Service-Layer Capability Check]
    • RolePermissionService.get_effective_permissions_for_user(request.user)
    • Checks specific granular codes (e.g., 'CYCLE_MANAGE', 'ROLE_MANAGE')
    • Evaluates DB table: accounts_rolepermission
    • Injects automatic overrides: 'ALL' master bypass for Super Admin
           │
           ▼
    [DATABASE TRANSACTION & CONTROLLER EXECUTION]
    """
    story.append(Paragraph(flowchart_text.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_block))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>7.2 Frontend Capability Enforcement</b>", h2))
    story.append(Paragraph("The frontend mirrors backend authorization using the declarative <code>&lt;Can&gt;</code> component and the <code>useAuth()</code> hook:<br/>"
                           "• <code>&lt;Can permission=\"ROLE_MANAGE\"&gt;</code> hides or disables role change controls for unauthorized users.<br/>"
                           "• Protected routes redirect unauthorized access attempts back to the user's primary dashboard.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: SECTION 8: MASTER PERMISSION CATALOG (ALL 25 SYSTEM ENTITLEMENTS)
    # =========================================================================
    story.append(Paragraph("Section 8: Master Permission Catalog (All 25 System Entitlements)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=4))

    perms_data = [
        [Paragraph("Code", table_cell_bold), Paragraph("Permission Name", table_cell_bold), Paragraph("Domain Category", table_cell_bold), Paragraph("Description", table_cell_bold)],
        [Paragraph("ALL", table_cell_code), Paragraph("Master Super Admin Bypass", table_cell), Paragraph("System Admin", table_cell), Paragraph("Unrestricted bypass across all system endpoints and actions.", table_cell)],
        [Paragraph("SYSTEM_AUDIT", table_cell_code), Paragraph("System Audit Logs", table_cell), Paragraph("System Admin", table_cell), Paragraph("View, inspect, and export immutable audit trails.", table_cell)],
        [Paragraph("ROLE_MANAGE", table_cell_code), Paragraph("Role Management", table_cell), Paragraph("System Admin", table_cell), Paragraph("Reassign user security roles and modify RBAC profiles.", table_cell)],
        [Paragraph("PERMISSION_MANAGE", table_cell_code), Paragraph("Permission Management", table_cell), Paragraph("System Admin", table_cell), Paragraph("Configure live role permission matrices and entitlement gates.", table_cell)],
        [Paragraph("USER_MANAGE", table_cell_code), Paragraph("User Account Management", table_cell), Paragraph("System Admin", table_cell), Paragraph("Provision, lock, unlock, and manage employee accounts.", table_cell)],
        [Paragraph("REPORT_VIEW_ALL", table_cell_code), Paragraph("Org Analytics Access", table_cell), Paragraph("System Admin", table_cell), Paragraph("Access company-wide strategic analytics and 9-Box talent grid.", table_cell)],
        [Paragraph("CYCLE_MANAGE", table_cell_code), Paragraph("Appraisal Cycle Admin", table_cell), Paragraph("Appraisal Gov", table_cell), Paragraph("Create, configure, open, and close performance review cycles.", table_cell)],
        [Paragraph("CRITERIA_MANAGE", table_cell_code), Paragraph("Evaluation Criteria Admin", table_cell), Paragraph("Appraisal Gov", table_cell), Paragraph("Manage evaluation scoring criteria, rubrics, and form templates.", table_cell)],
        [Paragraph("APPRAISAL_PUBLISH", table_cell_code), Paragraph("Publish Appraisal Scores", table_cell), Paragraph("Appraisal Gov", table_cell), Paragraph("Approve, calibrate, and release final review scores.", table_cell)],
        [Paragraph("APPRAISAL_VIEW_TEAM", table_cell_code), Paragraph("Team Review Visibility", table_cell), Paragraph("Appraisal Gov", table_cell), Paragraph("View appraisals across departmental units or direct reports.", table_cell)],
        [Paragraph("KPI_LIBRARY_MANAGE", table_cell_code), Paragraph("KPI Library Management", table_cell), Paragraph("Appraisal Gov", table_cell), Paragraph("Manage corporate repository of standard KPI definitions.", table_cell)],
        [Paragraph("GOAL_ASSIGN", table_cell_code), Paragraph("Goal & KRA Assignment", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Assign and calibrate goals, milestones, and KRAs for direct reports.", table_cell)],
        [Paragraph("GOAL_VIEW_TEAM", table_cell_code), Paragraph("Team Goal Tracking", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Monitor goal progress and milestones across team members.", table_cell)],
        [Paragraph("GOAL_VIEW_OWN", table_cell_code), Paragraph("View Personal Goals", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("View personal assigned goals, weights, and completion progress.", table_cell)],
        [Paragraph("EVIDENCE_REVIEW", table_cell_code), Paragraph("Evidence Verification", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Review, approve, or reject milestone proof submissions.", table_cell)],
        [Paragraph("EVIDENCE_SUBMIT", table_cell_code), Paragraph("Submit Milestone Evidence", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Upload proof, links, and documents for completed milestones.", table_cell)],
        [Paragraph("APPRAISAL_EVALUATE", table_cell_code), Paragraph("Manager Evaluation", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Score direct reports on competencies and goals.", table_cell)],
        [Paragraph("APPRAISAL_SELF_EVALUATE", table_cell_code), Paragraph("Self-Assessment", table_cell), Paragraph("Goal & Perf", table_cell), Paragraph("Complete and submit personal self-evaluation forms.", table_cell)],
        [Paragraph("PIP_CREATE", table_cell_code), Paragraph("Initiate PIP", table_cell), Paragraph("Operations", table_cell), Paragraph("Initiate formal Performance Improvement Plans for struggling staff.", table_cell)],
        [Paragraph("PIP_VIEW_ALL", table_cell_code), Paragraph("Organization PIP Oversight", table_cell), Paragraph("Operations", table_cell), Paragraph("Access company-wide PIP tracking and monitoring dashboards.", table_cell)],
        [Paragraph("PIP_VIEW_OWN", table_cell_code), Paragraph("Personal PIP Tracking", table_cell), Paragraph("Operations", table_cell), Paragraph("View active individual PIP milestones and review dates.", table_cell)],
        [Paragraph("MEETING_MANAGE", table_cell_code), Paragraph("1-on-1 Sync Notes", table_cell), Paragraph("Operations", table_cell), Paragraph("Document, schedule, and track 1-on-1 coaching sessions.", table_cell)],
        [Paragraph("ATTENDANCE_LOG", table_cell_code), Paragraph("Attendance Logging", table_cell), Paragraph("Operations", table_cell), Paragraph("Log and view daily working hours and check-ins.", table_cell)],
        [Paragraph("IDP_VIEW", table_cell_code), Paragraph("Individual Development Plan", table_cell), Paragraph("Operations", table_cell), Paragraph("Access personalized learning roadmap and training milestones.", table_cell)],
        [Paragraph("FEEDBACK_VIEW", table_cell_code), Paragraph("Continuous Feedback Stream", table_cell), Paragraph("Feedback", table_cell), Paragraph("Access public and received continuous feedback entries.", table_cell)],
        [Paragraph("FEEDBACK_GIVE", table_cell_code), Paragraph("Give Continuous Feedback", table_cell), Paragraph("Feedback", table_cell), Paragraph("Compose and publish continuous peer and team feedback.", table_cell)],
    ]
    t_perms = Table(perms_data, colWidths=[90, 110, 85, 215])
    t_perms.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
    ]))
    for row in range(1, len(perms_data)):
        if row % 2 == 0:
            t_perms.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(t_perms)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: SECTION 9: ACCESS CONTROL MATRIX
    # =========================================================================
    story.append(Paragraph("Section 9: Access Control Matrix (Role-to-Permission Mapping)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=6))

    story.append(Paragraph("The live configuration of the Access Control Matrix, mapping permissions to Super Admin (ADM), HR Partner (HR), Technical Manager (MGR), and Employee (EMP).", body))

    matrix_rows = [
        [Paragraph("Permission Code", table_cell_bold), Paragraph("ADM", table_cell_bold), Paragraph("HR", table_cell_bold), Paragraph("MGR", table_cell_bold), Paragraph("EMP", table_cell_bold), Paragraph("Primary Purpose", table_cell_bold)],
        [Paragraph("ALL", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Full system bypass", table_cell)],
        [Paragraph("SYSTEM_AUDIT", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Audit log inspection", table_cell)],
        [Paragraph("ROLE_MANAGE", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Reassign user roles", table_cell)],
        [Paragraph("PERMISSION_MANAGE", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Edit permission matrix", table_cell)],
        [Paragraph("USER_MANAGE", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Provision user accounts", table_cell)],
        [Paragraph("REPORT_VIEW_ALL", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Strategic analytics", table_cell)],
        [Paragraph("CYCLE_MANAGE", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Appraisal cycles", table_cell)],
        [Paragraph("CRITERIA_MANAGE", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Evaluation forms", table_cell)],
        [Paragraph("APPRAISAL_PUBLISH", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Finalize scores", table_cell)],
        [Paragraph("APPRAISAL_VIEW_TEAM", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("View direct report reviews", table_cell)],
        [Paragraph("KPI_LIBRARY_MANAGE", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("KPI master library", table_cell)],
        [Paragraph("GOAL_ASSIGN", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("Assign goals & KRAs", table_cell)],
        [Paragraph("EVIDENCE_REVIEW", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("Approve work proof", table_cell)],
        [Paragraph("APPRAISAL_EVALUATE", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("Conduct manager reviews", table_cell)],
        [Paragraph("PIP_CREATE", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("Initiate PIP for staff", table_cell)],
        [Paragraph("MEETING_MANAGE", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("Document 1-on-1 syncs", table_cell)],
        [Paragraph("GOAL_VIEW_OWN", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("View personal goals", table_cell)],
        [Paragraph("EVIDENCE_SUBMIT", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("Upload milestone proof", table_cell)],
        [Paragraph("APPRAISAL_SELF_EVALUATE", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("Self-assessment forms", table_cell)],
        [Paragraph("ATTENDANCE_LOG", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("Log daily attendance", table_cell)],
        [Paragraph("IDP_VIEW", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("View training roadmap", table_cell)],
        [Paragraph("PIP_VIEW_OWN", table_cell_code), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("View own PIP status", table_cell)],
        [Paragraph("PIP_VIEW_ALL", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("NO", table_cell), Paragraph("NO", table_cell), Paragraph("Org PIP oversight", table_cell)],
        [Paragraph("FEEDBACK_VIEW", table_cell_code), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("View feedback stream", table_cell)],
        [Paragraph("FEEDBACK_GIVE", table_cell_code), Paragraph("NO", table_cell), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("YES", table_cell_bold), Paragraph("Send peer recognition", table_cell)],
    ]
    t_mat = Table(matrix_rows, colWidths=[115, 38, 38, 38, 38, 233])
    t_mat.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (1, 0), (4, -1), 'CENTER'),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
    ]))
    for row in range(1, len(matrix_rows)):
        if row % 2 == 0:
            t_mat.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(t_mat)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: SECTION 10: CORE RELATIONAL DATABASE SCHEMA (PART 1)
    # =========================================================================
    story.append(Paragraph("Section 10: Core Relational Database Schema & Data Models (Part 1)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>10.1 Accounts & Authentication Domain (<code>apps.accounts</code>)</b>", h2))
    story.append(Paragraph("• <b>User (<code>accounts_user</code>):</b> Extends Django AbstractBaseUser with UUID primary key. Fields include: <code>username</code>, <code>email</code>, <code>role</code> (SUPER_ADMIN, HR, MANAGER, EMPLOYEE, INTERN), <code>is_active</code>, <code>is_staff</code>, <code>is_superuser</code>, <code>date_joined</code>, <code>password_changed_at</code>.<br/>"
                           "• <b>RolePermission (<code>accounts_rolepermission</code>):</b> Core mapping table storing role-to-permission grants: <code>role</code>, <code>permission_code</code>, <code>description</code>, timestamps.<br/>"
                           "• <b>EmailOTP (<code>accounts_emailotp</code>):</b> Secure verification table storing time-bound one-time passwords for password recovery: <code>user</code>, <code>otp_code</code>, <code>expires_at</code>, <code>is_used</code>.<br/>"
                           "• <b>PasswordResetToken (<code>accounts_passwordresettoken</code>):</b> Cryptographic tokens for password resets.", body))

    story.append(Paragraph("<b>10.2 Employee Profile Domain (<code>apps.employees</code>)</b>", h2))
    story.append(Paragraph("• <b>EmployeeProfile (<code>employees_employeeprofile</code>):</b> Master demographic and operational record for personnel.<br/>"
                           "  - Foreign Keys: <code>user</code> (OneToOne), <code>department</code> (ForeignKey to Department), <code>parent_department</code> (ForeignKey), <code>manager</code> (ForeignKey to User), <code>position</code> (ForeignKey to Position).<br/>"
                           "  - Identity Fields: <code>employee_code</code> (e.g. EMP-001), <code>first_name</code>, <code>last_name</code>, <code>other_name</code>, <code>designation</code>, <code>joining_date</code>, <code>employment_status</code>.<br/>"
                           "  - Government ID & Contact: <code>nrc_state_code</code>, <code>nrc_township</code>, <code>nrc_type</code>, <code>nrc_number</code>, <code>phone_number</code>, <code>contact_address</code>, <code>permanent_address</code>.<br/>"
                           "  - Compensation: <code>salary</code>, <code>currency</code> (INR, MMK, USD).<br/>"
                           "  - Progression Milestones: <code>date_of_appointment</code>, <code>date_of_confirmation</code>, <code>date_of_promotion</code>.", body))

    story.append(Paragraph("<b>10.3 Organization Taxonomy Domain (<code>apps.organization</code>)</b>", h2))
    story.append(Paragraph("• <b>Department (<code>organization_department</code>):</b> <code>id</code>, <code>name</code>, <code>code</code>, <code>description</code>, <code>parent_department_id</code>.<br/>"
                           "• <b>JobLevel (<code>organization_joblevel</code>):</b> Seniority tiers: <code>level_code</code> (L1–L6), <code>level_name</code>, <code>level_rank</code> (1–6).<br/>"
                           "• <b>Position (<code>organization_position</code>):</b> Standard titles: <code>position_code</code>, <code>position_name</code>, <code>level_id</code>.<br/>"
                           "• <b>Team & TeamMembership (<code>organization_team</code>):</b> Functional squad grouping within departments.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 13: SECTION 11: RELATIONAL DATABASE SCHEMA (PART 2)
    # =========================================================================
    story.append(Paragraph("Section 11: Relational Database Schema & Domain Entities (Part 2)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>11.1 Performance & Appraisal Domain (<code>apps.performance</code>)</b>", h2))
    story.append(Paragraph("• <b>PerformanceCycle (<code>performance_performancecycle</code>):</b> Formal review periods: <code>name</code>, <code>cycle_type</code> (Annual, Quarterly), <code>start_date</code>, <code>end_date</code>, <code>status</code> (PLANNING, ACTIVE, CALIBRATING, CLOSED).<br/>"
                           "• <b>EvaluationCriterion (<code>performance_evaluationcriterion</code>):</b> Rubric items: <code>cycle_id</code>, <code>name</code>, <code>weight</code>, <code>min_score</code>, <code>max_score</code>.<br/>"
                           "• <b>Appraisal (<code>performance_appraisal</code>):</b> Core review record connecting <code>cycle</code>, <code>employee</code>, <code>manager</code>, <code>status</code> (DRAFT, SUBMITTED, REVIEWED, APPROVED, PUBLISHED), <code>final_score</code>.<br/>"
                           "• <b>AppraisalRating (<code>performance_appraisalrating</code>):</b> Criterion-level scores and comments.<br/>"
                           "• <b>PerformanceImprovementPlan (<code>performance_performanceimprovementplan</code>):</b> Formal PIP records with target dates, milestones, and progress checks.", body))

    story.append(Paragraph("<b>11.2 Goals & KRA Domain (<code>apps.goals</code>)</b>", h2))
    story.append(Paragraph("• <b>Goal (<code>goals_goal</code>):</b> Individual targets: <code>employee</code>, <code>title</code>, <code>description</code>, <code>weight</code>, <code>target_value</code>, <code>current_value</code>, <code>status</code>.<br/>"
                           "• <b>GoalProgress (<code>goals_goalprogress</code>):</b> Progress checkpoints and updates.<br/>"
                           "• <b>KpiLibrary & KpiCategory (<code>goals_kpilibrary</code>):</b> Reusable corporate KPI templates.", body))

    story.append(Paragraph("<b>11.3 Evidence & Deliverables Domain (<code>apps.evidence</code>)</b>", h2))
    story.append(Paragraph("• <b>EvidenceSubmission (<code>evidence_evidencesubmission</code>):</b> Work deliverables attached to goals: <code>goal</code>, <code>submitted_by</code>, <code>title</code>, <code>file_attachment</code>, <code>external_url</code>, <code>status</code> (PENDING, APPROVED, REJECTED), <code>reviewer_notes</code>.", body))

    story.append(Paragraph("<b>11.4 Feedback & Recognition Domain (<code>apps.feedback</code>)</b>", h2))
    story.append(Paragraph("• <b>Feedback (<code>feedback_feedback</code>):</b> Peer-to-peer and manager continuous feedback entries: <code>sender</code>, <code>recipient</code>, <code>message</code>, <code>badge_type</code>, <code>is_public</code>.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 14: SECTION 12: COMPREHENSIVE MIGRATION HISTORY
    # =========================================================================
    story.append(Paragraph("Section 12: Comprehensive Database Migration History (29 Migrations)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("The table below documents the complete progression of Django migrations that establish the relational schema across all domain applications.", body))

    mig_data = [
        [Paragraph("Application", table_cell_bold), Paragraph("Migration Number & Name", table_cell_bold), Paragraph("Applied Status", table_cell_bold), Paragraph("Structural Schema Impact", table_cell_bold)],
        [Paragraph("accounts", table_cell), Paragraph("0001_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Creates custom User model, auth groups, and initial permissions", table_cell)],
        [Paragraph("accounts", table_cell), Paragraph("0002_emailotp", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds EmailOTP table for two-factor recovery", table_cell)],
        [Paragraph("accounts", table_cell), Paragraph("0003_user_password_change_requir...", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds password reset requirements and timestamps", table_cell)],
        [Paragraph("accounts", table_cell), Paragraph("0004_rolepermission", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes dynamic RolePermission mapping table", table_cell)],
        [Paragraph("accounts", table_cell), Paragraph("0005_seed_feedback_permissions", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Seeds FEEDBACK_VIEW and FEEDBACK_GIVE baseline keys", table_cell)],
        [Paragraph("organization", table_cell), Paragraph("0001_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Creates Department and functional Team structures", table_cell)],
        [Paragraph("organization", table_cell), Paragraph("0002_joblevel_role_department_co...", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes JobLevel (L1-L6), Position, and Department codes", table_cell)],
        [Paragraph("organization", table_cell), Paragraph("0003_financialyear_performanceca...", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds FinancialYear, PerformanceCategory, and RoleLevelPermission", table_cell)],
        [Paragraph("employees", table_cell), Paragraph("0001_initial to 0006_profile_image", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes EmployeeProfile with NRC details, salary, and photo", table_cell)],
        [Paragraph("performance", table_cell), Paragraph("0001_initial to 0006_tech_capability", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Creates cycles, rubrics, appraisals, PIPs, and tech reviews", table_cell)],
        [Paragraph("goals", table_cell), Paragraph("0001_initial to 0002_kpi_audit_trail", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes Goals, KPI templates, progress logs, and audit entries", table_cell)],
        [Paragraph("evidence", table_cell), Paragraph("0001_initial to 0002_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds deliverable submission engine and file attachments", table_cell)],
        [Paragraph("feedback", table_cell), Paragraph("0001_initial to 0002_feedback_status", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds continuous feedback threads, comments, and visibility flags", table_cell)],
        [Paragraph("intern", table_cell), Paragraph("0001_initial to 0002_requires_mentor", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Provides learning task tables and mentor reviews", table_cell)],
        [Paragraph("notifications", table_cell), Paragraph("0001_initial to 0003_alter_type", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes ScheduledNotification and real-time alerts", table_cell)],
        [Paragraph("audit", table_cell), Paragraph("0001_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Creates immutable AuditLog compliance ledger", table_cell)],
        [Paragraph("attendance", table_cell), Paragraph("0001_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Establishes daily check-in and attendance records", table_cell)],
        [Paragraph("training", table_cell), Paragraph("0001_initial", table_cell_code), Paragraph("APPLIED", table_cell_bold), Paragraph("Adds training courses and employee completion tracking", table_cell)],
    ]
    t_mig = Table(mig_data, colWidths=[80, 160, 65, 195])
    t_mig.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    for row in range(1, len(mig_data)):
        if row % 2 == 0:
            t_mig.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(t_mig)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 15: SECTION 13: COMPLETE 52 CUSTOM DATABASE TABLES (PART 1)
    # =========================================================================
    story.append(Paragraph("Section 13: Complete 52 Custom Database Tables Inventory (Part 1)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    story.append(Paragraph("Tables 1 to 26 of the custom application relational schema.", body))

    t_part1 = [
        ("accounts_emailotp", "Stores 6-digit OTP codes for password recovery and 2FA"),
        ("accounts_passwordresettoken", "Stores cryptographic reset tokens with expiration timestamps"),
        ("accounts_rolepermission", "Live mapping of security roles to granular permission codes"),
        ("accounts_user", "Core user credentials, authentication flags, and security role"),
        ("attendance_attendancerecord", "Daily working hours, attendance logs, and check-in times"),
        ("audit_auditlog", "Append-only security log for administrative actions"),
        ("employees_employeeprofile", "Comprehensive personnel master records, NRC, and salary data"),
        ("evidence_evidencesubmission", "Milestone work proof uploads, links, and approval states"),
        ("feedback_feedback", "Continuous recognition, praise messages, and peer badges"),
        ("feedback_feedbackcomment", "Comment threads and replies attached to feedback posts"),
        ("goals_goal", "Assigned strategic goals, KRAs, target metrics, and weightings"),
        ("goals_goalitem", "Granular checklist items and milestone deliverables for goals"),
        ("goals_goalprogress", "Periodic milestone progress updates logged by employees"),
        ("goals_goalset", "Collections of goals grouped by cycle or review quarter"),
        ("goals_kpi", "Key Performance Indicator metrics linked to organizational goals"),
        ("goals_kpiaudittrail", "Historical audit log tracking changes made to KPI targets"),
        ("goals_kpicategory", "Domain groupings for corporate performance indicators"),
        ("goals_kpilibrary", "Master organizational library of approved KPI definitions"),
        ("goals_kpilibrarydetail", "Detailed metric rubrics and targets within KPI library"),
        ("goals_kpiprogressentry", "Progress entries logged against individual KPIs"),
        ("intern_internfeedbackreply", "Feedback responses and mentor acknowledgments"),
        ("intern_internform", "Custom form definitions for intern evaluations"),
        ("intern_internformquestion", "Questions and scoring prompts within intern forms"),
        ("intern_internformsubmission", "Submitted responses for intern evaluations"),
        ("intern_interngoalcomment", "Comments and coaching guidance left on intern goals"),
        ("intern_internselfappraisalsubmission", "Self-evaluation submissions from interns"),
    ]

    t_rows1 = []
    for t_name, desc in t_part1:
        t_rows1.append([Paragraph(t_name, table_cell_code), Paragraph(desc, table_cell)])

    table_p1 = Table(t_rows1, colWidths=[180, 320])
    table_p1.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
    ]))
    for row in range(len(t_rows1)):
        if row % 2 == 0:
            table_p1.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(table_p1)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 16: SECTION 14: COMPLETE 52 CUSTOM DATABASE TABLES (PART 2)
    # =========================================================================
    story.append(Paragraph("Section 14: Complete 52 Custom Database Tables Inventory (Part 2)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    story.append(Paragraph("Tables 27 to 52 of the custom application relational schema.", body))

    t_part2 = [
        ("intern_interntask", "Learning assignments, tasks, and code deliverables"),
        ("notifications_notification", "Individual notification messages dispatched to users"),
        ("notifications_schedulednotification", "Automated system broadcasts and scheduled announcements"),
        ("organization_department", "Business units and operational departments"),
        ("organization_financialyear", "Corporate accounting and appraisal financial years"),
        ("organization_joblevel", "Seniority tiers (L1 Associate through L6 Executive)"),
        ("organization_performancecategory", "High-level review dimensions and evaluation categories"),
        ("organization_permission", "Permission definitions for organization hierarchy"),
        ("organization_position", "Standard corporate titles and job positions"),
        ("organization_role", "Organizational security roles and definitions"),
        ("organization_rolelevelpermission", "Permission mappings tied to job level seniority"),
        ("organization_team", "Functional teams operating within departments"),
        ("organization_teammembership", "Employee assignments to functional squads"),
        ("performance_appraisal", "Master formal appraisal document connecting reviewer and reviewee"),
        ("performance_appraisalrating", "Scores and comments for individual evaluation criteria"),
        ("performance_evaluationcriterion", "Evaluation rubric parameters and criteria weightings"),
        ("performance_performancecycle", "Review cycles (Annual, Mid-Year, Quarterly)"),
        ("performance_performanceimprovementplan", "Formal PIP tracking, milestone gates, and outcomes"),
        ("performance_recognitionreward", "Formal monetary and certificate awards issued to staff"),
        ("performance_technicalcapabilityparameter", "Technical evaluation criteria for engineering reviews"),
        ("performance_technicalcapabilityreview", "Engineering evaluations scored on technical parameters"),
        ("training_employeetraining", "Training progress and certifications earned by staff"),
        ("training_trainingcourse", "Catalog of internal training modules and courses"),
        ("accounts_user_groups", "Relational mapping between user entities and Django auth groups"),
        ("accounts_user_user_permissions", "Relational mapping between users and granular permissions"),
        ("notifications_schedulednotification_specific_recipients", "Mapping of scheduled broadcasts to recipient IDs"),
    ]

    t_rows2 = []
    for t_name, desc in t_part2:
        t_rows2.append([Paragraph(t_name, table_cell_code), Paragraph(desc, table_cell)])

    table_p2 = Table(t_rows2, colWidths=[180, 320])
    table_p2.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
    ]))
    for row in range(len(t_rows2)):
        if row % 2 == 0:
            table_p2.setStyle(TableStyle([('BACKGROUND', (0, row), (-1, row), colors.HexColor('#F8FAFC'))]))
    story.append(table_p2)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 17: SECTION 15: CORE FUNCTIONAL WORKFLOWS
    # =========================================================================
    story.append(Paragraph("Section 15: Core Functional Workflows (Appraisals, KRAs, Evidence)", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>15.1 Appraisal Lifecycle State Machine</b>", h2))
    story.append(Paragraph("The performance review lifecycle progresses through distinct states governed by role permissions:", body))
    cycle_flow = """
    [1. PLANNING]      ──► HR configures cycle, assigns criteria rubrics & weightings
           │
           ▼
    [2. ACTIVE]        ──► Employees complete Self-Evaluations; Managers submit Reviews
           │
           ▼
    [3. CALIBRATION]   ──► HR reviews score distributions, resolves outliers
           │
           ▼
    [4. PUBLISHED]     ──► Final scores unlocked for employees; recorded in performance pulse
    """
    story.append(Paragraph(cycle_flow.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_block))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>15.2 Goal & Milestone Verification Pipeline</b>", h2))
    story.append(Paragraph("1. <b>Goal Formulation:</b> Tech Manager defines goals and KRAs for direct reports with percentage weightings.<br/>"
                           "2. <b>Execution & Submission:</b> Employee logs milestone progress and attaches deliverable evidence (documents, URLs).<br/>"
                           "3. <b>Manager Review:</b> Manager reviews submitted deliverables, approving or requesting revisions.<br/>"
                           "4. <b>Score Rollup:</b> Approved goals automatically update the employee's performance score on the analytics dashboard.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 18: SECTION 16: FEEDBACK, TRAINING & ATTENDANCE SUBSYSTEMS
    # =========================================================================
    story.append(Paragraph("Section 16: Feedback, Recognition, Training & Attendance Subsystems", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>16.1 Continuous Feedback & Peer Recognition</b>", h2))
    story.append(Paragraph("• <b>Real-Time Peer Recognition:</b> Employees and managers can exchange peer feedback tagged with corporate values (Innovation, Leadership, Quality).<br/>"
                           "• <b>Privacy Controls:</b> Feedback can be public or private between sender and recipient.<br/>"
                           "• <b>Recognition Badges:</b> Visual praise badges display on employee profiles.", body))

    story.append(Paragraph("<b>16.2 Training & Individual Development Plans (IDP)</b>", h2))
    story.append(Paragraph("• <b>Learning Roadmaps:</b> Tailored learning objectives and milestones assigned to individual contributors.<br/>"
                           "• <b>Course Progress Tracking:</b> Employees can log completion dates for internal courses and external certifications.<br/>"
                           "• <b>Skill Matrices:</b> Profile skills update upon successful training milestone completion.", body))

    story.append(Paragraph("<b>16.3 Daily Attendance Tracking</b>", h2))
    story.append(Paragraph("• <b>Check-In Logging:</b> Employees log working attendance via <code>POST /api/attendance/check-in/</code>.<br/>"
                           "• <b>Manager Overview:</b> Managers can view attendance streaks and working hour summaries for direct reports.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 19: SECTION 17: STRATEGIC ANALYTICS & SCENARIO SANDBOX
    # =========================================================================
    story.append(Paragraph("Section 17: Strategic Analytics, 9-Box Matrix & Sandbox Engine", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=10))

    story.append(Paragraph("<b>17.1 The 9-Box Talent Matrix</b>", h2))
    story.append(Paragraph("The strategic analytics module plots organizational talent along two axes: <b>Demonstrated Performance</b> (1.0 to 5.0) and <b>Growth Potential</b> (Low, Medium, High).", body))

    nine_box_table = [
        [Paragraph("High Potential", table_cell_bold), Paragraph("Enigma / High Risk<br/>(Low Perf, High Pot)", table_cell), Paragraph("Growth Contributor<br/>(Med Perf, High Pot)", table_cell), Paragraph("Star Performer<br/>(High Perf, High Pot)", table_cell_bold)],
        [Paragraph("Medium Potential", table_cell_bold), Paragraph("Dilemma<br/>(Low Perf, Med Pot)", table_cell), Paragraph("Core Professional<br/>(Med Perf, Med Pot)", table_cell), Paragraph("High Performer<br/>(High Perf, Med Pot)", table_cell)],
        [Paragraph("Low Potential", table_cell_bold), Paragraph("Underperformer<br/>(Low Perf, Low Pot)", table_cell), Paragraph("Effective Specialist<br/>(Med Perf, Low Pot)", table_cell), Paragraph("Trusted Master<br/>(High Perf, Low Pot)", table_cell)],
    ]
    t_9box = Table(nine_box_table, colWidths=[90, 135, 135, 140])
    t_9box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (3, 0), (3, 0), colors.HexColor('#EEF2FF')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_9box)
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>17.2 Interactive Scenario Modeling Sandbox</b>", h2))
    story.append(Paragraph("The Scenario Modeling Sandbox lets executives model organizational score adjustments before publishing review cycles:<br/>"
                           "• <b>Score Calibration Slider:</b> Simulate bell curve adjustments (+/- 15%).<br/>"
                           "• <b>Bonus Pool Projection:</b> Real-time forecasting of variable compensation pool allocations.", body))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 20: SECTION 18: SECURITY INVARIANTS & OPERATIONAL APPROVAL
    # =========================================================================
    story.append(Paragraph("Section 18: Security Invariants, Operational Commands & Approval Sign-Off", h1))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    story.append(Paragraph("<b>18.1 System Security Invariants</b>", h2))
    story.append(Paragraph("<b>1. Super Admin Anti-Lockout:</b> API rejects demoting/deactivating the sole active Super Admin (HTTP 400).<br/>"
                           "<b>2. Audit Immutability:</b> <code>AuditLog</code> is append-only with no update or deletion endpoints.<br/>"
                           "<b>3. Password Encryption:</b> Password hashes use PBKDF2 with SHA-256; raw credentials are never exposed.", body))

    story.append(Paragraph("<b>18.2 Routine Operational Commands</b>", h2))
    ops_commands = """# Start Django Backend: cd backend && source venv/bin/activate && python manage.py runserver 0.0.0.0:8000
# Start React Frontend: cd epms_frontend && npm run dev -- --host 0.0.0.0 --port 5173
# Run Migrations:       cd backend && source venv/bin/activate && python manage.py migrate
# Automated Tests:      cd backend && source venv/bin/activate && python manage.py test apps.superadmin.tests"""
    story.append(Paragraph(ops_commands.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_block))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>18.3 Document Approval & Sign-Off</b>", h2))
    sign_off = [
        [Paragraph("Reviewed By", table_cell_bold), Paragraph("System Architect / Lead Developer", table_cell)],
        [Paragraph("Release Certification", table_cell_bold), Paragraph("Verified Clean Build (TypeScript 0 errors, Python tests passed)", table_cell)],
        [Paragraph("Security Status", table_cell_bold), Paragraph("RBAC Matrix Locked, Super Admin Protected", table_cell)],
        [Paragraph("System Status", table_cell_bold), Paragraph("Ready for Production Staging", table_cell)],
    ]
    t_sign = Table(sign_off, colWidths=[140, 360])
    t_sign.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
    ]))
    story.append(t_sign)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {pdf_path}")

if __name__ == "__main__":
    build_pdf()
