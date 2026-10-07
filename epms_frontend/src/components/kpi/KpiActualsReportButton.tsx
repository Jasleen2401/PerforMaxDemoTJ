import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import KpiActualsReportModal from './KpiActualsReportModal';

const KpiActualsReportButton: React.FC = () => {
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
        <AlertCircle size={13} /> Actuals Completion
      </button>
      {open && <KpiActualsReportModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default KpiActualsReportButton;
