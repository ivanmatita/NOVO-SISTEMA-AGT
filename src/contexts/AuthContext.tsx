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

      if (session) {
        const curr = await authService.getCurrentUser();
        if (mounted) {
          setUser(curr);
        }
      } else {
        setUser(null);
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
      setUser(newUser);
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
