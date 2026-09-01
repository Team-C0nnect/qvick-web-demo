import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type GenderView = '남' | '여';

const GENDER_VIEW_STORAGE_KEY = 'qvick-gender-view';

const getStoredGenderView = (): GenderView => {
  try {
    const storedGenderView = window.localStorage.getItem(GENDER_VIEW_STORAGE_KEY);
    return storedGenderView === '여' ? '여' : '남';
  } catch {
    return '남';
  }
};

interface GenderViewContextValue {
  genderView: GenderView;
  setGenderView: (gender: GenderView) => void;
}

const GenderViewContext = createContext<GenderViewContextValue | null>(null);

export function GenderViewProvider({ children }: { children: ReactNode }) {
  const [genderView, setGenderViewState] = useState<GenderView>(getStoredGenderView);

  const setGenderView = useCallback((nextGenderView: GenderView) => {
    try {
      window.localStorage.setItem(GENDER_VIEW_STORAGE_KEY, nextGenderView);
    } catch {
      // 저장소 접근이 제한된 환경에서는 현재 세션의 선택값만 유지한다.
    }
    setGenderViewState(nextGenderView);
  }, []);

  const value = useMemo(
    () => ({ genderView, setGenderView }),
    [genderView, setGenderView],
  );

  return (
    <GenderViewContext.Provider value={value}>
      {children}
    </GenderViewContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGenderView(): GenderViewContextValue {
  const context = useContext(GenderViewContext);
  if (!context) {
    throw new Error('useGenderView must be used within a GenderViewProvider');
  }
  return context;
}
