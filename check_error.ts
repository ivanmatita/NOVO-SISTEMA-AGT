import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(rawUrl, rawKey);

async function check() {
  const companyId = '2ebafa88-9a6e-4243-b127-b146410815eb'; // Example empresa_id
  const year = 2026;
  const dbPayload = {
    empresa_id: companyId,
    tipo_documento: 'FT',
    numero_documento: 'FT 2026/999999',
    documento_formatado: 'FT 2026/999999',
    cliente_id: null,
    cliente_nome: 'Consumidor Final',
    cliente_email: '',
    total: 100,
    imposto: 14,
    estado: 'emitido',
    data_emissao: new Date().toISOString(),
    detalhes: {
      items: [],
      payment_method: 'Pronto Pagamento'
    },
    serie: 'A',
    ano: year,
    numero_sequencial: 999999,
    hash_anterior: '',
    hash_documento: 'abcd',
    is_certified: false,
    is_draft: true,
    is_final: false,
    moeda: 'AOA',
    taxa_cambio: 1,
    valor_original_moeda: 100,
    documento_origem_id: null,
    numero_documento_origem: null,
    criado_por: null
  };

  const { data, error } = await supabase
    .from('documentos_emitidos')
    .insert([dbPayload])
    .select();

  console.log('--- DB RESPONSE ---');
  if (error) {
    console.error('ERROR OCCURRED:', error);
  } else {
    console.log('SUCCESS:', data);
    // Cleanup immediately
    await supabase.from('documentos_emitidos').delete().eq('numero_documento', 'FT 2026/999999');
  }
}

check();
