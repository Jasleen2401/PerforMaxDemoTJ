// epms_frontend/src/pages/appraisal/AppraisalWorkspaceContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  appraisalWorkspaceService,
} from '../../features/appraisal/appraisalWorkspaceService';
import type {
  PerformanceCycle,
  CycleParticipant,
  CycleReadiness,
} from '../../features/appraisal/appraisalWorkspaceService';

export type WorkspaceTab = 'overview' | 'setup' | 'participants' | 'competencies' | 'evaluators';

interface AppraisalWorkspaceContextType {
  cycles: PerformanceCycle[];
  activeCycleId: string | null;
  activeCycle: PerformanceCycle | null;
  activeTab: WorkspaceTab;
  loading: boolean;
  error: string | null;
  readiness: CycleReadiness | null;
  participants: CycleParticipant[];
  setActiveTab: (tab: WorkspaceTab) => void;
  setActiveCycleId: (id: string | null) => void;
  refreshCycles: () => Promise<void>;
  refreshActiveCycle: () => Promise<void>;
  refreshParticipants: () => Promise<void>;
  refreshReadiness: () => Promise<void>;
}

const AppraisalWorkspaceContext = createContext<AppraisalWorkspaceContextType | undefined>(undefined);

export const AppraisalWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<CycleReadiness | null>(null);
  const [participants, setParticipants] = useState<CycleParticipant[]>([]);

  // Sync tab from URL search params
  const activeTab = useMemo<WorkspaceTab>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'setup' || tabParam === 'participants' || tabParam === 'competencies' || tabParam === 'evaluators') {
      return tabParam;
    }
    return 'overview';
  }, [searchParams]);

  // Sync activeCycleId from URL search params
  const activeCycleId = searchParams.get('cycleId');

  const activeCycle = useMemo(() => {
    if (!activeCycleId) return cycles[0] || null;
    return cycles.find((c) => c.id === activeCycleId) || cycles[0] || null;
  }, [cycles, activeCycleId]);

  const setActiveTab = useCallback((tab: WorkspaceTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }, [setSearchParams]);

  const setActiveCycleId = useCallback((id: string | null) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) {
        next.set('cycleId', id);
      } else {
        next.delete('cycleId');
      }
      return next;
    });
  }, [setSearchParams]);

  const refreshCycles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await appraisalWorkspaceService.getCycles();
      setCycles(data);
      if (data.length > 0 && !searchParams.get('cycleId')) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('cycleId', data[0].id);
          return next;
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load performance cycles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [searchParams, setSearchParams]);

  const refreshReadiness = useCallback(async () => {
    if (!activeCycle?.id) return;
    try {
      const data = await appraisalWorkspaceService.getCycleReadiness(activeCycle.id);
      setReadiness(data);
    } catch (err) {
      console.warn('Could not fetch readiness check:', err);
    }
  }, [activeCycle]);

  const refreshParticipants = useCallback(async () => {
    if (!activeCycle?.id) {
      setParticipants([]);
      return;
    }
    try {
      const data = await appraisalWorkspaceService.getCycleParticipants(activeCycle.id);
      setParticipants(data);
    } catch (err) {
      console.warn('Could not fetch participants:', err);
      setParticipants([]);
    }
  }, [activeCycle]);

  const refreshActiveCycle = useCallback(async () => {
    if (!activeCycle?.id) return;
    try {
      const updated = await appraisalWorkspaceService.getCycle(activeCycle.id);
      setCycles((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      await Promise.all([refreshReadiness(), refreshParticipants()]);
    } catch (err: unknown) {
      console.warn('Failed to refresh active cycle:', err);
    }
  }, [activeCycle, refreshReadiness, refreshParticipants]);

  useEffect(() => {
    refreshCycles();
  }, [refreshCycles]);

  useEffect(() => {
    if (activeCycle?.id) {
      refreshReadiness();
      refreshParticipants();
    }
  }, [activeCycle?.id, refreshReadiness, refreshParticipants]);

  const value = {
    cycles,
    activeCycleId: activeCycle?.id || null,
    activeCycle,
    activeTab,
    loading,
    error,
    readiness,
    participants,
    setActiveTab,
    setActiveCycleId,
    refreshCycles,
    refreshActiveCycle,
    refreshParticipants,
    refreshReadiness,
  };

  return (
    <AppraisalWorkspaceContext.Provider value={value}>
      {children}
    </AppraisalWorkspaceContext.Provider>
  );
};

export const useAppraisalWorkspace = () => {
  const context = useContext(AppraisalWorkspaceContext);
  if (!context) {
    throw new Error('useAppraisalWorkspace must be used within an AppraisalWorkspaceProvider');
  }
  return context;
};
