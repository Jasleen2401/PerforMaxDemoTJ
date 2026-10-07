import React from "react";

interface ChartCardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, action, children }) => {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "0.5px solid #E4E6EC",
        borderRadius: 12,
        padding: "16px 18px",
        height: "100%",
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", margin: 0 }}>
          {title}
        </p>
        {action && <div>{action}</div>}
      </div>
      <div style={{ height: 300, width: "100%" }}>{children}</div>
    </div>
  );
};

export default ChartCard;
