import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useResetPasswordMutation } from "../features/auth/authApi";
import { Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { validatePassword } from "../utils/validation";
import React from "react";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const [passwordData, setPasswordData] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setMessage({ type: 'error', text: "Invalid or missing token." }); return; }
    if (passwordData.password !== passwordData.confirmPassword) { setMessage({ type: 'error', text: "Passwords do not match." }); return; }
    
    const validationError = validatePassword(passwordData.password);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      await resetPassword({ token, newPassword: passwordData.password }).unwrap();
      setMessage({ type: 'success', text: "Password reset successfully! Redirecting to login…" });
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: "Failed to reset password. The link may have expired." });
    }
  };

  const inputStyle: React.CSSProperties = {
    background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
    padding: '9px 40px 9px 12px', fontSize: 13, color: '#111827', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Icon + heading */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ShieldCheck size={22} style={{ color: '#1A56DB' }} />
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827', marginBottom: 6 }}>Reset Password</h1>
            <p style={{ fontSize: 12, color: '#9EA3B0', lineHeight: 1.6 }}>Please enter a secure password for your EPMS account.</p>
          </div>

          {/* Card */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px 28px' }}>
            {message && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, background: message.type === 'success' ? '#EAF3DE' : '#FCEBEB', color: message.type === 'success' ? '#27500A' : '#791F1F', border: `0.5px solid ${message.type === 'success' ? '#B8DCA0' : '#F5BFBF'}` }}>
                {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {message.text}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>New Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required style={inputStyle}
                    value={passwordData.password} onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                    disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9EA3B0', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} required style={inputStyle}
                    value={passwordData.confirmPassword} onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    disabled={isLoading} />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9EA3B0', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={isLoading}
                style={{ width: '100%', background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? 'Updating…' : 'Update Password'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link to="/login" style={{ fontSize: 12, color: '#9EA3B0', textDecoration: 'none', fontWeight: 500 }}
                  className="hover:text-[#1A56DB] transition-colors">
                  Return to Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer style={{ padding: '16px 24px', borderTop: '0.5px solid #E4E6EC', background: '#FFFFFF', textAlign: 'center' }}>
        <p style={{ fontSize: 10, color: '#9EA3B0', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          &copy; {new Date().getFullYear()} EPMS Global. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default ResetPasswordPage;
