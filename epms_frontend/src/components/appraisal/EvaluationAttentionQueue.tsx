import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Award, CheckCircle2, AlertCircle, RefreshCw,
  FileText, ChevronRight, X
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import { useAppDispatch } from '../../hooks/reduxHooks';
import { api } from '../../services/api';

export interface QueueIntern {
  id: string;
  name: string;
  email: string;
  code?: string;
  cohort: string;
  batch: string;
  subBatch: string;
  mentor: string;
  score: number | null;
  classification: 'Achieved' | 'Progressing' | 'Focus Required' | null;
  status: 'ACTIVE' | 'DEACTIVATED';
  published: boolean;
}

export interface QueueEvidence {
  id: string;
  internName: string;
  title: string;
  goalTitle: string;
  link: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';
  note?: string;
}

interface EvaluationAttentionQueueProps {
  initialFilter?: 'all' | 'appraisals' | 'drafts' | 'evidence';
  onActionComplete?: () => void;
}

const EvaluationAttentionQueue: React.FC<EvaluationAttentionQueueProps> = ({
  initialFilter = 'all',
  onActionComplete
}) => {
  const { user, accessToken } = useAuth();
  const dispatch = useAppDispatch();

  const hrName =
    (user?.staffName && !["administrator", "admin", "superadmin"].includes(user.staffName.toLowerCase()))
      ? user.staffName
      : (user as any)?.profile?.full_name ||
        (user as any)?.firstName ||
        (user as any)?.first_name ||
        (user as any)?.username ||
        "HR Partner";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [interns, setInterns] = useState<QueueIntern[]>([]);
  const [evidenceList, setEvidenceList] = useState<QueueEvidence[]>([]);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);

  // Filter & Pagination State
  const [queueFilter, setQueueFilter] = useState<'all' | 'appraisals' | 'drafts' | 'evidence'>(initialFilter);
  const [queuePage, setQueuePage] = useState<number>(1);
  const QUEUE_PAGE_SIZE = 8;
  const [selectedForPublish, setSelectedForPublish] = useState<string[]>([]);

  useEffect(() => {
    if (initialFilter) {
      setQueueFilter(initialFilter);
      setQueuePage(1);
    }
  }, [initialFilter]);

  // Grading Modal State
  const [gradingIntern, setGradingIntern] = useState<QueueIntern | null>(null);
  const [techCapabilityWeight] = useState(60);
  const [behavioralCapabilityWeight] = useState(40);
  const [gradeTechProficiency, setGradeTechProficiency] = useState(4.5);
  const [gradeProblemSolving, setGradeProblemSolving] = useState(4.0);
  const [gradeQualityExecution, setGradeQualityExecution] = useState(4.5);
  const [gradeLearningAgility, setGradeLearningAgility] = useState(4.0);
  const [gradeOwnership, setGradeOwnership] = useState(4.0);
  const [gradeProfessionalism, setGradeProfessionalism] = useState(4.5);
  const [gradeCommunication, setGradeCommunication] = useState(4.0);
  const [gradeAdaptability, setGradeAdaptability] = useState(4.0);

  // Authenticated fetch helper
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    headers.set('ngrok-skip-browser-warning', 'true');
    const token = accessToken || localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(url, { ...options, headers });
  }, [accessToken]);

  const loadQueueData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch Employees
      const empRes = await authFetch('/emp/all');
      let mappedList: QueueIntern[] = [];
      if (empRes.ok) {
        const empJson = await empRes.json();
        const empList = empJson.data || (Array.isArray(empJson) ? empJson : []);
        if (Array.isArray(empList)) {
          const rawInterns = empList.filter((e: any) => {
            const roles: string[] = Array.isArray(e.roles) ? e.roles : [];
            const isManager = roles.includes('MANAGER');
            const isHR = roles.includes('HR');
            const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
            return !isManager && !isHR && !isAdmin && (roles.includes('INTERN') || roles.includes('EMPLOYEE'));
          });

          mappedList = rawInterns.map((emp: any) => {
            let bName = emp.currentDepartmentName || 'Batch A';
            let sbName = 'A1';
            const match = (emp.positionName || emp.employeeCode || '').match(/([ABCD][12])/i);
            if (match) sbName = match[1].toUpperCase();

            return {
              id: String(emp.id),
              name: emp.staffName,
              email: emp.email,
              code: emp.employeeCode || '',
              cohort: emp.parentDepartmentName || 'MIRAI Cohort 1',
              batch: bName,
              subBatch: sbName,
              mentor: emp.directManagerName || 'Unassigned',
              score: null,
              classification: null,
              status: (emp.status === 'ACTIVE' || emp.isActive !== false) ? 'ACTIVE' : 'DEACTIVATED',
              published: false,
            };
          });
        }
      }

      // 2. Fetch Appraisals
      try {
        const appRes = await authFetch('/appraisals/');
        if (appRes.ok) {
          const appJson = await appRes.json();
          const appList = appJson.data || (Array.isArray(appJson) ? appJson : []);
          if (Array.isArray(appList)) {
            appList.forEach((app: any) => {
              const idx = mappedList.findIndex(i =>
                String(i.id) === String(app.employeeId) ||
                i.name.toLowerCase() === (app.employeeName || '').toLowerCase()
              );
              if (idx >= 0) {
                const rawScore = app.overallScore !== undefined ? app.overallScore : (app.finalScore !== undefined ? app.finalScore : null);
                if (rawScore !== null && rawScore !== undefined && rawScore !== '') {
                  const s = parseFloat(rawScore);
                  if (!isNaN(s)) {
                    mappedList[idx].score = s;
                    mappedList[idx].published = app.status === 'PUBLISHED';
                    mappedList[idx].classification = (app.classification || (s >= 85 ? 'Achieved' : s >= 70 ? 'Progressing' : 'Focus Required')) as any;
                  }
                }
              }
            });
          }
        }
      } catch {}

      setInterns(mappedList);

      // 3. Fetch Evidence
      try {
        const evRes = await authFetch('/api/evidence/');
        if (evRes.ok) {
          const evJson = await evRes.json();
          const evList = evJson.results || evJson.data || (Array.isArray(evJson) ? evJson : []);
          if (Array.isArray(evList)) {
            const mappedEv: QueueEvidence[] = evList.map((ev: any) => ({
              id: String(ev.id),
              internName: ev.employee_name || 'Intern',
              title: ev.title,
              goalTitle: ev.goal_title || 'Project Deliverable',
              link: ev.external_url || '#',
              type: 'GitHub / Artifact',
              status: ev.review_status === 'APPROVED' ? 'APPROVED' : (ev.review_status === 'REJECTED' ? 'NEEDS_CHANGES' : 'PENDING'),
              note: ev.review_notes || ''
            }));
            setEvidenceList(mappedEv);
          }
        }
      } catch {}

      // 4. Fetch Active Cycle
      try {
        const cyRes = await authFetch('/appraisal-cycles');
        if (cyRes.ok) {
          const cyJson = await cyRes.json();
          const cyList = cyJson.data || (Array.isArray(cyJson) ? cyJson : []);
          const activeCy = cyList.find((c: any) => c.status === 'ACTIVE' || c.isActive) || cyList[0];
          if (activeCy) setActiveCycleId(String(activeCy.id || activeCy.uuid || activeCy.cycleId));
        }
      } catch {}

    } catch (err) {
      toast.error('Failed to load evaluation queue records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  // Derived Queue Items
  const pendingPublishInterns = useMemo(() => {
    return interns.filter(i => !i.published);
  }, [interns]);

  const draftInterns = useMemo(() => {
    return pendingPublishInterns.filter(i => i.score !== null && !i.published);
  }, [pendingPublishInterns]);

  const pendingEvidenceList = useMemo(() => {
    return evidenceList.filter(e => e.status === 'PENDING');
  }, [evidenceList]);

  const totalQueueItems = pendingPublishInterns.length + pendingEvidenceList.length;

  type QueueItem =
    | { type: 'appraisal'; data: QueueIntern }
    | { type: 'evidence'; data: QueueEvidence };

  const filteredQueueItems: QueueItem[] = useMemo(() => {
    const items: QueueItem[] = [];
    if (queueFilter === 'all' || queueFilter === 'appraisals') {
      pendingPublishInterns.forEach(i => items.push({ type: 'appraisal', data: i }));
    }
    if (queueFilter === 'drafts') {
      draftInterns.forEach(i => items.push({ type: 'appraisal', data: i }));
    }
    if (queueFilter === 'all' || queueFilter === 'evidence') {
      pendingEvidenceList.forEach(e => items.push({ type: 'evidence', data: e }));
    }
    return items;
  }, [queueFilter, pendingPublishInterns, draftInterns, pendingEvidenceList]);

  const totalQueuePages = Math.max(1, Math.ceil(filteredQueueItems.length / QUEUE_PAGE_SIZE));
  const paginatedQueueItems = useMemo(() => {
    const startIndex = (queuePage - 1) * QUEUE_PAGE_SIZE;
    return filteredQueueItems.slice(startIndex, startIndex + QUEUE_PAGE_SIZE);
  }, [filteredQueueItems, queuePage]);

  // Actions
  const handleToggleSelect = (id: string) => {
    setSelectedForPublish(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePublishSelected = async () => {
    if (selectedForPublish.length === 0) {
      toast.warning("Please select at least one intern to publish.");
      return;
    }
    const idsToPublish = [...selectedForPublish];
    setInterns(prev => prev.map(i => idsToPublish.includes(i.id) ? { ...i, published: true } : i));
    toast.success(`Published results for ${idsToPublish.length} interns!`);
    setSelectedForPublish([]);

    for (const id of idsToPublish) {
      const intern = interns.find(i => i.id === id);
      try {
        await authFetch(`/appraisals/${id}/publish/`, {
          method: 'POST',
          body: JSON.stringify({ action: 'publish', published: true, score: intern?.score ?? 0, classification: intern?.classification ?? 'Draft' })
        });
      } catch {}
    }
    dispatch(api.util.invalidateTags(['Appraisal']));
    onActionComplete?.();
  };

  const handleTogglePublishOne = async (intern: QueueIntern) => {
    const nextPub = !intern.published;
    setInterns(prev => prev.map(i => i.id === intern.id ? { ...i, published: nextPub } : i));
    toast.success(`${intern.name} result is now ${nextPub ? 'Published' : 'Draft'}`);

    try {
      await authFetch(`/appraisals/${intern.id}/publish/`, {
        method: 'POST',
        body: JSON.stringify({ action: nextPub ? 'publish' : 'unpublish', published: nextPub, score: intern.score ?? 0, classification: intern.classification ?? 'Draft' })
      });
    } catch {}
    dispatch(api.util.invalidateTags(['Appraisal']));
    onActionComplete?.();
  };

  const handleEvidenceAction = async (id: string, status: QueueEvidence['status']) => {
    setEvidenceList(prev => prev.map(ev => ev.id === id ? { ...ev, status } : ev));
    toast.info(`Evidence deliverable: ${status === 'APPROVED' ? 'Approved' : 'Changes Requested'}`);

    try {
      await authFetch(`/api/evidence/${id}/review/`, {
        method: 'POST',
        body: JSON.stringify({
          review_status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          review_notes: status === 'APPROVED' ? 'Approved by HR Partner' : 'Changes requested by HR Partner'
        })
      });
    } catch {}
    dispatch(api.util.invalidateTags(['GoalSet']));
    onActionComplete?.();
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingIntern) return;

    const techAvg = (gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3;
    const techScore = (techAvg / 5) * techCapabilityWeight;
    const behAvg = (gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5;
    const behScore = (behAvg / 5) * behavioralCapabilityWeight;

    const finalScore = parseFloat((techScore + behScore).toFixed(1));
    const classification: QueueIntern['classification'] =
      finalScore >= 85 ? 'Achieved' : finalScore >= 70 ? 'Progressing' : 'Focus Required';

    setInterns(prev => prev.map(i => {
      if (i.id === gradingIntern.id) {
        return { ...i, score: finalScore, classification };
      }
      return i;
    }));

    toast.success(`${gradingIntern.name} graded as "${classification}" (${finalScore}%)!`);

    try {
      await authFetch('/appraisals/', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: gradingIntern.id,
          cycleId: activeCycleId,
          score: finalScore,
          classification,
          comments: `Graded on 8 core competencies: Tech ${techScore.toFixed(1)}/60, Beh ${behScore.toFixed(1)}/40`,
          publish: gradingIntern.published
        })
      });
    } catch {}

    dispatch(api.util.invalidateTags(['Appraisal']));
    setGradingIntern(null);
    onActionComplete?.();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden animate-pulse">
        <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
          <div className="space-y-1.5">
            <div className="h-4 w-48 bg-slate-200 rounded-md" />
            <div className="h-3 w-72 bg-slate-100 rounded-md" />
          </div>
          <div className="h-8 w-60 bg-slate-100 rounded-xl" />
        </div>
        <div className="divide-y divide-slate-100">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-slate-200 rounded shrink-0" />
                <div className="w-9 h-9 rounded-xl bg-purple-100/70 shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-32 bg-slate-200 rounded-md" />
                    <div className="h-4 w-20 bg-purple-100/60 rounded-md" />
                  </div>
                  <div className="h-3 w-48 bg-slate-100 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="h-8 w-24 bg-slate-100 rounded-xl" />
                <div className="h-8 w-24 bg-purple-100/80 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
              Evaluation & Attention Queue
            </h3>
            {totalQueueItems > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                {totalQueueItems} Action{totalQueueItems !== 1 ? 's' : ''} Needed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Appraisal scorecards awaiting publication and project deliverables awaiting verification.
          </p>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => loadQueueData()}
            disabled={isRefreshing}
            className="p-1.5 text-slate-500 hover:text-purple-700 bg-white border border-slate-200/90 rounded-xl hover:bg-purple-50/50 transition-colors cursor-pointer shadow-2xs"
            title="Refresh Queue"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-purple-600" : ""} />
          </button>

          <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200/90 text-xs shadow-2xs">
            <button
              onClick={() => { setQueueFilter('all'); setQueuePage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                queueFilter === 'all'
                  ? 'bg-purple-50 text-purple-700 shadow-2xs border border-purple-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              All ({totalQueueItems})
            </button>
            <button
              onClick={() => { setQueueFilter('appraisals'); setQueuePage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                queueFilter === 'appraisals'
                  ? 'bg-purple-50 text-purple-700 shadow-2xs border border-purple-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              Appraisals ({pendingPublishInterns.length})
            </button>
            <button
              onClick={() => { setQueueFilter('drafts'); setQueuePage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                queueFilter === 'drafts'
                  ? 'bg-amber-50 text-amber-800 shadow-2xs border border-amber-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              Drafts ({draftInterns.length})
            </button>
            <button
              onClick={() => { setQueueFilter('evidence'); setQueuePage(1); }}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-all ${
                queueFilter === 'evidence'
                  ? 'bg-purple-50 text-purple-700 shadow-2xs border border-purple-200/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              Evidence ({pendingEvidenceList.length})
            </button>
          </div>

          {selectedForPublish.length > 0 && (
            <button
              onClick={handlePublishSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl cursor-pointer shadow-xs transition-colors"
            >
              <Award size={14} />
              <span>Publish Selected ({selectedForPublish.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Content */}
      {totalQueueItems === 0 ? (
        <div className="py-12 px-4 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-2xs">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-slate-800">All Attention Items Cleared</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Every intern appraisal has been finalized & published, and there are no pending evidence items requiring HR review.
          </p>
        </div>
      ) : filteredQueueItems.length === 0 ? (
        <div className="py-12 px-4 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200 shadow-2xs">
            <AlertCircle size={20} />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">No {queueFilter === 'drafts' ? 'draft' : queueFilter} items in queue</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are currently no items matching the selected filter.
          </p>
        </div>
      ) : (
        <div>
          <div className="divide-y divide-slate-100">
            {paginatedQueueItems.map(item => {
              if (item.type === 'appraisal') {
                const intern = item.data;
                const initials = (intern.name || 'IN')
                  .split(' ')
                  .filter(Boolean)
                  .map(part => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'IN';

                return (
                  <div
                    key={`queue-app-${intern.id}`}
                    className="p-3.5 md:p-4 hover:bg-purple-50/30 transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedForPublish.includes(intern.id)}
                        onChange={() => handleToggleSelect(intern.id)}
                        className="w-4 h-4 rounded accent-purple-700 cursor-pointer shrink-0 border-slate-300"
                        title="Select for batch publish"
                      />

                      {/* Initials Avatar */}
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0 border border-purple-200/60 shadow-2xs select-none">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm truncate">{intern.name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
                            {intern.batch} • {intern.subBatch}
                          </span>
                          {intern.score !== null ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                              Draft • Awaiting Publish
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              Awaiting Evaluation
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span>Mentor: <strong className="text-slate-700 font-medium">{intern.mentor}</strong></span>
                          <span className="text-slate-300 hidden sm:inline">•</span>
                          <span className="text-slate-400 font-mono text-[11px] truncate">{intern.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 md:justify-end shrink-0 pt-1 md:pt-0">
                      {intern.score !== null ? (
                        <div className="text-right mr-1.5 hidden sm:block shrink-0">
                          <div className="font-bold text-slate-900 tabular-nums">{intern.score}%</div>
                          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border mt-0.5 ${
                            intern.classification === 'Achieved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                            intern.classification === 'Progressing' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                            'bg-rose-50 text-rose-700 border-rose-200/60'
                          }`}>
                            {intern.classification}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic px-2 py-1 bg-slate-50 rounded-lg border border-slate-100 mr-1.5 whitespace-nowrap hidden sm:inline shrink-0">
                          Not Graded Yet
                        </span>
                      )}

                      <button
                        onClick={() => setGradingIntern(intern)}
                        className="px-3 py-1.5 bg-white hover:bg-purple-50/60 text-slate-700 hover:text-purple-700 font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs border border-slate-200/90 shadow-2xs"
                      >
                        Grade & Rubric
                      </button>

                      <button
                        onClick={() => handleTogglePublishOne(intern)}
                        className={`px-3.5 py-1.5 font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs ${
                          intern.published
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                        }`}
                      >
                        {intern.published ? 'Published' : 'Publish Now'}
                      </button>
                    </div>
                  </div>
                );
              }

              const ev = item.data;
              return (
                <div
                  key={`queue-ev-${ev.id}`}
                  className="p-3.5 md:p-4 hover:bg-amber-50/40 transition-colors duration-150 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-amber-50/15"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs mt-0.5">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{ev.title}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200/60 shrink-0">
                          Evidence Review
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Submitted by <strong className="text-slate-700 font-medium">{ev.internName}</strong> for goal: &quot;{ev.goalTitle}&quot;
                      </p>
                      {ev.link && ev.link !== '#' && (
                        <a
                          href={ev.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-700 hover:text-purple-800 hover:underline text-[11px] font-semibold inline-flex items-center gap-1 mt-1"
                        >
                          <span>Inspect Deliverable</span>
                          <ChevronRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:justify-end shrink-0 pt-1 md:pt-0">
                    <button
                      onClick={() => handleEvidenceAction(ev.id, 'APPROVED')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleEvidenceAction(ev.id, 'NEEDS_CHANGES')}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 text-xs"
                    >
                      Request Changes
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredQueueItems.length > QUEUE_PAGE_SIZE && (
            <div className="p-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-500 bg-slate-50/50">
              <span>
                Showing {Math.min((queuePage - 1) * QUEUE_PAGE_SIZE + 1, filteredQueueItems.length)}–{Math.min(queuePage * QUEUE_PAGE_SIZE, filteredQueueItems.length)} of {filteredQueueItems.length} items requiring attention
              </span>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                  disabled={queuePage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50/50 hover:text-purple-700 font-medium cursor-pointer transition-colors shadow-2xs"
                >
                  Previous
                </button>
                <span className="px-2.5 py-1 font-semibold text-slate-700 text-[11px] bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                  Page {queuePage} of {totalQueuePages}
                </span>
                <button
                  onClick={() => setQueuePage(p => Math.min(totalQueuePages, p + 1))}
                  disabled={queuePage >= totalQueuePages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-purple-50/50 hover:text-purple-700 font-medium cursor-pointer transition-colors shadow-2xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grading Rubric Modal */}
      {gradingIntern && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 border border-purple-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">8 Core Competencies Evaluation Rubric</h3>
                <p className="text-xs text-slate-500">Grading for <strong className="text-slate-700">{gradingIntern.name}</strong> ({gradingIntern.batch} • {gradingIntern.subBatch})</p>
              </div>
              <button onClick={() => setGradingIntern(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade} className="space-y-4 text-xs">
              {/* Technical Capability */}
              <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3">
                <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                  <span className="font-bold text-purple-900 uppercase text-[11px] tracking-wide">
                    Technical Capability ({techCapabilityWeight}% Weight)
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">
                    Subtotal: {(((gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3 / 5) * techCapabilityWeight).toFixed(1)} / {techCapabilityWeight} pts
                  </span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">1. Technical Proficiency:</span>
                    <span className="font-bold text-purple-700">{gradeTechProficiency} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeTechProficiency}
                    onChange={(e) => setGradeTechProficiency(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">2. Problem Solving:</span>
                    <span className="font-bold text-purple-700">{gradeProblemSolving} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeProblemSolving}
                    onChange={(e) => setGradeProblemSolving(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">3. Quality & Execution:</span>
                    <span className="font-bold text-purple-700">{gradeQualityExecution} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeQualityExecution}
                    onChange={(e) => setGradeQualityExecution(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Behavioral Capability */}
              <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 space-y-3">
                <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                  <span className="font-bold text-purple-900 uppercase text-[11px] tracking-wide">
                    Behavioral Capability ({behavioralCapabilityWeight}% Weight)
                  </span>
                  <span className="text-[11px] font-bold text-purple-700">
                    Subtotal: {(((gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5 / 5) * behavioralCapabilityWeight).toFixed(1)} / {behavioralCapabilityWeight} pts
                  </span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">4. Learning Agility:</span>
                    <span className="font-bold text-purple-700">{gradeLearningAgility} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeLearningAgility}
                    onChange={(e) => setGradeLearningAgility(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">5. Ownership & Accountability:</span>
                    <span className="font-bold text-purple-700">{gradeOwnership} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeOwnership}
                    onChange={(e) => setGradeOwnership(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">6. Professionalism:</span>
                    <span className="font-bold text-purple-700">{gradeProfessionalism} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeProfessionalism}
                    onChange={(e) => setGradeProfessionalism(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">7. Communication:</span>
                    <span className="font-bold text-purple-700">{gradeCommunication} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeCommunication}
                    onChange={(e) => setGradeCommunication(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-0.5">
                    <span className="text-slate-800">8. Adaptability:</span>
                    <span className="font-bold text-purple-700">{gradeAdaptability} / 5</span>
                  </div>
                  <input
                    type="range" min="1" max="5" step="0.5"
                    value={gradeAdaptability}
                    onChange={(e) => setGradeAdaptability(Number(e.target.value))}
                    className="w-full accent-purple-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Score Calculation Preview */}
              {(() => {
                const techAvg = (gradeTechProficiency + gradeProblemSolving + gradeQualityExecution) / 3;
                const techScore = (techAvg / 5) * techCapabilityWeight;
                const behAvg = (gradeLearningAgility + gradeOwnership + gradeProfessionalism + gradeCommunication + gradeAdaptability) / 5;
                const behScore = (behAvg / 5) * behavioralCapabilityWeight;
                const score = parseFloat((techScore + behScore).toFixed(1));
                const cat = score >= 85 ? 'Achieved' : score >= 70 ? 'Progressing' : 'Focus Required';
                return (
                  <div className={`p-3.5 rounded-xl border flex flex-col gap-1.5 font-semibold ${
                    cat === 'Achieved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    cat === 'Progressing' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                    'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span>Tech: <strong>{techScore.toFixed(1)}</strong></span>
                      <span>Behavioral: <strong>{behScore.toFixed(1)}</strong></span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-1.5">
                      <span className="text-sm font-bold">Overall Score: {score}%</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-white font-bold shadow-xs">
                        {cat}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setGradingIntern(null)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvaluationAttentionQueue;
