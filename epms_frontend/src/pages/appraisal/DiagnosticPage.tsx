import { useGetDiagnosticHealthQuery, useGetAppraisalsQuery } from '../../features/appraisal/appraisalApi';
import { RefreshCw, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

const DiagnosticPage: React.FC = () => {
  const { data, error, isLoading, refetch } = useGetDiagnosticHealthQuery();
  const { data: appraisals, error: appError } = useGetAppraisalsQuery();

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>Appraisal Diagnostics</h1>
          <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 1 }}>Inspect backend connectivity and data integrity.</p>
        </div>
        <button onClick={() => refetch()}
          className="inline-flex items-center gap-2 transition-colors self-start sm:self-auto"
          style={{ background: '#1A56DB', color: '#FFFFFF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, border: 'none' }}>
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: '32px 18px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Running diagnostics…</div>
      )}

      {/* Diagnostic endpoint error */}
      {error && (
        <div style={{ background: '#FCEBEB', border: '0.5px solid #E0AAAA', borderRadius: 12, padding: '14px 18px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
            <AlertCircle size={14} style={{ color: '#791F1F' }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#791F1F' }}>Diagnostic Endpoint Error</p>
          </div>
          <p style={{ fontSize: 12, color: '#791F1F', marginBottom: 8 }}>
            The backend likely hasn't been restarted/recompiled to see the new diagnostic endpoint.
          </p>
          <pre style={{ fontSize: 11, color: '#791F1F', background: '#F8E0E0', borderRadius: 6, padding: '8px 10px', overflow: 'auto' }}>
            {JSON.stringify(error, null, 2)}
          </pre>
        </div>
      )}

      {/* Appraisal list test */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
          <Activity size={14} style={{ color: '#9EA3B0' }} />
          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Appraisal List Test (Existing Endpoint)</p>
        </div>
        {appError ? (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #E0AAAA', borderRadius: 8, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#791F1F', marginBottom: 4 }}>Error calling /appraisals/my-assessments</p>
            <pre style={{ fontSize: 11, color: '#791F1F', overflow: 'auto' }}>{JSON.stringify(appError, null, 2)}</pre>
          </div>
        ) : (
          <div style={{ background: '#EAF3DE', border: '0.5px solid #B8DCA0', borderRadius: 8, padding: '12px 14px' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: '#27500A' }} />
              <p style={{ fontSize: 12, fontWeight: 500, color: '#27500A' }}>
                /appraisals/my-assessments — {appraisals?.length || 0} appraisals found
              </p>
            </div>
          </div>
        )}
      </div>

      {data && (
        <>
          {/* User context */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Current User Context</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div style={{ background: '#F5F6F8', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Email from Token</p>
                <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#111827' }}>{data.currentUserEmail}</p>
              </div>
              <div style={{ background: '#F5F6F8', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Employee Record</p>
                <div className="flex items-center gap-2">
                  {data.employeeRecordFound
                    ? <CheckCircle2 size={13} style={{ color: '#27500A' }} />
                    : <AlertCircle size={13} style={{ color: '#791F1F' }} />}
                  <p style={{ fontSize: 13, fontWeight: 500, color: data.employeeRecordFound ? '#27500A' : '#791F1F' }}>
                    {data.employeeRecordFound ? 'FOUND' : 'NOT FOUND'}
                  </p>
                </div>
              </div>
            </div>
            {!data.employeeRecordFound && (
              <div style={{ background: '#FAEEDA', border: '0.5px solid #E8C98C', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
                <p style={{ fontSize: 12, color: '#633806' }}>
                  <strong>Warning:</strong> Login email does not match any Employee record. This causes "Operation failed" errors in the Appraisal module.
                </p>
              </div>
            )}
          </div>

          {/* Appraisal data */}
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Appraisal Data</p>
            <div style={{ background: '#F5F6F8', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9EA3B0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Appraisal Count</p>
              <p style={{ fontSize: 22, fontWeight: 500, color: '#111827' }}>{data.appraisalCount}</p>
            </div>

            {data.firstAppraisalDetails ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#5A6070', marginBottom: 8 }}>First Appraisal Check</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: 10 }}>
                  {[
                    { label: 'ID', value: data.firstAppraisalDetails.id },
                    { label: 'Status', value: data.firstAppraisalDetails.status },
                    { label: 'Cycle', value: data.firstAppraisalDetails.cycleName },
                    { label: 'Forms in Cycle', value: data.firstAppraisalDetails.formCount },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: '8px 10px' }}>
                      <p style={{ fontSize: 10, color: '#9EA3B0', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', fontFamily: 'monospace' }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div style={{
                  background: data.firstAppraisalDetails.hasSelfAssessmentForm ? '#EAF3DE' : '#FCEBEB',
                  border: `0.5px solid ${data.firstAppraisalDetails.hasSelfAssessmentForm ? '#B8DCA0' : '#E0AAAA'}`,
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: data.firstAppraisalDetails.hasSelfAssessmentForm ? '#27500A' : '#791F1F' }}>
                    {data.firstAppraisalDetails.hasSelfAssessmentForm
                      ? '✓ SELF_ASSESSMENT form is correctly configured.'
                      : '✗ MISSING SELF_ASSESSMENT form — will cause "Appraisal not found" errors.'}
                  </p>
                </div>
              </>
            ) : (
              <div style={{ background: '#FAEEDA', border: '0.5px solid #E8C98C', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 12, color: '#633806' }}>No appraisals found for this employee.</p>
              </div>
            )}
          </div>

          {/* Raw JSON */}
          <div style={{ background: '#111827', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: '#FFFFFF', marginBottom: 10 }}>Raw JSON Response</p>
            <pre style={{ fontSize: 11, color: '#9EA3B0', background: '#1F2937', borderRadius: 8, padding: '12px', overflow: 'auto', maxHeight: 360 }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
};

export default DiagnosticPage;
