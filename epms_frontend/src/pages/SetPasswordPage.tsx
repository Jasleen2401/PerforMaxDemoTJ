import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSetPasswordMutation } from "../features/employee/employeeapi";
import { validatePassword } from "../utils/validation";
import React from "react";

const SetPasswordPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get("token"));
  const navigate = useNavigate();
  const [setPassword] = useSetPasswordMutation();

  const [password, setPassword2] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.has("token")) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setMessage({ type: 'error', text: "Invalid or missing token." }); return; }
    
    const validationError = validatePassword(password);
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    try {
      await setPassword({ token, password }).unwrap();
      setMessage({ type: 'success', text: "Password set successfully! Redirecting to login…" });
      setTimeout(() => navigate("/login"), 3000);
    } catch {
      setMessage({ type: 'error', text: "Failed to set password. The link may have expired." });
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6F8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>EPMS</span>
          <h2 style={{ fontSize: 18, fontWeight: 500, color: '#111827', marginTop: 10, marginBottom: 4 }}>Setup Your Account</h2>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>Please choose a strong password to activate your account.</p>
        </div>

        {/* Card */}
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '24px 28px' }}>
          {message && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: message.type === 'success' ? '#EAF3DE' : '#FCEBEB', color: message.type === 'success' ? '#27500A' : '#791F1F', border: `0.5px solid ${message.type === 'success' ? '#B8DCA0' : '#F5BFBF'}` }}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>
                New Password
              </label>
              <input type="password" required
                style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                value={password} onChange={e => setPassword2(e.target.value)} />
            </div>
            <button type="submit"
              style={{ width: '100%', background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              className="hover:opacity-90 transition-opacity">
              Activate Account
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordPage;
