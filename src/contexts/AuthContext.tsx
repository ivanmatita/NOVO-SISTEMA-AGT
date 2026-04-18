import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthContextType } from '../types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Demo user para bypass de desenvolvimento
  const demoUser: User = {
    id: '00000000-0000-0000-0000-000000000000',
    username: 'Administrador Demo',
    email: 'demo@empresa.com',
    company_id: '11111111-1111-1111-1111-111111111111',
    role: 'admin',
    created_at: new Date().toISOString()
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        // Se não houver user do Supabase, usamos o demo para permitir ver o sistema
        setUser(currentUser || demoUser);
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        setUser(demoUser);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await authService.login(identifier, password);
      setUser(loggedUser);
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, error }}>
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
