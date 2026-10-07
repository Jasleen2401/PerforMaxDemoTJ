import { useState } from "react";
import type React from "react";
import { DevelopmentGoalCategory } from "../../features/idp/idpTypes";
import type { DevelopmentGoalCategory as GoalCategory, DevelopmentGoalResponse } from "../../features/idp/idpTypes";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  color: "#111827",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 500,
  color: "#9EA3B0",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 5,
};

interface GoalModalProps {
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    category: GoalCategory;
    successCriteria?: string;
    targetDate: string;
  }) => Promise<void>;
  initialData?: DevelopmentGoalResponse;
}

const GoalModal = ({ onClose, onSubmit, initialData }: GoalModalProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState<GoalCategory>(initialData?.category || DevelopmentGoalCategory.TECHNICAL_SKILL);
  const [successCriteria, setSuccessCriteria] = useState(initialData?.successCriteria || "");
  const [targetDate, setTargetDate] = useState(initialData?.targetDate || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ title, description, category, successCriteria, targetDate });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 520, background: "#FFFFFF", borderRadius: 10, border: "0.5px solid #E4E6EC", padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "#111827", marginBottom: 16 }}>
          {initialData ? "Edit Development Goal" : "Add Development Goal"}
        </h2>
        <div className="space-y-3">
          <div>
            <label style={labelStyle}>Title</label>
            <input style={inputStyle} value={title} onChange={event => setTitle(event.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={category} onChange={event => setCategory(event.target.value as GoalCategory)}>
              {Object.values(DevelopmentGoalCategory).map(value => (
                <option key={value} value={value}>{value.replaceAll("_", " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Target Date</label>
            <input type="date" style={inputStyle} value={targetDate} onChange={event => setTargetDate(event.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 78 }} value={description} onChange={event => setDescription(event.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Success Criteria</label>
            <textarea style={{ ...inputStyle, minHeight: 78 }} value={successCriteria} onChange={event => setSuccessCriteria(event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ border: "0.5px solid #E4E6EC", background: "#FFFFFF", color: "#5A6070", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ border: "none", background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : initialData ? "Save Goal" : "Add Goal"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoalModal;
