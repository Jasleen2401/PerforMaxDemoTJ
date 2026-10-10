import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetAllLibrariesWithInactiveQuery,
  useGetKpiCategoriesQuery,
  useCreateKpiCategoryMutation,
  useUpdateKpiCategoryMutation,
  useDeleteKpiCategoryMutation,
} from '../../services/kpiApi';
import { useGetPositionsQuery } from '../../features/org/positionApi';
import {
  Search, Plus, ChevronDown, LayoutGrid, List,
  Terminal, Handshake, Brain, FileUp, History,
  Pencil, ChevronLeft, ChevronRight, Layers, Tag, Trash2, X
} from 'lucide-react';
import KpiImportModal from '../../components/kpi/KpiImportModal';
import KpiLibraryHistoryModal from '../../components/kpi/KpiLibraryHistoryModal';
import React from 'react';
import { Can } from '../../components/Can';

const PAGE_SIZE = 6;

const KpiLibraryDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'categories' ? 'categories' : 'library';
  const handleTabChange = (tab: 'library' | 'categories') => {
    setSearchParams(tab === 'categories' ? { tab: 'categories' } : {});
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [historyModalState, setHistoryModalState] = useState<{ isOpen: boolean; positionId: number; positionName: string }>({
    isOpen: false, positionId: 0, positionName: ''
  });

  // KPI Categories state
  const { data: categoriesResponse, isLoading: categoriesLoading } = useGetKpiCategoriesQuery();
  const categories = categoriesResponse?.data || [];
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateKpiCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateKpiCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] = useDeleteKpiCategoryMutation();

  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: { id: number | string; name?: string; categoryName?: string }) => {
    setEditingCategory({ id: Number(cat.id), name: cat.name || cat.categoryName || '' });
    setCategoryNameInput(cat.name || cat.categoryName || '');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = categoryNameInput.trim();
    if (!trimmed) {
      toast.warning('Please enter a category name');
      return;
    }
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, name: trimmed }).unwrap();
        toast.success(`Category "${trimmed}" updated successfully`);
      } else {
        await createCategory({ name: trimmed }).unwrap();
        toast.success(`Category "${trimmed}" created successfully`);
      }
      setIsCategoryModalOpen(false);
      setCategoryNameInput('');
      setEditingCategory(null);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: number | string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await deleteCategory(Number(id)).unwrap();
      toast.success(`Category "${name}" deleted`);
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete category');
    }
  };

  const { data: librariesResponse, isLoading } = useGetAllLibrariesWithInactiveQuery();
  const { data: positions = [] } = useGetPositionsQuery();
  const libraries = librariesResponse?.data || [];

  const filteredLibraries = libraries
    .filter(lib => {
      const matchesSearch = lib.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lib.positionName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPosition = positionFilter === 'all' || lib.positionId === positionFilter;
      const matchesStatus = statusFilter === 'all'
        ? true : statusFilter === 'active' ? lib.isActive : !lib.isActive;
      return matchesSearch && matchesPosition && matchesStatus;
    })
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));

  const totalPages = Math.max(1, Math.ceil(filteredLibraries.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = filteredLibraries.slice(pageStart, pageStart + PAGE_SIZE);
  const isLastPage = safePage === totalPages;

  const handlePageChange = (p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  // Reset to page 1 when filters change
  const handleSearch = (v: string) => { setSearchTerm(v); setCurrentPage(1); };
  const handlePosition = (v: string) => { setPositionFilter(v === 'all' ? 'all' : parseInt(v)); setCurrentPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v as any); setCurrentPage(1); };

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('engineer') || t.includes('technical') || t.includes('software'))
      return <Terminal size={15} style={{ color: '#1A56DB' }} />;
    if (t.includes('executive') || t.includes('sales') || t.includes('account'))
      return <Handshake size={15} style={{ color: '#1A56DB' }} />;
    return <Brain size={15} style={{ color: '#1A56DB' }} />;
  };

  // Build page number list: always show 1, last, current ±1, with ellipsis gaps
  const pageNumbers = (): (number | '...')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (safePage > 3) pages.push('...');
    for (let p = Math.max(2, safePage - 1); p <= Math.min(totalPages - 1, safePage + 1); p++) pages.push(p);
    if (safePage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const inputStyle: React.CSSProperties = {
    background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8,
    padding: '7px 12px', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'inherit',
  };

  if (isLoading) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>Loading library…</div>
  );

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
        style={{ paddingBottom: 14, borderBottom: '0.5px solid #E4E6EC' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>
            {activeTab === 'library' ? 'KPI Library Management' : 'KPI Categories'}
          </h1>
          <p style={{ fontSize: 13, color: '#9EA3B0', marginTop: 3 }}>
            {activeTab === 'library'
              ? 'Manage and standardize performance metrics across your organization.'
              : 'Organize and classify performance metrics into functional categories.'}
          </p>
        </div>
        <Can permission="KPI_LIBRARY_MANAGE">
          <div className="flex gap-2 self-start sm:self-auto">
            {activeTab === 'library' ? (
              <>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  style={{ background: '#374151', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                  className="hover:opacity-90 transition-opacity">
                  <FileUp size={14} /> Import Excel
                </button>
                <button
                  onClick={() => navigate('/kpi/library/new')}
                  style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                  className="hover:opacity-90 transition-opacity">
                  <Plus size={14} strokeWidth={3} /> New Library
                </button>
              </>
            ) : (
              <button
                onClick={handleOpenAddCategory}
                style={{ background: '#1A56DB', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}
                className="hover:opacity-90 transition-opacity">
                <Plus size={14} strokeWidth={3} /> Add Category
              </button>
            )}
          </div>
        </Can>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => handleTabChange('library')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers size={14} />
          <span>KRA Library</span>
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('categories')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Tag size={14} />
          <span>KPI Categories</span>
        </button>
      </div>

      {activeTab === 'library' ? (
        <>

      {/* Filters */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Position filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Position:</span>
            <div className="relative">
              <select
                style={{ ...inputStyle, paddingRight: 28, appearance: 'none' as any, fontSize: 12 }}
                value={positionFilter}
                onChange={e => handlePosition(e.target.value)}>
                <option value="all">All Positions</option>
                {positions.map(p => <option key={p.positionId} value={p.positionId}>{p.positionName}</option>)}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
            </div>
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Status:</span>
            <div className="relative">
              <select
                style={{ ...inputStyle, paddingRight: 28, appearance: 'none' as any, fontSize: 12 }}
                value={statusFilter}
                onChange={e => handleStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
            <input type="text" placeholder="Search templates…"
              style={{ ...inputStyle, paddingLeft: 28, fontSize: 12, width: 200 }}
              value={searchTerm} onChange={e => handleSearch(e.target.value)} />
          </div>

          {/* View toggle */}
          <div style={{ display: 'flex', background: '#F5F6F8', border: '0.5px solid #E0E2E8', borderRadius: 8, padding: 3 }}>
            <button onClick={() => setViewMode('grid')}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'grid' ? '#EEF3FD' : 'transparent', color: viewMode === 'grid' ? '#1A56DB' : '#9EA3B0' }}>
              <LayoutGrid size={13} />
            </button>
            <button onClick={() => setViewMode('list')}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'list' ? '#EEF3FD' : 'transparent', color: viewMode === 'list' ? '#1A56DB' : '#9EA3B0' }}>
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid view */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pageItems.map(library => (
            <div key={library.id}
              style={{ background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12, padding: '18px', display: 'flex', flexDirection: 'column' }}
              className="hover:border-[#1A56DB] transition-colors">

              {/* Position badge + status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 500, background: '#F5F6F8', color: '#5A6070', border: '0.5px solid #E0E2E8', borderRadius: 6, padding: '3px 10px' }}>
                  {library.positionName || 'General'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: library.isActive ? '#16A34A' : '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: library.isActive ? '#22C55E' : '#9CA3AF', display: 'inline-block', flexShrink: 0 }} />
                  {library.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>

              {/* Title */}
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 10, flex: 1, lineHeight: 1.4 }}>
                {library.title}
              </p>

              {/* KPI count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <LayoutGrid size={13} style={{ color: '#9EA3B0', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#9EA3B0' }}>
                  {(library as any).details?.length ?? (library as any).detailCount ?? 0} KPIs defined
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#E4E6EC', marginBottom: 12 }} />

              {/* Actions */}
              <Can permission="KPI_LIBRARY_MANAGE">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => navigate(`/kpi/library/edit/${library.id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex', alignItems: 'center' }}
                    className="hover:text-[#1A56DB] transition-colors"
                    title="Edit">
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setHistoryModalState({ isOpen: true, positionId: Number(library.positionId) || 0, positionName: library.positionName || library.title })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6B7280', display: 'flex', alignItems: 'center' }}
                    className="hover:text-[#1A56DB] transition-colors"
                    title="History">
                    <History size={15} />
                  </button>
                </div>
              </Can>
            </div>
          ))}

          {/* Create New Template card — only on last page */}
          <Can permission="KPI_LIBRARY_MANAGE">
            {isLastPage && (
              <button
                onClick={() => navigate('/kpi/library/new')}
                style={{ border: '1.5px dashed #D1D5DB', borderRadius: 12, padding: '24px 18px', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 180 }}
                className="hover:border-[#1A56DB] hover:bg-blue-50/20 transition-colors">
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#F5F6F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} style={{ color: '#9EA3B0' }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#9EA3B0' }}>Create New Template</span>
              </button>
            )}
          </Can>

          {filteredLibraries.length === 0 && (
            <div className="col-span-full" style={{ padding: '48px 24px', textAlign: 'center', background: '#F5F6F8', border: '0.5px dashed #E0E2E8', borderRadius: 12 }}>
              <Search size={24} style={{ color: '#E0E2E8', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: '#9EA3B0' }}>No results found</p>
            </div>
          )}
        </div>
      ) : (
        /* List view */
        <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, overflow: 'hidden' }}>
          {pageItems.map((library, idx) => (
            <div key={library.id}
              style={{ padding: '12px 18px', borderBottom: idx < pageItems.length - 1 ? '0.5px solid #F0F2F6' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              className="hover:bg-[#FAFBFF] transition-colors">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EEF3FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getIcon(library.title)}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{library.title}</p>
                  <p style={{ fontSize: 11, color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1 }}>
                    {library.positionName || 'General'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: library.isActive ? '#16A34A' : '#6B7280', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: library.isActive ? '#22C55E' : '#9CA3AF', display: 'inline-block' }} />
                  {library.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
                <Can permission="KPI_LIBRARY_MANAGE">
                  <button onClick={() => navigate(`/kpi/library/edit/${library.id}`)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#9EA3B0', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                    className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors"
                    title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setHistoryModalState({ isOpen: true, positionId: Number(library.positionId) || 0, positionName: library.positionName || library.title })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#9EA3B0', display: 'flex', alignItems: 'center', borderRadius: 6 }}
                    className="hover:bg-[#EEF3FD] hover:text-[#1A56DB] transition-colors"
                    title="History">
                    <History size={14} />
                  </button>
                </Can>
              </div>
            </div>
          ))}
          {filteredLibraries.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Search size={24} style={{ color: '#E0E2E8', margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: '#9EA3B0' }}>No results found</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {filteredLibraries.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
          <p style={{ fontSize: 12, color: '#9EA3B0' }}>
            Showing {pageStart + 1} to {Math.min(pageStart + PAGE_SIZE, filteredLibraries.length)} of {filteredLibraries.length} templates
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Prev */}
            <button
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage === 1}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '0.5px solid #E0E2E8', background: '#FFFFFF', cursor: safePage === 1 ? 'not-allowed' : 'pointer', color: safePage === 1 ? '#D1D5DB' : '#374151' }}
              className="hover:enabled:bg-[#F5F6F8] transition-colors">
              <ChevronLeft size={14} />
            </button>

            {/* Page numbers */}
            {pageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9EA3B0' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  style={{
                    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    background: p === safePage ? '#1A56DB' : '#FFFFFF',
                    color: p === safePage ? '#FFFFFF' : '#374151',
                    boxShadow: p === safePage ? 'none' : '0 0 0 0.5px #E0E2E8',
                  }}
                  className="transition-colors">
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage === totalPages}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '0.5px solid #E0E2E8', background: '#FFFFFF', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', color: safePage === totalPages ? '#D1D5DB' : '#374151' }}
              className="hover:enabled:bg-[#F5F6F8] transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        /* KPI Categories Tab */
        <div className="space-y-4">
          <div style={{ background: '#FFFFFF', border: '0.5px solid #E4E6EC', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9EA3B0' }} />
              <input
                type="text"
                placeholder="Search categories…"
                style={{ ...inputStyle, paddingLeft: 28, fontSize: 12, width: 240 }}
                value={categorySearch}
                onChange={e => setCategorySearch(e.target.value)}
              />
            </div>
            <div className="text-xs font-semibold text-slate-500">
              {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} configured
            </div>
          </div>

          {categoriesLoading ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', fontSize: 13, color: '#9EA3B0' }}>
              Loading categories…
            </div>
          ) : filteredCategories.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '0.5px dashed #E0E2E8', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <Tag size={28} style={{ color: '#9EA3B0', margin: '0 auto 10px' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>No categories found</h3>
              <p style={{ fontSize: 12, color: '#9EA3B0', marginTop: 4 }}>
                {categorySearch ? 'Try a different search term.' : 'Click "Add Category" above to create your first KPI category.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => {
                const catName = cat.name || cat.categoryName || `Category #${cat.id}`;
                const linkedKpis = libraries.reduce((acc, lib) => {
                  const details = (lib as any).details || [];
                  return acc + details.filter((d: any) => Number(d.categoryId) === Number(cat.id)).length;
                }, 0);

                return (
                  <div
                    key={cat.id}
                    style={{ background: '#FFFFFF', border: '1px solid #E4E6EC', borderRadius: 12, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
                    className="hover:border-purple-300 transition-all shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-100">
                          <Tag size={11} />
                          ID: #{cat.id}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {linkedKpis} {linkedKpis === 1 ? 'KPI linked' : 'KPIs linked'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug mb-1">
                        {catName}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Functional metric classification
                      </p>
                    </div>

                    <Can permission="KPI_LIBRARY_MANAGE">
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, catName)}
                          disabled={isDeletingCategory}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Can>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  <Tag size={16} />
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingCategory ? 'Edit KPI Category' : 'Create New KPI Category'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Excellence, Product Delivery, Leadership"
                  value={categoryNameInput}
                  onChange={e => setCategoryNameInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCategory || isUpdatingCategory}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  {isCreatingCategory || isUpdatingCategory ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <KpiImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <KpiLibraryHistoryModal
        isOpen={historyModalState.isOpen}
        onClose={() => setHistoryModalState(prev => ({ ...prev, isOpen: false }))}
        positionId={historyModalState.positionId}
        positionName={historyModalState.positionName}
      />
    </div>
  );
};

export default KpiLibraryDashboard;
