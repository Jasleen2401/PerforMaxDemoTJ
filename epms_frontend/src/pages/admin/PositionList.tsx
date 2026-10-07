import { useGetPositionsQuery, useCreatePositionMutation, useDeletePositionMutation } from "../../features/org/positionApi";
import { useGetJobLevelsQuery } from "../../features/org/jobLevelApi";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Can } from "../../components/Can";

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8,
  padding: "7px 12px", fontSize: 13, color: "#111827", fontFamily: "inherit", outline: "none", width: "100%",
};

const PositionList = () => {
  const { data: positions, isLoading: positionsLoading, error: positionsError } = useGetPositionsQuery();
  const { data: levels, isLoading: levelsLoading } = useGetJobLevelsQuery();
  const [createPosition] = useCreatePositionMutation();
  const [deletePosition] = useDeletePositionMutation();
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionCode, setNewPositionCode] = useState("");
  const [selectedLevelId, setSelectedLevelId] = useState<number | "">("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionName.trim() || !newPositionCode.trim() || !selectedLevelId) return;
    try {
      await createPosition({ positionName: newPositionName, positionCode: newPositionCode, levelId: Number(selectedLevelId) }).unwrap();
      setNewPositionName(""); setNewPositionCode(""); setSelectedLevelId("");
    } catch (err) {
      console.error("Failed to create position", err);
    }
  };

  if (positionsLoading || levelsLoading) return <div className="py-16 text-center" style={{ color: "#9EA3B0", fontSize: 13 }}>Loading…</div>;
  if (positionsError) return <div className="py-16 text-center" style={{ color: "#791F1F", fontSize: 13 }}>Error loading positions.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 500, color: "#111827" }}>Positions</h1>
        <p style={{ fontSize: 13, color: "#9EA3B0", marginTop: 2 }}>Manage job positions and their associated levels.</p>
      </div>

      <Can permission="ORG_POSITION_MANAGE">
      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "16px 18px" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#111827", marginBottom: 12 }}>Add position</p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input style={inputStyle} placeholder="Code (e.g. SE)" value={newPositionCode} onChange={(e) => setNewPositionCode(e.target.value)} />
          <input style={inputStyle} placeholder="Position name" value={newPositionName} onChange={(e) => setNewPositionName(e.target.value)} />
          <select
            style={{ ...inputStyle }}
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select level</option>
            {levels?.map(level => (
              <option key={level.levelId} value={level.levelId}>{level.levelName} ({level.levelCode})</option>
            ))}
          </select>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 transition-colors"
            style={{ background: "#1A56DB", color: "#FFFFFF", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 500, border: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1648C0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#1A56DB"; }}
          >
            <Plus size={14} aria-hidden="true" /> Add
          </button>
        </form>
      </div>
      </Can>

      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 440 }}>
            <thead>
              <tr style={{ borderBottom: "0.5px solid #E4E6EC" }}>
                {["Code", "Position name", "Level", "Actions"].map((h, i) => (
                  <th key={h} style={{ padding: "10px 18px", fontSize: 11, fontWeight: 500, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: i === 3 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions?.map((pos, idx) => (
                <tr key={pos.positionId} style={{ borderBottom: idx < positions.length - 1 ? "0.5px solid #F0F2F6" : "none" }}
                  className="hover:bg-[#FAFBFF] transition-colors">
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "#1A56DB", fontFamily: "monospace" }}>{pos.positionCode}</td>
                  <td style={{ padding: "11px 18px", fontSize: 13, fontWeight: 500, color: "#111827" }}>{pos.positionName}</td>
                  <td style={{ padding: "11px 18px", fontSize: 12, color: "#5A6070" }}>{pos.levelName}</td>
                  <td style={{ padding: "11px 18px", textAlign: "right" }}>
                    <Can permission="ORG_POSITION_MANAGE">
                      <button
                        onClick={() => deletePosition(pos.positionId)}
                        className="inline-flex items-center gap-1 transition-colors"
                        style={{ fontSize: 12, color: "#791F1F", background: "#FCEBEB", border: "0.5px solid #F5C2C2", borderRadius: 6, padding: "3px 8px" }}
                      >
                        <Trash2 size={12} aria-hidden="true" /> Delete
                      </button>
                    </Can>
                  </td>
                </tr>
              ))}
              {positions?.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "24px 18px", textAlign: "center", fontSize: 13, color: "#9EA3B0" }}>No positions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PositionList;
