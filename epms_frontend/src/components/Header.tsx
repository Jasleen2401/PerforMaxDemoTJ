import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";
import { Search, HelpCircle, Settings, ChevronRight, Menu, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface PageInfo {
  section?: string;
  title: string;
}

const PAGE_MAP: Record<string, PageInfo> = {
  "/dashboard":            { title: "Executive Dashboard" },
  "/appraisal":              { section: "Performance Cycles", title: "Appraisal Assessments" },
  "/appraisal/design-form":  { section: "Appraisal Configuration", title: "Dynamic Form Builder" },
  "/appraisal/create-cycle": { section: "Appraisal Configuration", title: "Release Appraisal Form" },
  "/profile":              { title: "Employee Profile Hub" },
  "/notifications":        { title: "Notification Feed" },
  "/employees":            { section: "Organization Hub", title: "Employee Directory" },
  "/departments":          { section: "Organization Hub", title: "Departments" },
  "/roles":                { section: "Access Security", title: "Role Architecture" },
  "/job-levels":           { section: "Organization Hub", title: "Job Bands & Levels" },
  "/positions":            { section: "Organization Hub", title: "Tracks & Positions" },
  "/teams":                { section: "Organization Hub", title: "Organizational Teams" },
  "/permissions":          { section: "Access Security", title: "Permission Sets" },
  "/permissions/matrix":   { section: "Access Security", title: "RBAC Matrix" },
  "/permissions/assign":   { section: "Access Security", title: "Direct Permissions" },
  "/financial-years":      { section: "Cycles", title: "Financial Quarters" },
  "/performance-categories": { section: "Organization Hub", title: "Evaluation Criteria" },
  "/pip":                  { title: "Performance Recovery (PIP)" },
  "/analytics":            { section: "Executive Insights", title: "Performance Analytics" },
  "/kpi":                  { section: "Goals & KPI Management", title: "KPI Intelligence Hub" },
  "/kpi/my":               { section: "Goals & KPI Management", title: "My Goals & KRAs" },
  "/kpi/team":             { section: "Goals & KPI Management", title: "Team Performance" },
  "/kpi/manage":           { section: "Goals & KPI Management", title: "Goal Management" },
  "/kpi/library":          { section: "Goals & KPI Management", title: "KPI Library" },
  "/kpi/categories":       { section: "Goals & KPI Management", title: "KPI Categories" },
  "/kpi/org-history":      { section: "Goals & KPI Management", title: "Performance History" },
  "/meetings":             { title: "1-on-1 Sync Sessions" },
  "/continuous-feedback":  { title: "Continuous Feedback Stream" },
  "/performance-history":  { title: "Performance Pulse" },
  "/audit-logs":           { section: "Organization Hub", title: "System Audit Logs" },
};

function resolvePageInfo(pathname: string): PageInfo {
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];
  const prefix = Object.keys(PAGE_MAP)
    .filter((k) => pathname.startsWith(k) && k !== "/")
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? PAGE_MAP[prefix] : { title: "PERFORMAX" };
}

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isHR, isManager } = useAuth();
  const pageInfo = resolvePageInfo(pathname);

  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/employees?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const roleLabel = isAdmin
    ? "Super Admin"
    : isHR
    ? "HR Partner"
    : isManager
    ? "Tech Manager"
    : "Intern";

  const isInternUser = !isAdmin && !isHR && !isManager;
  const displayTitle = (pathname === "/dashboard" && isInternUser) ? "Intern Dashboard" : pageInfo.title;

  return (
    <header className="flex items-center justify-between app-header sticky top-0 z-30 shrink-0 px-6 h-14 select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>

        {/* Clean Breadcrumb Navigation */}
        <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
          {pageInfo.section ? (
            <>
              <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider text-purple-400">
                {pageInfo.section}
              </span>
              <ChevronRight size={12} className="hidden sm:block text-purple-300" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900 tracking-tight">
                {displayTitle}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-900 tracking-tight">
              {displayTitle}
            </span>
          )}
        </nav>
      </div>

      {/* Right Actions & Combined Intelligence Status */}
      <div className="flex items-center gap-3">
        {/* Global Search with ⌘K Badge */}
        <form onSubmit={handleSearchSubmit} className="relative hidden lg:flex items-center">
          <Search size={14} className="absolute left-3 text-purple-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employees, KRAs, metrics..."
            className="bg-white/80 hover:bg-white focus:bg-white text-xs text-slate-700 placeholder:text-slate-400 pl-9 pr-12 py-1.5 rounded-xl border border-purple-200/80 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/10 transition-all outline-none w-64 shadow-xs"
          />
          <kbd
            onClick={() => searchInputRef.current?.focus()}
            className="absolute right-2.5 text-[10px] font-semibold text-purple-500 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 cursor-pointer shadow-xs"
          >
            ⌘K
          </kbd>
        </form>

        {/* Active Persona Pill */}
        <div className="hidden sm:flex items-center gap-1.5 bg-purple-100/90 border border-purple-200 text-purple-800 px-3 py-1 rounded-full text-xs font-semibold shadow-xs">
          <Zap size={12} className="text-purple-600 fill-purple-600" />
          <span>{roleLabel}</span>
        </div>

        {/* Notification Bell */}
        <div className="flex items-center">
          <NotificationBell />
        </div>

        {/* Help Button */}
        <button
          className="hidden sm:flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-purple-200/80 text-purple-600 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-xs"
          title="Combined Intelligence Docs"
          aria-label="Documentation"
          onClick={() => window.open("https://www.dailoqa.com/", "_blank")}
        >
          <HelpCircle size={15} />
        </button>

        {/* Profile Settings */}
        <button
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-white border border-purple-200/80 text-purple-600 hover:text-purple-800 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-xs"
          title="My Profile & Settings"
          aria-label="Profile Settings"
          onClick={() => navigate("/profile")}
        >
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};

export default Header;
