import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { AttendanceType } from '../types/api';

interface AttendanceViewContextValue {
  attendanceView: AttendanceType;
  isManual: boolean;
  setAttendanceView: (view: AttendanceType) => void;
  syncAttendanceView: (view: AttendanceType) => void;
  markManual: () => void;
  resetToAuto: () => void;
}

const AttendanceViewContext = createContext<AttendanceViewContextValue | null>(
  null,
);

export function AttendanceViewProvider({ children }: { children: ReactNode }) {
  const [attendanceView, setAttendanceViewState] = useState<AttendanceType>(
    () => (new Date().getHours() < 12 ? 'MORNING' : 'NIGHT'),
  );
  const [isManual, setIsManual] = useState(false);

  const setAttendanceView = useCallback((view: AttendanceType) => {
    setAttendanceViewState(view);
    setIsManual(true);
  }, []);

  const syncAttendanceView = useCallback((view: AttendanceType) => {
    setAttendanceViewState(view);
    setIsManual(false);
  }, []);

  const markManual = useCallback(() => {
    setIsManual(true);
  }, []);

  const resetToAuto = useCallback(() => {
    setIsManual(false);
  }, []);

  const value = useMemo(
    () => ({
      attendanceView,
      isManual,
      setAttendanceView,
      syncAttendanceView,
      markManual,
      resetToAuto,
    }),
    [
      attendanceView,
      isManual,
      markManual,
      resetToAuto,
      setAttendanceView,
      syncAttendanceView,
    ],
  );

  return (
    <AttendanceViewContext.Provider value={value}>
      {children}
    </AttendanceViewContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAttendanceView(): AttendanceViewContextValue {
  const context = useContext(AttendanceViewContext);
  if (!context) {
    throw new Error(
      'useAttendanceView must be used within an AttendanceViewProvider',
    );
  }
  return context;
}
