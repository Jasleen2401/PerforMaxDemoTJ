import { useState } from "react";
import { Link } from "react-router-dom";
import { useForgotPasswordMutation } from "../features/auth/authApi";
import logo from "../assets/logo/Logo.jpg";
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle2 } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await forgotPassword({ email }).unwrap();
      setMessage({ type: "success", text: "Password reset link sent to your email!" });
      setEmail("");
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to send reset link. Please try again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4" style={{ background: "#F5F6F8" }}>
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center mb-6">
          <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "10px", marginBottom: 14 }}>
            <img src={logo} alt="EPMS Logo" className="w-10 h-10 object-contain" />
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>EPMS Global</p>
          <p style={{ fontSize: 12, color: "#9EA3B0", marginTop: 2 }}>Employee Performance Management System</p>
        </div>

        {/* Card */}
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "24px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: "#111827", marginBottom: 4 }}>Forgot password</h2>
          <p style={{ fontSize: 13, color: "#9EA3B0", marginBottom: 20 }}>
            Enter your email and we'll send you a link to reset your password.
          </p>

          {message && (
            <div className="flex items-center gap-2 mb-4" style={{
              background: message.type === "success" ? "#EAF3DE" : "#FCEBEB",
              border: `0.5px solid ${message.type === "success" ? "#B8DCA0" : "#F5C2C2"}`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              {message.type === "success"
                ? <CheckCircle2 size={14} style={{ color: "#27500A", flexShrink: 0 }} />
                : <AlertCircle size={14} style={{ color: "#791F1F", flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: message.type === "success" ? "#27500A" : "#791F1F" }}>{message.text}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                Work email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9EA3B0" }} />
                <input
                  id="email" type="email" required placeholder="name@company.com"
                  className="block w-full pl-10 pr-4 py-2.5 text-[13px] outline-none transition-colors"
                  style={{ background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8, color: "#111827" }}
                  value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              style={{ background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 500, border: "none" }}
              onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "#1648C0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1A56DB"; }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
                  Sending…
                </>
              ) : (
                <><Send size={14} aria-hidden="true" /> Send reset link</>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, paddingTop: 20, borderTop: "0.5px solid #E4E6EC" }}>
            <Link to="/login" className="flex items-center justify-center gap-2 group" style={{ fontSize: 13, color: "#1A56DB" }}>
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              Back to login
            </Link>
          </div>
        </div>

        <p className="text-center mt-6" style={{ fontSize: 11, color: "#9EA3B0" }}>
          © {new Date().getFullYear()} EPMS Global
          {" · "}
          <a href="#" style={{ color: "#9EA3B0" }}>Privacy</a>
          {" · "}
          <a href="#" style={{ color: "#9EA3B0" }}>Terms</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
