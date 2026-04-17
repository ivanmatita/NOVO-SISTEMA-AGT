import { supabase } from './supabaseClient';
import { User } from '../types';

export const authService = {
  async login(identifier: string, password: string): Promise<User> {
    const localLogin = async () => {
      console.warn('⚠️ Usando base de dados local para login.');
      const res = await fetch('/api/login-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro no login local');
      }
      
      return await res.json();
    };

    // Fallback local imediato se o Supabase não estiver configurado
    if (!supabase) {
      return localLogin();
    }

    let email = identifier;

    try {
      // Autenticar com Supabase Auth usando o email
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials' || authError.message === 'Email not confirmed') {
          console.warn('Erro no Supabase Auth, tentando fallback local:', authError.message);
          return localLogin();
        }
        throw new Error(authError.message);
      }

      // Buscar os dados completos do utilizador (incluindo company_id)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        console.warn('Perfil não encontrado no Supabase, tentando local');
        return localLogin();
      }

      return profileData as User;
    } catch (err: any) {
      // Se for erro de rede (ENOTFOUND, fetch failed), tenta local automaticamente
      if (err.message === 'fetch failed' || err.code === 'ENOTFOUND' || err.message.includes('ENOTFOUND')) {
        console.error('Erro de conexão com Supabase, tentando fallback local:', err);
        return localLogin();
      }
      throw err;
    }
  },

  async logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<User | null> {
    if (!supabase) return null;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profileData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profileData) return null;

    return profileData as User;
  }
};
