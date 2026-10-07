import { useGetIdpProgressByGoalQuery } from "../../services/idpApi";

const GoalProgressList = ({ goalId }: { goalId: number }) => {
  const { data, isLoading } = useGetIdpProgressByGoalQuery(goalId, { skip: !goalId });
  const updates = data?.data ?? [];

  if (isLoading) {
    return <p style={{ fontSize: 12, color: "#9EA3B0" }}>Loading progress...</p>;
  }

  if (updates.length === 0) {
    return <p style={{ fontSize: 12, color: "#9EA3B0" }}>No progress updates yet.</p>;
  }

  return (
    <div className="space-y-2">
      {updates.map(update => (
        <div key={update.updateId} style={{ borderLeft: "2px solid #BFD0F8", paddingLeft: 10 }}>
          <div className="flex items-center justify-between gap-3">
            <p style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{update.progressPercent}%</p>
            <p style={{ fontSize: 11, color: "#9EA3B0" }}>{new Date(update.createdAt).toLocaleDateString()}</p>
          </div>
          <p style={{ fontSize: 12, color: "#5A6070", marginTop: 2 }}>{update.progressNote}</p>
          <p style={{ fontSize: 11, color: "#9EA3B0", marginTop: 2 }}>By {update.updatedByName}</p>
        </div>
      ))}
    </div>
  );
};

export default GoalProgressList;
