import { useState } from "react";
import type React from "react";

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

interface ProgressUpdateModalProps {
  onClose: () => void;
  onSubmit: (data: { progressNote: string; progressPercent: number }) => Promise<void>;
  initialProgress?: number;
}

const ProgressUpdateModal = ({ onClose, onSubmit, initialProgress = 0 }: ProgressUpdateModalProps) => {
  const [progressNote, setProgressNote] = useState("");
  const [progressPercent, setProgressPercent] = useState(initialProgress);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ progressNote, progressPercent });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 460, background: "#FFFFFF", borderRadius: 10, border: "0.5px solid #E4E6EC", padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Add Progress Update</h2>
        <div className="space-y-3">
          <div>
            <label style={labelStyle}>Progress</label>
            <input type="range" min={0} max={100} step={5} value={progressPercent} onChange={event => setProgressPercent(Number(event.target.value))} style={{ width: "100%", accentColor: "#1A56DB" }} />
            <div style={{ fontSize: 13, color: "#111827", marginTop: 4 }}>{progressPercent}%</div>
          </div>
          <div>
            <label style={labelStyle}>Progress Note</label>
            <textarea style={{ ...inputStyle, minHeight: 100 }} value={progressNote} onChange={event => setProgressNote(event.target.value)} required />
          </div>
        </div>
        <div className="flex justify-end gap-2" style={{ marginTop: 18 }}>
          <button type="button" onClick={onClose} style={{ border: "0.5px solid #E4E6EC", background: "#FFFFFF", color: "#5A6070", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>Cancel</button>
          <button type="submit" disabled={saving} style={{ border: "none", background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving..." : "Save Update"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProgressUpdateModal;
