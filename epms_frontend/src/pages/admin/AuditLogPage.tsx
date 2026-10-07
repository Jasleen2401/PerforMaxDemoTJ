import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatAuditDateTime, formatAuditDateValue } from "../../utils/timeUtils";
import {
  useExportAuditCsvMutation,
  useExportAuditPdfMutation,
  useGetAuditLogDetailQuery,
  useGetAuditLogsQuery,
  useGetAuditStatisticsQuery,
  useGetAuditSummaryQuery,
} from "../../features/audit/auditApi";
import type { AuditAction, AuditLogDTO, AuditStatus } from "../../features/audit/auditTypes";

const ACTIONS: Array<"" | AuditAction> = ["", "CREATE", "INSERT", "UPDATE", "DELETE", "ACCESS", "RESTORE", "EXPORT"];
const STATUSES: Array<"" | AuditStatus> = ["", "SUCCESS", "FAILURE", "WARNING"];

const inputStyle: React.CSSProperties = {
  background: "#F5F6F8",
  border: "0.5px solid #E0E2E8",
  borderRadius: 8,
  color: "#111827",
  fontFamily: "inherit",
  fontSize: 12,
  outline: "none",
  padding: "7px 10px",
};

const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: "#EAF3DE", text: "#27500A" },
  INSERT: { bg: "#EAF3DE", text: "#27500A" },
  UPDATE: { bg: "#EEF3FD", text: "#0C447C" },
  DELETE: { bg: "#FCEBEB", text: "#791F1F" },
  ACCESS: { bg: "#F1EFE8", text: "#444441" },
  RESTORE: { bg: "#FAEEDA", text: "#633806" },
  EXPORT: { bg: "#E9F7F5", text: "#0E5D56" },
};

const statusColors: Record<string, { bg: string; text: string }> = {
  SUCCESS: { bg: "#EAF3DE", text: "#27500A" },
  FAILURE: { bg: "#FCEBEB", text: "#791F1F" },
  WARNING: { bg: "#FAEEDA", text: "#633806" },
};

const toLocalInputDate = (date: Date) => format(date, "yyyy-MM-dd");

const startOfDateTime = (date: string) => (date ? `${date}T00:00:00` : undefined);
const endOfDateTime = (date: string) => (date ? `${date}T23:59:59` : undefined);

const StatCard = ({ label, value, tone }: { label: string; value?: number; tone: { bg: string; text: string } }) => (
  <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "14px 16px" }}>
    <div className="flex items-center justify-between gap-3">
      <p style={{ color: "#5A6070", fontSize: 12 }}>{label}</p>
      <span style={{ background: tone.bg, color: tone.text, borderRadius: 6, fontSize: 10, fontWeight: 500, padding: "2px 6px" }}>
        audit
      </span>
    </div>
    <p style={{ color: "#111827", fontSize: 22, fontWeight: 500, marginTop: 8 }}>{value ?? 0}</p>
  </div>
);

const Badge = ({ value, colors }: { value: string; colors: Record<string, { bg: string; text: string }> }) => {
  const tone = colors[value] ?? { bg: "#F1EFE8", text: "#444441" };
  return (
    <span style={{ background: tone.bg, color: tone.text, borderRadius: 6, fontSize: 10, fontWeight: 500, padding: "3px 7px", whiteSpace: "nowrap" }}>
      {value.replaceAll("_", " ")}
    </span>
  );
};

