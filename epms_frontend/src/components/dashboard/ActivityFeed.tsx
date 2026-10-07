import React from "react";
import { Activity } from "lucide-react";
import { formatAuditDateTime } from "../../utils/timeUtils";

interface ActivityItem {
  id: string | number;
  user: string;
  action: string;
  timestamp: string;
  module?: string;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  title?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  title = "Recent activity",
}) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E4E6EC",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "0.5px solid #E4E6EC",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
          {title}
        </span>
      </div>

      {/* Activity list */}
      <div style={{ padding: "0 18px", maxHeight: 400, overflowY: "auto" }}>
        {activities.length > 0 ? (
          activities.map((item, idx) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "12px 0",
                borderBottom:
                  idx < activities.length - 1
                    ? "0.5px solid #F0F2F6"
                    : "none",
              }}
            >
              {/* Icon square */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "#EEF3FD",
                  color: "#1A56DB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Activity size={13} aria-hidden="true" />
              </div>

              {/* Text block */}
              <div>
                <p style={{ fontSize: 12, color: "#111827", lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 500 }}>{item.user}</span>{" "}
                  {item.action}
                  {item.module && (
                    <span style={{ color: "#1A56DB", fontWeight: 500 }}>
                      {" "}
                      [{item.module}]
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 2 }}>
                  {formatAuditDateTime(item.timestamp)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p
            style={{
              padding: "16px 0",
              textAlign: "center",
              color: "#9EA3B0",
              fontSize: 13,
            }}
          >
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
