import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchYears } from '@/lib/api';
import type { Year } from '@/types';

interface YearContextValue {
  selectedYear: number;
  selectedYearId: string | null;
  setSelectedYear: (y: number) => void;
  availableYears: Year[];
  loading: boolean;
}

const YearContext = createContext<YearContextValue | null>(null);
const STORAGE_KEY = 'lggm.selectedYear';

export function YearProvider({ children }: { children: ReactNode }) {
  const [availableYears, setAvailableYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored ? parseInt(stored, 10) : new Date().getFullYear();
  });

  useEffect(() => {
    fetchYears()
      .then((years) => {
        setAvailableYears(years);
        if (years.length === 0) { setLoading(false); return; }
        // If selected year isn't available, fall back to the active year
        if (!years.some((y) => y.year === selectedYear)) {
          const active = years.find((y) => y.is_active) ?? years[0];
          if (active) setSelectedYearState(active.year);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedYear = useCallback((y: number) => {
    setSelectedYearState(y);
    try { window.localStorage.setItem(STORAGE_KEY, String(y)); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({
      selectedYear,
      selectedYearId: availableYears.find((y) => y.year === selectedYear)?.id ?? null,
      setSelectedYear,
      availableYears,
      loading,
    }),
    [selectedYear, setSelectedYear, availableYears, loading],
  );

  return <YearContext.Provider value={value}>{children}</YearContext.Provider>;
}

export function useYear() {
  const ctx = useContext(YearContext);
  if (!ctx) throw new Error('useYear must be used inside <YearProvider>');
  return ctx;
}
