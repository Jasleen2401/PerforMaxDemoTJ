import { useEffect, useState } from "react";
import type React from "react";
import { Plus, Trash2 } from "lucide-react";
import type { IdpResponse, IdpUpdateRequest } from "../../features/idp/idpTypes";

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

interface EditIdpModalProps {
  plan: IdpResponse;
  onClose: () => void;
  onSave: (data: IdpUpdateRequest) => Promise<void>;
}

const EditIdpModal = ({ plan, onClose, onSave }: EditIdpModalProps) => {
  const [data, setData] = useState<IdpUpdateRequest>({
    title: plan.title,
    summary: plan.summary || "",
    endDate: plan.endDate,
    scheduledFollowUpDates: plan.scheduledFollowUpDates || [],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setData({
      title: plan.title,
      summary: plan.summary || "",
      endDate: plan.endDate,
      scheduledFollowUpDates: plan.scheduledFollowUpDates || [],
    });
  }, [plan]);

  const addFollowUpDate = () => {
    setData(prev => ({ ...prev, scheduledFollowUpDates: [...(prev.scheduledFollowUpDates || []), ""] }));
  };

  const removeFollowUpDate = (index: number) => {
    setData(prev => ({
      ...prev,
      scheduledFollowUpDates: (prev.scheduledFollowUpDates || []).filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const updateFollowUpDate = (index: number, value: string) => {
    setData(prev => {
      const dates = [...(prev.scheduledFollowUpDates || [])];
      dates[index] = value;
      return { ...prev, scheduledFollowUpDates: dates };
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ...data,
        scheduledFollowUpDates: (data.scheduledFollowUpDates || []).filter(Boolean),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, width: "100%", maxWidth: 560, padding: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, color: "#111827", marginBottom: 16 }}>Edit Development Plan</h3>
        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Development Focus</label>
            <input style={inputStyle} value={data.title || ""} onChange={event => setData({ ...data, title: event.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Growth Summary</label>
            <textarea style={{ ...inputStyle, minHeight: 96 }} value={data.summary || ""} onChange={event => setData({ ...data, summary: event.target.value })} />
          </div>
          <div>
            <label style={labelStyle}>Target Completion Date</label>
            <input type="date" style={inputStyle} min={plan.startDate} value={data.endDate || ""} onChange={event => setData({ ...data, endDate: event.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Follow-up Schedule</label>
              <button type="button" onClick={addFollowUpDate} className="inline-flex items-center gap-1" style={{ border: "none", background: "#EEF3FD", color: "#1A56DB", borderRadius: 8, padding: "6px 9px", fontSize: 12 }}>
                <Plus size={12} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {(data.scheduledFollowUpDates || []).map((date, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="date" style={inputStyle} min={plan.startDate} max={data.endDate || plan.endDate} value={date} onChange={event => updateFollowUpDate(index, event.target.value)} />
                  <button type="button" onClick={() => removeFollowUpDate(index)} style={{ width: 34, height: 34, border: "0.5px solid #F5C2C2", background: "#FCEBEB", color: "#791F1F", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2" style={{ paddingTop: 4 }}>
            <button onClick={onClose} style={{ border: "0.5px solid #E4E6EC", background: "#FFFFFF", color: "#5A6070", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={isSaving} style={{ border: "none", background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 13, opacity: isSaving ? 0.7 : 1 }}>
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditIdpModal;
