import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listener global para mudanças de estado de autenticação
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      console.log('Evento Auth Detectado:', event);
      if (session) {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, forgotPassword, updatePassword, error }}>
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
