import React from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: string;
  subtitle?: string;
  onClick?: () => void;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  blue:   { bg: "#EEF2FF", text: "#4338CA", border: "#E0E7FF" },
  indigo: { bg: "#EEF2FF", text: "#4338CA", border: "#E0E7FF" },
  green:  { bg: "#ECFDF5", text: "#059669", border: "#D1FAE5" },
  orange: { bg: "#FFFBEB", text: "#D97706", border: "#FEF3C7" },
  red:    { bg: "#FEF2F2", text: "#DC2626", border: "#FEE2E2" },
  purple: { bg: "#FAF5FF", text: "#7C3AED", border: "#F3E8FF" },
};

const DashboardStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = "indigo",
  subtitle,
  onClick,
}) => {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`dailoqa-card p-5 select-none relative overflow-hidden group transition-all duration-200 ${
        isClickable
          ? "cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          : ""
      }`}
    >
      {/* Top Row: Icon container + Trend Badge */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
          style={{
            background: colors.bg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
          }}
        >
          {icon}
        </div>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
              trend.isUp
                ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                : "bg-rose-50 text-rose-700 border-rose-200/80"
            }`}
          >
            {trend.isUp ? "↑" : "↓"} {trend.value}%
          </span>
        )}
      </div>

      {/* Value */}
      <div className="mt-4">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900 block leading-none group-hover:text-indigo-950 transition-colors">
          {value}
        </span>
      </div>

      {/* Label */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 truncate group-hover:text-slate-800 transition-colors">{title}</span>
        {subtitle && <span className="text-[10.5px] text-slate-400 truncate group-hover:text-indigo-600 transition-colors">{subtitle}</span>}
      </div>
    </div>
  );
};

export default DashboardStatCard;
