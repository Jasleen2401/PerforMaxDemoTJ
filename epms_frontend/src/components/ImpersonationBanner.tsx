import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeftCircle, Loader2, UserCheck } from "lucide-react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../hooks/reduxHooks";
import { stopImpersonation } from "../features/auth/authSlice";
import { useExitImpersonationMutation } from "../features/superadmin/superadminRoleApi";

export const ImpersonationBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isImpersonating, user, originalAdmin } = useAppSelector(
    (state) => state.auth
  );
  const [exitImpersonationApi] = useExitImpersonationMutation();
  const [isExiting, setIsExiting] = useState(false);

  if (!isImpersonating) {
    return null;
  }

  const handleReturnToAdmin = async () => {
    setIsExiting(true);
    try {
      const targetName = user?.staffName || (user as any)?.username || "User";
      // Dispatch stop to restore admin tokens first
      dispatch(stopImpersonation());

      // Attempt to notify backend audit log with restored admin credentials
      try {
        await exitImpersonationApi({ target_username: targetName }).unwrap();
      } catch (err) {
        // Exit API failure shouldn't block local restoration
        console.warn("Audit exit log error:", err);
      }

      toast.info(`Returned to Super Admin session.`);
      navigate("/employees");
    } catch (err) {
      console.error("Error returning to admin session:", err);
      toast.error("Failed to cleanly exit impersonation mode.");
    } finally {
      setIsExiting(false);
    }
  };

  const currentRole = user?.levelName || user?.roles?.[0] || "User";
  const displayName = user?.staffName || (user as any)?.username || user?.email || "Employee";

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-medium border-b border-amber-700/40"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="p-1 rounded-md bg-white/20 text-white flex-shrink-0 animate-pulse">
          <ShieldAlert size={16} />
        </span>
        <div className="truncate flex items-center gap-1.5 flex-wrap">
          <span className="font-bold tracking-wide uppercase text-[11px] bg-amber-900/40 px-2 py-0.5 rounded border border-amber-400/30">
            View-As Mode
          </span>
          <span className="text-amber-50 font-normal">
            You are logged in as
          </span>
          <span className="font-semibold text-white underline decoration-amber-300 underline-offset-2">
            {displayName}
          </span>
          <span className="text-amber-200 text-xs">
            ({currentRole})
          </span>
          <span className="hidden md:inline text-amber-200/80 text-[11px] ml-1">
            &bull; All actions are tracked in system audit log.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleReturnToAdmin}
          disabled={isExiting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-amber-900 hover:bg-amber-50 active:bg-amber-100 font-semibold text-xs transition-all shadow-xs border border-amber-300 disabled:opacity-60 cursor-pointer"
        >
          {isExiting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <ArrowLeftCircle size={14} className="text-amber-700" />
          )}
          <span>Return to Admin</span>
        </button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
