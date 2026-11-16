import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(url, serviceKey);

async function run() {
  // Tentar inserir um perfil de teste para ver que erro dá
  const testId = '00000000-0000-0000-0000-000000000001';
  
  // Primeiro limpar se existe
  await supabase.from('perfis').delete().eq('id', testId);
  
  // Tentar inserir com empresa_id
  const { data, error } = await supabase.from('perfis').upsert({
    id: testId,
    empresa_id: '00000000-0000-0000-0000-000000000099',
    email: 'teste@teste.com',
    nome: 'Teste',
    role: 'admin'
  }, { onConflict: 'id' });
  
  if (error) {
    console.log("❌ Erro ao inserir com empresa_id:", error.message);
    console.log("Código:", error.code);
    console.log("Detalhes:", error.details);
    
    // Tentar com company_id
    const { error: error2 } = await supabase.from('perfis').upsert({
      id: testId,
      company_id: '00000000-0000-0000-0000-000000000099',
      email: 'teste@teste.com',
      nome: 'Teste',
      role: 'admin'
    }, { onConflict: 'id' });
    
    if (error2) {
      console.log("❌ Erro com company_id também:", error2.message);
    } else {
      console.log("✓ Funciona com company_id (perfis ainda usa company_id!)");
    }
  } else {
    console.log("✓ Inserção com empresa_id funcionou! A tabela perfis está correcta.");
    // Limpar
    await supabase.from('perfis').delete().eq('id', testId);
  }
  
  // Verificar raw schema
  const raw = await fetch(`${url}/rest/v1/perfis?limit=0`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  console.log("\nStatus HTTP:", raw.status);
  const body = await raw.text();
  console.log("Resposta schema check:", body.substring(0, 500));
}

run().catch(console.error);
