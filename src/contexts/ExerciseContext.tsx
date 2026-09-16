import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface ExerciseContextType {
  exerciseYear: string;
  currentYear: string;
  availableYears: string[];
  setExerciseYear: (year: string | number) => void;
  resetToCurrentYear: () => void;
  isCurrentYear: boolean;
}

const SESSION_KEY = 'active_session_exercise_year';
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
  // O ano corrente é sempre determinado dinamicamente pelo calendário do sistema (ex: 2026)
  const currentYear = useMemo(() => new Date().getFullYear().toString(), []);

  // REGRA: A cada nova sessão/login/nova aba, o padrão deve ser SEMPRE o ano corrente.
  // Dentro da mesma sessão (aba ativa), sessionStorage preserva a troca manual temporária.
  const [exerciseYear, setExerciseYearState] = useState<string>(() => {
    try {
      const inSession = sessionStorage.getItem(SESSION_KEY);
      if (inSession) {
        return getSafeYear(inSession);
      }
      return currentYear;
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
    const standardYears = ['2024', '2025', '2026', '2027'];
    return Array.from(new Set([...standardYears, ...years])).sort((a, b) => Number(a) - Number(b));
  }, [currentYear]);

  const setExerciseYear = useCallback((year: string | number) => {
    const safeYear = getSafeYear(year);
    setExerciseYearState(safeYear);
    try {
      // sessionStorage preserva apenas na aba corrente durante a sessão
      sessionStorage.setItem(SESSION_KEY, safeYear);
      // Limpar resíduos antigos de localStorage para não atuar como fonte de verdade
      localStorage.removeItem('imatec_exercise_year');
      localStorage.removeItem('fiscalYear');
      localStorage.removeItem('user_manually_switched_year');
      window.dispatchEvent(new CustomEvent('exercise_year_changed', { detail: { year: safeYear } }));
    } catch (e) {
      console.warn('[ExerciseContext] Falha ao persistir exercício em sessionStorage:', e);
    }
  }, []);

  const resetToCurrentYear = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem('imatec_exercise_year');
      localStorage.removeItem('fiscalYear');
      localStorage.removeItem('user_manually_switched_year');
    } catch {}
    setExerciseYearState(currentYear);
    window.dispatchEvent(new CustomEvent('exercise_year_changed', { detail: { year: currentYear } }));
  }, [currentYear]);

  const isCurrentYear = exerciseYear === currentYear;

  // Escuta evento de login ou logout para forçar o reset imediato para o ano corrente
  useEffect(() => {
    const handleLoginReset = () => {
      console.log('[ExerciseContext] Novo login/sessão detectado. Redefinindo exercício para o ano corrente:', currentYear);
      resetToCurrentYear();
    };

    window.addEventListener('auth_login_reset_exercise', handleLoginReset);
    return () => window.removeEventListener('auth_login_reset_exercise', handleLoginReset);
  }, [currentYear, resetToCurrentYear]);


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
