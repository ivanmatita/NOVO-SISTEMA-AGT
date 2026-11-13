import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listener global para mudanças de estado de autenticação
    let lastHandledSessionId: string | null = null;

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Evento Auth Detectado:', event);
      if (!mounted) return;

      const sessionId = session?.access_token || null;
      if (sessionId === lastHandledSessionId) return;
      lastHandledSessionId = sessionId;

      try {
        if (session) {
          // For TOKEN_REFRESHED, if the user ID hasn't changed we only need to
          // update the session cache — no need to re-fetch the full profile,
          // which would trigger re-renders, Realtime restarts and multiple fetchData calls.
          if (event === 'TOKEN_REFRESHED') {
            const currentUserId = session.user?.id;
            // Read current user from context state via a closure variable set below
            // We use a module-level ref trick: if inFlightUserPromise is null, the
            // previous getCurrentUser already resolved. Check if the resulting user
            // has the same ID to skip the redundant re-fetch.
            const cachedUser = await authService.getSessionSafe();
            if (cachedUser?.user?.id === currentUserId) {
              // Session token rotated but same user – no profile re-fetch needed.
              return;
            }
          }
          const curr = await authService.getCurrentUser();
          if (mounted) {
            setUser(curr);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao processar mudança de estado de autenticação:', err);
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