const AuditDetailPanel = ({ auditId, onClose }: { auditId: number; onClose: () => void }) => {
  const { data: detail, isLoading, isError } = useGetAuditLogDetailQuery(auditId);
  const changes = Object.values(detail?.fieldChanges ?? {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20" onClick={onClose}>
      <aside
        className="h-full w-full max-w-xl overflow-y-auto"
        style={{ background: "#FFFFFF", boxShadow: "-16px 0 40px rgba(17, 24, 39, 0.12)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between" style={{ background: "#FFFFFF", borderBottom: "0.5px solid #E4E6EC", padding: "16px 18px" }}>
          <div>
            <p style={{ fontSize: 11, color: "#9EA3B0", textTransform: "uppercase", letterSpacing: "0.5px" }}>Audit detail</p>
            <h2 style={{ color: "#111827", fontSize: 16, fontWeight: 500 }}>Event #{auditId}</h2>
          </div>
          <button
            onClick={onClose}
            title="Close"
            style={{ alignItems: "center", borderRadius: 8, color: "#5A6070", display: "flex", height: 32, justifyContent: "center", width: 32 }}
            className="hover:bg-[#F0F2F8]"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {isLoading && <p style={{ color: "#9EA3B0", fontSize: 13 }}>Loading event detail...</p>}
          {isError && <p style={{ color: "#791F1F", fontSize: 13 }}>Unable to load this audit event.</p>}
          {detail && (
            <div className="space-y-4">
              <div style={{ border: "0.5px solid #E4E6EC", borderRadius: 12, padding: 14 }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>Action</p>
                    <div style={{ marginTop: 5 }}><Badge value={detail.action} colors={actionColors} /></div>
                  </div>
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>Status</p>
                    <div style={{ marginTop: 5 }}><Badge value={detail.status} colors={statusColors} /></div>
                  </div>
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>Entity</p>
                    <p style={{ color: "#111827", fontSize: 13, marginTop: 4 }}>{detail.tableName} #{detail.recordId}</p>
                  </div>
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>Changed at</p>
                    <p style={{ color: "#111827", fontSize: 13, marginTop: 4 }}>{formatAuditDateTime(detail.changedAt)}</p>
                  </div>
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>Changed by</p>
                    <p style={{ color: "#111827", fontSize: 13, marginTop: 4 }}>{detail.changedByName}</p>
                  </div>
                  <div>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>IP address</p>
                    <p style={{ color: "#111827", fontSize: 13, marginTop: 4 }}>{detail.ipAddress || "-"}</p>
                  </div>
                </div>
                {detail.userAgent && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ color: "#9EA3B0", fontSize: 11 }}>User agent</p>
                    <p style={{ color: "#5A6070", fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>{detail.userAgent}</p>
                  </div>
                )}
              </div>

              <div style={{ border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: "#FAFBFF", borderBottom: "0.5px solid #E4E6EC", padding: "11px 14px" }}>
                  <h3 style={{ color: "#111827", fontSize: 13, fontWeight: 500 }}>Field changes</h3>
                </div>
                {changes.length === 0 ? (
                  <p style={{ color: "#9EA3B0", fontSize: 12, padding: 14 }}>No field-level payload was included for this event.</p>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {changes.map((change) => (
                      <div key={change.fieldName} style={{ padding: 14 }}>
                        <p style={{ color: "#111827", fontSize: 12, fontWeight: 500 }}>{change.fieldName}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" style={{ marginTop: 8 }}>
                          <div style={{ background: "#FCEBEB", borderRadius: 8, padding: 10 }}>
                            <p style={{ color: "#791F1F", fontSize: 10, fontWeight: 500 }}>Old value</p>
                            <p style={{ color: "#111827", fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>{change.oldValue == null ? "null" : formatAuditDateValue(change.oldValue)}</p>
                          </div>
                          <div style={{ background: "#EAF3DE", borderRadius: 8, padding: 10 }}>
                            <p style={{ color: "#27500A", fontSize: 10, fontWeight: 500 }}>New value</p>
                            <p style={{ color: "#111827", fontSize: 12, marginTop: 4, wordBreak: "break-word" }}>{change.newValue == null ? "null" : formatAuditDateValue(change.newValue)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

const AuditLogPage = () => {
  const [page, setPage] = useState(0);
  const [tableName, setTableName] = useState("");
  const [recordId, setRecordId] = useState("");
  const [changedBy, setChangedBy] = useState("");
  const [action, setAction] = useState<"" | AuditAction>("");
  const [status, setStatus] = useState<"" | AuditStatus>("");
  const [fromDate, setFromDate] = useState(toLocalInputDate(subDays(new Date(), 30)));
  const [toDate, setToDate] = useState(toLocalInputDate(new Date()));
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const size = 20;

  const filters = useMemo(
    () => ({
      tableName,
      recordId: recordId ? Number(recordId) : undefined,
      changedBy: changedBy ? Number(changedBy) : undefined,
      action: action || undefined,
      status: status || undefined,
      startDate: startOfDateTime(fromDate),
      endDate: endOfDateTime(toDate),
      page,
      size,
    }),
    [action, changedBy, fromDate, page, recordId, status, tableName, toDate],
  );

  const { data: auditPage, isLoading, isFetching, isError, refetch } = useGetAuditLogsQuery(filters);
  const { data: summary } = useGetAuditSummaryQuery({
    employeeId: changedBy ? Number(changedBy) : undefined,
    startDate: startOfDateTime(fromDate),
    endDate: endOfDateTime(toDate),
  });
  const { data: statistics } = useGetAuditStatisticsQuery({ fromDate, toDate });
  const [exportCsv, { isLoading: isExportingCsv }] = useExportAuditCsvMutation();
  const [exportPdf, { isLoading: isExportingPdf }] = useExportAuditPdfMutation();

  const logs = auditPage?.content ?? [];
  const topTables = Object.entries(summary?.changesByTable ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const resetFilters = () => {
    setTableName("");
    setRecordId("");
    setChangedBy("");
    setAction("");
    setStatus("");
    setFromDate(toLocalInputDate(subDays(new Date(), 30)));
    setToDate(toLocalInputDate(new Date()));
    setPage(0);
  };

  const exportParams = {
    tableName,
    changedBy: changedBy ? Number(changedBy) : undefined,
    fromDate,
    toDate,
  };

  const rowKey = (log: AuditLogDTO) => `${log.auditId}-${log.changedAt}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} style={{ color: "#1A56DB" }} aria-hidden="true" />
            <h1 style={{ color: "#111827", fontSize: 18, fontWeight: 500 }}>Audit Logs</h1>
          </div>
          <p style={{ color: "#9EA3B0", fontSize: 13, marginTop: 2 }}>
            Review system changes, investigate entity history, and export compliance records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 8, color: "#5A6070", fontSize: 12, padding: "7px 10px" }}
          >
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
          <button
            onClick={() => exportCsv(exportParams)}
            disabled={isExportingCsv}
            className="inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: "#EAF3DE", border: "0.5px solid #B8DCA0", borderRadius: 8, color: "#27500A", fontSize: 12, padding: "7px 10px" }}
          >
            <Download size={13} aria-hidden="true" /> CSV
          </button>
          <button
            onClick={() => exportPdf({ ...exportParams, reportType: "CUSTOM_RANGE" })}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: "#FCEBEB", border: "0.5px solid #F5C2C2", borderRadius: 8, color: "#791F1F", fontSize: 12, padding: "7px 10px" }}
          >
            <FileText size={13} aria-hidden="true" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total events" value={summary?.totalChanges ?? statistics?.totalAuditEntries} tone={{ bg: "#EEF3FD", text: "#0C447C" }} />
        <StatCard label="Created" value={summary?.createdCount} tone={{ bg: "#EAF3DE", text: "#27500A" }} />
        <StatCard label="Updated" value={summary?.updatedCount} tone={{ bg: "#EEF3FD", text: "#0C447C" }} />
        <StatCard label="Deleted" value={summary?.deletedCount} tone={{ bg: "#FCEBEB", text: "#791F1F" }} />
        <StatCard label="Avg. per day" value={statistics?.averageChangesPerDay} tone={{ bg: "#FAEEDA", text: "#633806" }} />
      </div>

      <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "14px 16px" }}>
        <div className="mb-3 flex items-center gap-2">
          <Filter size={14} style={{ color: "#5A6070" }} aria-hidden="true" />
          <p style={{ color: "#111827", fontSize: 13, fontWeight: 500 }}>Filters</p>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <div className="relative md:col-span-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9EA3B0" }} aria-hidden="true" />
            <input
              value={tableName}
              onChange={(event) => { setTableName(event.target.value); setPage(0); }}
              placeholder="Table name"
              style={{ ...inputStyle, paddingLeft: 30, width: "100%" }}
            />
          </div>
          <input
            value={recordId}
            onChange={(event) => { setRecordId(event.target.value); setPage(0); }}
            placeholder="Record ID"
            inputMode="numeric"
            style={inputStyle}
          />
          <input
            value={changedBy}
            onChange={(event) => { setChangedBy(event.target.value); setPage(0); }}
            placeholder="User ID"
            inputMode="numeric"
            style={inputStyle}
          />
          <select value={action} onChange={(event) => { setAction(event.target.value as "" | AuditAction); setPage(0); }} style={inputStyle}>
            {ACTIONS.map((item) => <option key={item || "ALL"} value={item}>{item || "All actions"}</option>)}
          </select>
          <select value={status} onChange={(event) => { setStatus(event.target.value as "" | AuditStatus); setPage(0); }} style={inputStyle}>
            {STATUSES.map((item) => <option key={item || "ALL"} value={item}>{item || "All statuses"}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} style={inputStyle} />
          <input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} style={inputStyle} />
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={resetFilters} style={{ color: "#5A6070", fontSize: 12, padding: "5px 8px" }} className="hover:text-[#111827]">
            Reset filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, overflow: "hidden" }}>
          {isError ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <AlertTriangle size={24} style={{ color: "#791F1F", margin: "0 auto 8px" }} aria-hidden="true" />
              <p style={{ color: "#791F1F", fontSize: 13 }}>Unable to load audit logs.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 900 }}>
                <thead>
                  <tr style={{ background: "#FAFBFF", borderBottom: "0.5px solid #E4E6EC" }}>
                    {["Event", "Entity", "Action", "Changed by", "Changed at", "IP", "Status", ""].map((heading) => (
                      <th key={heading} style={{ color: "#9EA3B0", fontSize: 11, fontWeight: 500, letterSpacing: "0.5px", padding: "11px 14px", textTransform: "uppercase" }}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={8} style={{ color: "#9EA3B0", fontSize: 13, padding: 32, textAlign: "center" }}>Loading audit logs...</td></tr>
                  )}
                  {!isLoading && logs.map((log, index) => (
                    <tr key={rowKey(log)} className="hover:bg-[#FAFBFF]" style={{ borderBottom: index < logs.length - 1 ? "0.5px solid #F0F2F6" : "none" }}>
                      <td style={{ color: "#111827", fontFamily: "monospace", fontSize: 12, padding: "12px 14px" }}>#{log.auditId}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <p style={{ color: "#111827", fontSize: 12 }}>{log.tableName}</p>
                        <p style={{ color: "#9EA3B0", fontSize: 11 }}>Record #{log.recordId}</p>
                      </td>
                      <td style={{ padding: "12px 14px" }}><Badge value={log.action} colors={actionColors} /></td>
                      <td style={{ color: "#5A6070", fontSize: 12, padding: "12px 14px" }}>{log.changedByName || "-"}</td>
                      <td style={{ color: "#5A6070", fontSize: 12, padding: "12px 14px", whiteSpace: "nowrap" }}>{formatAuditDateTime(log.changedAt)}</td>
                      <td style={{ color: "#9EA3B0", fontSize: 12, padding: "12px 14px" }}>{log.ipAddress || "-"}</td>
                      <td style={{ padding: "12px 14px" }}><Badge value={log.status} colors={statusColors} /></td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedAuditId(log.auditId)}
                          title="View detail"
                          className="hover:bg-info-fill hover:text-[#1A56DB]"
                          style={{ alignItems: "center", borderRadius: 7, color: "#9EA3B0", display: "inline-flex", height: 28, justifyContent: "center", width: 28 }}
                        >
                          <Eye size={14} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!isLoading && logs.length === 0 && (
                    <tr><td colSpan={8} style={{ color: "#9EA3B0", fontSize: 13, padding: 32, textAlign: "center" }}>No audit events match the current filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: 16 }}>
          <h2 style={{ color: "#111827", fontSize: 13, fontWeight: 500 }}>Top changed tables</h2>
          <div className="mt-3 space-y-3">
            {topTables.length === 0 && <p style={{ color: "#9EA3B0", fontSize: 12 }}>No table activity for this range.</p>}
            {topTables.map(([name, count]) => (
              <div key={name}>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: "#5A6070", fontSize: 12 }}>{name}</span>
                  <span style={{ color: "#111827", fontSize: 12, fontWeight: 500 }}>{count}</span>
                </div>
                <div style={{ background: "#F0F2F6", borderRadius: 99, height: 6, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ background: "#1A56DB", height: "100%", width: `${Math.max(8, (count / (topTables[0]?.[1] || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {summary?.latestChange && (
            <p style={{ color: "#9EA3B0", fontSize: 11, marginTop: 16 }}>
              Latest change: {formatAuditDateTime(summary.latestChange)}
            </p>
          )}
        </div>
      </div>

      {auditPage && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: "#FFFFFF", border: "0.5px solid #E4E6EC", borderRadius: 12, padding: "12px 18px" }}>
          <p style={{ color: "#9EA3B0", fontSize: 12 }}>
            Showing {auditPage.content.length} of {auditPage.totalElements} events
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}
              className="disabled:opacity-30"
              style={{ background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 6, color: "#5A6070", fontSize: 12, height: 28, padding: "0 10px" }}>
              Previous
            </button>
            <span style={{ color: "#5A6070", fontSize: 12, padding: "0 8px" }}>Page {page + 1} of {Math.max(1, auditPage.totalPages)}</span>
            <button onClick={() => setPage((current) => current + 1)} disabled={auditPage.last}
              className="disabled:opacity-30"
              style={{ background: "#F5F6F8", border: "0.5px solid #E0E2E8", borderRadius: 6, color: "#5A6070", fontSize: 12, height: 28, padding: "0 10px" }}>
              Next
            </button>
          </div>
        </div>
      )}

      {selectedAuditId !== null && <AuditDetailPanel auditId={selectedAuditId} onClose={() => setSelectedAuditId(null)} />}
    </div>
  );
};

export default AuditLogPage;
