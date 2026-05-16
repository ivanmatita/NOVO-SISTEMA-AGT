
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('--- DIAGNOSTIC START ---');
  
  // 1. Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('No user authenticated:', userError);
    return;
  }
  console.log('Authenticated User ID:', user.id);
  console.log('User Email:', user.email);

  // 2. Check get_auth_empresa_id() via RPC if it exists
  const { data: empresaId, error: rpcError } = await supabase.rpc('get_auth_empresa_id');
  if (rpcError) {
    console.warn('RPC get_auth_empresa_id failed (maybe not accessible or missing):', rpcError);
  } else {
    console.log('get_auth_empresa_id() returned:', empresaId);
  }

  // 3. Check perfis
  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  
  if (perfilError) {
    console.error('Error fetching perfil:', perfilError);
  } else {
    console.log('Perfil found:', perfil);
  }

  // 4. Check empresas
  const { data: empresas, error: empresasError } = await supabase
    .from('empresas')
    .select('id, auth_user_id, nome')
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`);
  
  if (empresasError) {
    console.error('Error fetching empresas:', empresasError);
  } else {
    console.log('Empresas found:', empresas);
  }

  console.log('--- DIAGNOSTIC END ---');
}

diagnose();
