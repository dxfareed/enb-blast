'use client';

import { createContext, useContext, ReactNode } from 'react';

type TourContextType = {
  activeTourStep: number;
  tourSteps: Array<{ id: string; [key: string]: any }>;
};

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children, value }: { children: ReactNode; value: TourContextType }) {
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}