import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface ExerciseContextType {
  exerciseYear: string;
  currentYear: string;
  availableYears: string[];
  setExerciseYear: (year: string | number) => void;
  resetToCurrentYear: () => void;
  isCurrentYear: boolean;
}

const STORAGE_KEY = 'imatec_exercise_year';
const MIN_VALID_YEAR = 2020;
const MAX_VALID_YEAR = 2050;

function getSafeYear(val: any): string {
  const current = new Date().getFullYear().toString();
  if (!val) return current;

  const num = parseInt(String(val).trim(), 10);
  if (isNaN(num) || num < MIN_VALID_YEAR || num > MAX_VALID_YEAR) {
    return current;
  }
  return num.toString();
}

const ExerciseContext = createContext<ExerciseContextType | undefined>(undefined);

export function ExerciseProvider({ children }: { children: React.ReactNode }) {
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  const [exerciseYear, setExerciseYearState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('fiscalYear');
      return getSafeYear(saved);
    } catch {
      return currentYear;
    }
  });

  const availableYears = useMemo(() => {
    const currentNum = parseInt(currentYear, 10);
    const years: string[] = [];
    for (let y = currentNum - 3; y <= currentNum + 1; y++) {
      years.push(y.toString());
    }
    return years;
  }, [currentYear]);

  const setExerciseYear = useCallback((year: string | number) => {
    const safeYear = getSafeYear(year);
    setExerciseYearState(safeYear);
    try {
      localStorage.setItem(STORAGE_KEY, safeYear);
      localStorage.setItem('fiscalYear', safeYear);
    } catch (e) {
      console.warn('[ExerciseContext] Falha ao persistir exercício no localStorage:', e);
    }
  }, []);

  const resetToCurrentYear = useCallback(() => {
    setExerciseYear(currentYear);
  }, [currentYear, setExerciseYear]);

  const isCurrentYear = exerciseYear === currentYear;

  // Sincronização entre tabs via evento 'storage'
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === 'fiscalYear') {
        if (e.newValue) {
          const safe = getSafeYear(e.newValue);
          setExerciseYearState(safe);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = useMemo(() => ({
    exerciseYear,
    currentYear,
    availableYears,
    setExerciseYear,
    resetToCurrentYear,
    isCurrentYear
  }), [exerciseYear, currentYear, availableYears, setExerciseYear, resetToCurrentYear, isCurrentYear]);

  return (
    <ExerciseContext.Provider value={value}>
      {children}
    </ExerciseContext.Provider>
  );
}

export function useExercise(): ExerciseContextType {
  const context = useContext(ExerciseContext);
  if (!context) {
    const fallbackCurrent = new Date().getFullYear().toString();
    return {
      exerciseYear: fallbackCurrent,
      currentYear: fallbackCurrent,
      availableYears: [fallbackCurrent],
      setExerciseYear: () => {},
      resetToCurrentYear: () => {},
      isCurrentYear: true
    };
  }
  return context;
}
