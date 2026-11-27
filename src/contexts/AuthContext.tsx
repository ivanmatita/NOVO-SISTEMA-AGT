import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, AuthContextType } from '../types';
import { authService } from '../services/authService';
import { clearTenantCache } from '../lib/tenantDataLoader';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    let lastHandledSessionId: string | null = null;
    let initialLoadResolved = false;

    const initAuth = async () => {
      try {
        const session = await authService.getSessionSafe();
        lastHandledSessionId = session?.access_token || null;
        const currentUser = session ? await authService.getCurrentUser() : null;
        if (mounted) {
          userRef.current = currentUser;
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        if (mounted) {
          userRef.current = null;
          setUser(null);
        }
      } finally {
        initialLoadResolved = true;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Evento Auth Detectado:', event);
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        lastHandledSessionId = null;
        if (event === 'SIGNED_OUT') {
          clearTenantCache();
        }
        if (event === 'SIGNED_OUT' || initialLoadResolved) {
          userRef.current = null;
          setUser(null);
        }
        return;
      }

      // Evita que INITIAL_SESSION dispare consultas concorrentes antes da hidratação inicial coordenada por initAuth
      if (event === 'INITIAL_SESSION' && !initialLoadResolved) {
        return;
      }

      const sessionId = session?.access_token || null;
      if (event === 'INITIAL_SESSION' && sessionId === lastHandledSessionId) {
        return;
      }
      if (sessionId === lastHandledSessionId && userRef.current?.id === session?.user?.id && userRef.current?.empresa_id) {
        return;
      }
      lastHandledSessionId = sessionId;

      try {
        if (event === 'TOKEN_REFRESHED' && userRef.current?.id === session.user?.id && userRef.current?.empresa_id) {
          return;
        }
        const curr = await authService.getCurrentUser();
        if (mounted && curr) {
          userRef.current = curr;
          setUser(curr);
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao processar mudança de estado de autenticação:', err);
        if (mounted && !userRef.current) {
          setUser(null);
        }
      }
    });

    initAuth();

    const handleAccountBlocked = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (mounted) {
        clearTenantCache();
        userRef.current = null;
        setUser(null);
        setError(typeof detail === 'string' ? detail : 'O seu acesso foi bloqueado. Contacte o administrador.');
      }
    };
    window.addEventListener('auth_account_blocked', handleAccountBlocked);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('auth_account_blocked', handleAccountBlocked);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await authService.login(email, password);
      setUser(loggedUser);
      // REGRA 5: A cada nova sessão/login, o padrão deve ser estritamente o ano corrente
      try {
        sessionStorage.removeItem('active_session_exercise_year');
        localStorage.removeItem('imatec_exercise_year');
        localStorage.removeItem('fiscalYear');
        localStorage.removeItem('user_manually_switched_year');
      } catch {}
      window.dispatchEvent(new CustomEvent('auth_login_reset_exercise'));
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData: any) => {
    setLoading(true);
    setError(null);
    try {
      const newUser = await authService.registerCompany(formData);
      if (newUser) {
        setUser(newUser);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      try {
        sessionStorage.removeItem('active_session_exercise_year');
        localStorage.removeItem('imatec_exercise_year');
        localStorage.removeItem('fiscalYear');
        localStorage.removeItem('user_manually_switched_year');
      } catch {}
      window.dispatchEvent(new CustomEvent('auth_login_reset_exercise'));
    } catch (err) {
      console.error('Erro ao sair:', err);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setError(null);
    try {
      await authService.forgotPassword(email);
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar recuperação');
      throw err;
    }
  };

  const updatePassword = async (password: string) => {
    setError(null);
    try {
      await authService.updatePassword(password);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar senha');
      throw err;
    }
  };

  const refreshUser = async () => {
    try {
      const curr = await authService.getCurrentUser();
      setUser(curr);
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword, updatePassword, error, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('[useAuth] Contexto ainda não inicializado ou fora do Provider.');
    return {
      user: null,
      loading: true,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      forgotPassword: async () => {},
      updatePassword: async () => {},
      error: null,
      refreshUser: async () => {}
    };
  }
  return context;
};
