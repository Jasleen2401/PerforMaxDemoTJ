import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import KpiSummaryReportModal from './KpiSummaryReportModal';

const KpiSummaryReportButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 transition-colors hover:bg-gray-100"
        style={{
          background: '#F5F6F8',
          color: '#5A6070',
          border: '0.5px solid #E0E2E8',
          borderRadius: 8,
          padding: '7px 12px',
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <FileText size={13} /> KPI Summary 
      </button>
      {open && <KpiSummaryReportModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default KpiSummaryReportButton;
