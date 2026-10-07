import { Link, useLocation, useNavigate } from "react-router-dom";

const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reason = (location.state as { reason?: string } | null)?.reason;

  return (
    <div style={{ minHeight: "100vh", background: "#F5F6F8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "40px 32px", maxWidth: 460, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 16 }}>
          <svg style={{ width: 56, height: 56, color: "#791F1F", margin: "0 auto" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p style={{ fontSize: 32, fontWeight: 700, color: "#791F1F", marginBottom: 6 }}>403</p>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#111827", marginBottom: 10 }}>Access Denied</h1>
        <p style={{ fontSize: 13, color: "#5A6070", lineHeight: 1.6, marginBottom: 24 }}>
          {reason ||
            "You do not have the required role or permission to view this page. Contact your administrator if you believe this is a mistake."}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ background: "#FFFFFF", color: "#5A6070", border: "0.5px solid #E4E6EC", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}
          >
            Go Back
          </button>
          <Link
            to="/dashboard"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#1A56DB", color: "#FFFFFF", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 500, textDecoration: "none" }}
            className="hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
