import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

export interface EmployeeOption {
  id: number;
  staffName: string;
  employeeCode?: string;
  currentDepartmentName?: string;
}

interface PaginatedEmployeeSelectProps {
  employees: EmployeeOption[];
  value: number | string;
  onChange: (id: number) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  pageSize?: number;
}

const PAGE_SIZE_DEFAULT = 5;

const PaginatedEmployeeSelect: React.FC<PaginatedEmployeeSelectProps> = ({
  employees,
  value,
  onChange,
  placeholder = 'Select an employee…',
  style,
  pageSize = PAGE_SIZE_DEFAULT,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = employees.find(e => e.id === Number(value));

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      e =>
        e.staffName.toLowerCase().includes(q) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)) ||
        (e.currentDepartmentName && e.currentDepartmentName.toLowerCase().includes(q))
    );
  }, [employees, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize);

  // Reset page when search changes
  useEffect(() => { setPage(0); }, [search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen) setTimeout(() => searchRef.current?.focus(), 0);
  }, [isOpen]);

  const handleSelect = (id: number) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
    setPage(0);
  };

  const AVATAR_COLORS = [
    { bg: '#EEF3FD', text: '#0C447C' },
    { bg: '#EAF3DE', text: '#27500A' },
    { bg: '#FAEEDA', text: '#633806' },
    { bg: '#F1EFE8', text: '#444441' },
    { bg: '#FCEBEB', text: '#791F1F' },
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...(style || {}),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          cursor: 'pointer',
          textAlign: 'left',
          gap: 8,
        }}
      >
        {selectedEmployee ? (
          <span style={{ color: '#111827', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedEmployee.staffName}
            {selectedEmployee.employeeCode ? ` (${selectedEmployee.employeeCode})` : ''}
          </span>
        ) : (
          <span style={{ color: '#9EA3B0', fontSize: 13 }}>{placeholder}</span>
        )}
        <ChevronDown
          size={14}
          style={{
            color: '#9EA3B0',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: '#FFFFFF',
            border: '0.5px solid #E4E6EC',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            overflow: 'hidden',
          }}
        >
          {/* Search bar */}
          <div style={{ padding: '8px 10px', borderBottom: '0.5px solid #F0F2F6' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#F5F6F8',
                border: '0.5px solid #E0E2E8',
                borderRadius: 7,
                padding: '6px 10px',
              }}
            >
              <Search size={13} style={{ color: '#9EA3B0', flexShrink: 0 }} />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: '#111827',
                  fontFamily: 'inherit',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
                >
                  <X size={12} style={{ color: '#9EA3B0' }} />
                </button>
              )}
            </div>
          </div>

          {/* Employee list */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {pageItems.length > 0 ? (
              pageItems.map(emp => {
                const isSelected = Number(value) === emp.id;
                const avatarColor = AVATAR_COLORS[(emp.staffName?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: isSelected ? '#EEF3FD' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '0.5px solid #F5F6F8',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#FAFBFF';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: avatarColor.bg,
                        color: avatarColor.text,
                        fontSize: 11,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {emp.staffName?.charAt(0) ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? 500 : 400,
                          color: isSelected ? '#1A56DB' : '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          margin: 0,
                        }}
                      >
                        {emp.staffName}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#9EA3B0',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {[emp.employeeCode, emp.currentDepartmentName].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {isSelected && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1A56DB', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })
            ) : (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: '#9EA3B0' }}>
                No employees found.
              </div>
            )}
          </div>

          {/* Pagination footer */}
          {filtered.length > pageSize && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderTop: '0.5px solid #E4E6EC',
                background: '#FAFBFF',
              }}
            >
              <span style={{ fontSize: 11, color: '#9EA3B0' }}>
                {safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, filtered.length)} of {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: safePage === 0 ? '#F5F6F8' : '#FFFFFF',
                    border: '0.5px solid #E0E2E8',
                    borderRadius: 6,
                    color: safePage === 0 ? '#D1D5DB' : '#5A6070',
                    cursor: safePage === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  style={{
                    width: 26,
                    height: 26,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: safePage >= totalPages - 1 ? '#F5F6F8' : '#FFFFFF',
                    border: '0.5px solid #E0E2E8',
                    borderRadius: 6,
                    color: safePage >= totalPages - 1 ? '#D1D5DB' : '#5A6070',
                    cursor: safePage >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaginatedEmployeeSelect;
