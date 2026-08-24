import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { formatLocalDate } from '../utils/date';

interface SelectedDateContextValue {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
}

const SelectedDateContext = createContext<SelectedDateContextValue | null>(
  null,
);

export function SelectedDateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate());

  const value = useMemo(
    () => ({ selectedDate, setSelectedDate }),
    [selectedDate],
  );

  return (
    <SelectedDateContext.Provider value={value}>
      {children}
    </SelectedDateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSelectedDate(): SelectedDateContextValue {
  const context = useContext(SelectedDateContext);
  if (!context) {
    throw new Error(
      'useSelectedDate must be used within a SelectedDateProvider',
    );
  }
  return context;
}
