import { IdpStatus } from "../../features/idp/idpTypes";
import type { IdpStatus as IdpStatusType } from "../../features/idp/idpTypes";

const styles: Record<IdpStatusType, { bg: string; color: string; border: string }> = {
  [IdpStatus.DRAFT]: { bg: "#F5F6F8", color: "#5A6070", border: "#E0E2E8" },
  [IdpStatus.ACTIVE]: { bg: "#EEF3FD", color: "#1A56DB", border: "#BFD0F8" },
  [IdpStatus.COMPLETED]: { bg: "#EAF3DE", color: "#27500A", border: "#B8DCA0" },
  [IdpStatus.CANCELLED]: { bg: "#FCEBEB", color: "#791F1F", border: "#F5C2C2" },
};

const IdpStatusBadge = ({ status }: { status: IdpStatusType }) => {
  const style = styles[status];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 999,
      padding: "3px 9px",
      fontSize: 11,
      fontWeight: 500,
      background: style.bg,
      color: style.color,
      border: `0.5px solid ${style.border}`,
    }}>
      {status.replace("_", " ")}
    </span>
  );
};

export default IdpStatusBadge;
