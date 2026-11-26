import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { count: totalEmpresas } = await supabase.from('empresas').select('*', { count: 'exact', head: true });
  const { count: ativasEmpresas } = await supabase.from('empresas').select('*', { count: 'exact', head: true }).eq('status_licenca', 'ATIVA').eq('licenca_ativa', true);
  const { count: totalLicencas } = await supabase.from('licencas_empresas').select('*', { count: 'exact', head: true }).eq('status_licenca', 'ATIVA').eq('tipo_licenca', 'TRIAL');
  
  console.log("RESULT_VERIFICATION:", JSON.stringify({
    totalEmpresas,
    ativasEmpresas,
    totalLicencas
  }));
}
check();
