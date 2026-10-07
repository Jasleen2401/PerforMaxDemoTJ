import { DevelopmentGoalStatus } from "../../features/idp/idpTypes";
import type { DevelopmentGoalStatus as GoalStatusType } from "../../features/idp/idpTypes";

const styles: Record<GoalStatusType, { bg: string; color: string; border: string }> = {
  [DevelopmentGoalStatus.NOT_STARTED]: { bg: "#F5F6F8", color: "#5A6070", border: "#E0E2E8" },
  [DevelopmentGoalStatus.IN_PROGRESS]: { bg: "#EEF3FD", color: "#1A56DB", border: "#BFD0F8" },
  [DevelopmentGoalStatus.COMPLETED]: { bg: "#EAF3DE", color: "#27500A", border: "#B8DCA0" },
};

const GoalStatusBadge = ({ status }: { status: GoalStatusType }) => {
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

export default GoalStatusBadge;
