import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useGetActiveCycleQuery } from '../services/kpiApi';

interface ActiveCycleContextType {
  activeCycleId: number | undefined;
  activeCycleName: string;
  hasCycle: boolean;
  isLoading: boolean;
  isError: boolean;
}

const ActiveCycleContext = createContext<ActiveCycleContextType | undefined>(undefined);

export const ActiveCycleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: cycleResponse, isLoading, isError } = useGetActiveCycleQuery();

  const value = useMemo(() => ({
    activeCycleId: cycleResponse?.data?.cycleId,
    activeCycleName: cycleResponse?.data?.cycleName || 'No Active Cycle Selected',
    hasCycle: !!cycleResponse?.data?.cycleId,
    isLoading,
    isError
  }), [cycleResponse, isLoading, isError]);

  return (
    <ActiveCycleContext.Provider value={value}>
      {children}
    </ActiveCycleContext.Provider>
  );
};

export const useActiveCycle = () => {
  const context = useContext(ActiveCycleContext);
  if (context === undefined) {
    throw new Error('useActiveCycle must be used within an ActiveCycleProvider');
  }
  return context;
};
