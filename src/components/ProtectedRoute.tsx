import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Mode bypass para ver o sistema sem login (conforme solicitado)
  const bypassAuth = true; 

  const demoUser: any = {
    id: 'demo-id',
    username: 'DemoAdmin',
    email: 'demo@example.com',
    company_id: 'demo-company',
    role: 'admin',
    created_at: new Date().toISOString()
  };

  if (loading && !bypassAuth) {
    return (
// ... existing loading UI ...
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#003366]" size={40} />
          <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Verificando Sessão...</p>
        </div>
      </div>
    );
  }

  if (!user && !bypassAuth) {
    return <LoginPage />;
  }

  // Se bypass estiver activo e não houver user, o App usará o contexto ou podemos passar props
  // Mas como o App usa useAuth(), o ideal seria o AuthContext devolver o demoUser.
  return <>{children}</>;
};
