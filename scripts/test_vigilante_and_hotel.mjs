// Test Vigilante insert with empty dates and Hotel reservation insert
import { createClient } from '@supabase/supabase-js';

const url = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';
const supabase = createClient(url, key);
const eid = '11111111-0000-0000-0000-000000000001';

async function test() {
  console.log('--- TESTANDO INSERÇÃO DE VIGILANTE (COM DATAS NULAS/LIMPAS) ---');
  const cleanDate = (d) => (d && typeof d === 'string' && d.trim() !== '') ? d.trim() : null;
  const cleanNum = (n, fallback = null) => (n !== '' && n !== null && n !== undefined && !isNaN(Number(n))) ? Number(n) : fallback;
  const cleanUUID = (id) => (id && typeof id === 'string' && id.trim() !== '' && id.length > 10) ? id.trim() : null;

  // 1. Inserir vigilante com campos de data vazios simulando formulário real
  const rawFormVigilante = {
    nome: 'Carlos Manuel Teste',
    nif: '5412345678',
    matricula: 'VIG-TEST-99',
    bi_numero: '007891234LA042',
    data_nascimento: '', // Empty string in form
    telefone: '+244 923 000 111',
    email: 'carlos@seguranca.ao',
    categoria: 'Vigilante Operacional',
    validade_cartao: '', // Empty string in form
    data_admissao: '2025-01-15',
    salario_base: '180000',
    status: 'ativo',
    posto_id: '', // Empty string in form
  };

  const payloadVigilante = {
    ...rawFormVigilante,
    empresa_id: eid,
    data_nascimento: cleanDate(rawFormVigilante.data_nascimento),
    validade_cartao: cleanDate(rawFormVigilante.validade_cartao),
    data_admissao: cleanDate(rawFormVigilante.data_admissao) || new Date().toISOString().split('T')[0],
    posto_id: cleanUUID(rawFormVigilante.posto_id),
    salario_base: cleanNum(rawFormVigilante.salario_base, 0),
  };

  const { data: vigData, error: vigErr } = await supabase
    .from('seg_vigilantes')
    .insert([payloadVigilante])
    .select()
    .single();

  if (vigErr) {
    console.error('❌ Erro vigilante:', vigErr);
  } else {
    console.log('✅ Vigilante inserido com sucesso! ID:', vigData.id, 'Nome:', vigData.nome, 'Nascimento:', vigData.data_nascimento);
  }

  console.log('\n--- TESTANDO HOTELARIA (QUARTO E RESERVA COM CAMPOS NUMÉRICOS) ---');
  // 2. Inserir quarto de hotel
  const rawFormQuarto = {
    numero: '101-TEST',
    tipo: 'Standard',
    andar: '1º Andar',
    capacidade: '2',
    preco_noite: '25000',
    preco_final_semana: '', // Empty string
    area_m2: '', // Empty string
    status: 'Disponível',
  };

  const payloadQuarto = {
    ...rawFormQuarto,
    empresa_id: eid,
    preco_noite: cleanNum(rawFormQuarto.preco_noite, 0),
    preco_final_semana: cleanNum(rawFormQuarto.preco_final_semana, 0),
    capacidade: cleanNum(rawFormQuarto.capacidade, 2),
    area_m2: cleanNum(rawFormQuarto.area_m2, null),
  };

  const { data: qtoData, error: qtoErr } = await supabase
    .from('hotel_quartos')
    .insert([payloadQuarto])
    .select()
    .single();

  if (qtoErr) {
    console.error('❌ Erro quarto:', qtoErr);
  } else {
    console.log('✅ Quarto criado com sucesso! ID:', qtoData.id, 'Nº:', qtoData.numero, 'Preço:', qtoData.preco_noite);
    
    // 3. Inserir reserva
    const rawFormReserva = {
      quarto_id: qtoData.id,
      hospede_nome: 'António Silva Hóspede',
      hospede_nacionalidade: 'Angolana',
      hospede_telefone: '+244 912 345 678',
      data_checkin: '2026-03-01',
      data_checkout: '2026-03-05',
      num_adultos: '2',
      num_criancas: '', // Empty string
      valor_total: '100000',
      valor_pago: '', // Empty string
      status: 'Confirmada',
    };

    const payloadReserva = {
      ...rawFormReserva,
      empresa_id: eid,
      quarto_id: cleanUUID(rawFormReserva.quarto_id),
      quarto_numero: qtoData.numero,
      num_adultos: cleanNum(rawFormReserva.num_adultos, 1),
      num_criancas: cleanNum(rawFormReserva.num_criancas, 0),
      valor_total: cleanNum(rawFormReserva.valor_total, 0),
      valor_pago: cleanNum(rawFormReserva.valor_pago, 0),
      data_checkin: cleanDate(rawFormReserva.data_checkin),
      data_checkout: cleanDate(rawFormReserva.data_checkout),
    };

    const { data: resData, error: resErr } = await supabase
      .from('hotel_reservas')
      .insert([payloadReserva])
      .select()
      .single();

    if (resErr) {
      console.error('❌ Erro reserva:', resErr);
    } else {
      console.log('✅ Reserva guardada com sucesso sem erro numérico! ID:', resData.id, 'Hóspede:', resData.hospede_nome, 'Total:', resData.valor_total, 'Pago:', resData.valor_pago);
    }
  }
}

test().catch(console.error);

