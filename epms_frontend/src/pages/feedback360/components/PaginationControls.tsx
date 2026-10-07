import { ChevronLeft, ChevronRight } from 'lucide-react';
import { inputStyle, smBtn } from '../constants/styles';

interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const PaginationControls = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
      <p style={{ fontSize: 12, color: '#9EA3B0', margin: 0 }}>
        Showing {start}-{end} of {totalItems}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{ ...inputStyle, width: 90, padding: '5px 8px', fontSize: 12 }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          style={{ ...smBtn('neutral'), opacity: currentPage <= 1 ? 0.5 : 1 }}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={12} />
          Prev
        </button>
        <span style={{ fontSize: 12, color: '#5A6070', minWidth: 64, textAlign: 'center' }}>
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          style={{ ...smBtn('neutral'), opacity: currentPage >= totalPages ? 0.5 : 1 }}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
