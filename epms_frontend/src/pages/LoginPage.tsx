import React, { useState, useEffect } from "react";
import { useLoginMutation } from "../features/auth/authApi";
import { useAppDispatch } from "../hooks/reduxHooks";
import { loginSuccess } from "../features/auth/authSlice";
import { useNavigate, useLocation } from "react-router-dom";
import PerformaxAnimatedLogo from "../components/PerformaxAnimatedLogo";
import { AlertCircle } from "lucide-react";

type RoleKey = "employee" | "mentor" | "hr" | "admin" | "instructor";

interface RoleMeta {
  label: string;
  description: string;
  email: string;
  pass: string;
}

const roleMeta: Record<RoleKey, RoleMeta> = {
  employee: {
    label: "Employee / Intern",
    description: "Goals, tasks and MIRAI journey",
    email: "alex.dev@company.com",
    pass: "AlexPassword123!",
  },
  mentor: {
    label: "Mentor",
    description: "Intern goals, progress and evaluations",
    email: "marcus.tech@company.com",
    pass: "MarcusPassword123!",
  },
  hr: {
    label: "HR",
    description: "Review governance and publishing",
    email: "sarah.hr@company.com",
    pass: "SarahPassword123!",
  },
  admin: {
    label: "System Admin",
    description: "Users, access and configuration",
    email: "admin@company.com",
    pass: "Admin@123",
  },
  instructor: {
    label: "Japanese Instructor",
    description: "Language training, JLPT and evaluations",
    email: "tanaka.japanese@company.com",
    pass: "TanakaPassword123!",
  },
};

const LoginPage: React.FC = () => {
  const [role, setRole] = useState<RoleKey>("employee");
  const [email, setEmail] = useState<string>(roleMeta.employee.email);
  const [password, setPassword] = useState<string>(roleMeta.employee.pass);
  const [error, setError] = useState<string>("");

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  // Clean any legacy lockout keys on mount
  useEffect(() => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("login_attempts"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }, []);

  const handleRoleSelect = (item: RoleKey) => {
    setRole(item);
    setEmail(roleMeta[item].email);
    setPassword(roleMeta[item].pass);
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      const response = await login({ email: email.trim(), password }).unwrap();
      if (!response || !response.accessToken) {
        throw new Error(
          "Backend server unreachable or returned an invalid response. Please ensure your Django backend is running."
        );
      }
      dispatch(loginSuccess(response));
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg =
        err?.data?.detail ||
        err?.data?.message ||
        err?.message ||
        "Invalid email or password. Please check your credentials.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(34rem,0.9fr)]">
      {/* Left side branded hero panel matching Tanvi Demo */}
      <div className="login-panel relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-36 top-20 size-96 rounded-full border border-white/10" />
        <div className="absolute -right-20 top-36 size-64 rounded-full border border-purple-400/30" />
        <PerformaxAnimatedLogo variant="light" />
        <div className="relative my-auto max-w-xl">
          <span className="badge badge-purple">Performance, made purposeful</span>
          <div className="mt-7 text-5xl font-semibold leading-tight tracking-tight">
            One place to align, grow, and do your best work.
          </div>
          <div className="mt-6 max-w-lg text-lg leading-8 text-white/60">
            Performax connects goals, feedback, and growth into a clear performance journey for every person.
          </div>
        </div>
        <div className="text-xs text-white/35">
          © 2025 Performax · Secure enterprise workspace
        </div>
      </div>

      {/* Right side interactive login form matching Tanvi Demo */}
      <main className="flex min-h-screen items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-xl">
          <div className="mb-10 lg:hidden">
            <PerformaxAnimatedLogo variant="dark" />
          </div>
          <div className="mb-8">
            <div className="text-3xl font-semibold tracking-tight text-ink">
              Welcome back
            </div>
            <div className="mt-2 text-sm text-muted">
              Sign in to your Performance Management System
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-600 flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <label className="block">
                <span className="field-label">Email or Employee ID</span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="field"
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  aria-label="Password"
                  className="field"
                  required
                />
              </label>
            </div>

            {/* 5-Persona Selection Grid matching Tanvi Demo layout and button styling */}
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {(Object.keys(roleMeta) as RoleKey[]).map((item) => {
                const isSelected = role === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleRoleSelect(item)}
                    className={`button button-ghost role-option flex items-center justify-between text-left ${
                      isSelected ? "role-option-active" : ""
                    }`}
                  >
                    <span className="text-left">
                      <span className="block text-sm font-semibold text-ink">
                        {roleMeta[item].label}
                      </span>
                      <span className="mt-1 block text-xs font-normal text-muted">
                        {roleMeta[item].description}
                      </span>
                    </span>
                    <span
                      className={`radio-dot shrink-0 ml-3 ${
                        isSelected ? "radio-dot-active" : ""
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="button button-primary mt-7 w-full justify-center py-3.5 flex items-center gap-2"
            >
              <span>
                {isLoading ? "Signing in..." : `Sign in as ${roleMeta[role].label}`}
              </span>
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-muted">
            Demo workspace · No credentials required
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
