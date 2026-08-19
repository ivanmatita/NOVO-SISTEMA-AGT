// scripts/test_security_and_products_all.mjs
import { createClient } from '@supabase/supabase-js';

const url = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaXFxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzgwMTIsImV4cCI6MjA1NjgxNDAxMn0.vHw_aR580zR8Rz-uG7_8n8bV33FkH7q4_eD3uK3k8L8';

const supabase = createClient(url, anonKey);
const empresaId = '11111111-0000-0000-0000-000000000001';

async function testAll() {
  console.log('--- TESTANDO CRUD COMPLETO: SEGURANÇA PRIVADA & PRODUTOS ---');

  // 1. Inserir Vigilante
  const vigilantePayload = {
    empresa_id: empresaId,
    nome: 'Manuel António João',
    nif: '005432198LA045',
    matricula: 'VIG-889',
    bi_numero: '005432198LA045',
    data_nascimento: '1992-05-14',
    telefone: '+244 923 456 789',
    email: 'manuel.vigilante@sec.ao',
    categoria: 'Vigilante Sénior',
    numero_cartao_profissional: 'CP-998822',
    validade_cartao: '2028-12-31',
    porte_arma: true,
    salario_base: 180000,
    data_admissao: '2024-01-10',
    status: 'ativo',
    morada: 'Bairro Benfica, Rua 12, Luanda',
    observacoes: 'Aprovado em tiro e defesa pessoal'
  };

  const { data: vData, error: vErr } = await supabase.from('seg_vigilantes').insert([vigilantePayload]).select().single();
  if (vErr) throw new Error('Erro ao inserir vigilante: ' + vErr.message);
  console.log('✅ Vigilante inserido com sucesso:', vData.id, vData.nome, vData.bi_numero);

  // 2. Inserir Posto
  const postoPayload = {
    empresa_id: empresaId,
    nome: 'Banco BAI - Agência Central',
    localizacao: 'Luanda - Centro',
    morada_completa: 'Avenida 4 de Fevereiro nº 100',
    cliente_nome: 'Banco BAI',
    cliente_nif: '5401020304',
    numero_postos: 4,
    armas_alocadas: 2,
    tipo_servico: '24 Horas',
    status: 'ativo'
  };

  const { data: pData, error: pErr } = await supabase.from('seg_postos').insert([postoPayload]).select().single();
  if (pErr) throw new Error('Erro ao inserir posto: ' + pErr.message);
  console.log('✅ Posto inserido com sucesso:', pData.id, pData.nome);

  // 3. Inserir Escala
  const escalaPayload = {
    empresa_id: empresaId,
    vigilante_id: vData.id,
    posto_id: pData.id,
    data: '2026-08-20',
    turno: 'Diurno',
    hora_inicio: '06:00',
    hora_fim: '18:00',
    status: 'confirmado'
  };

  const { data: eData, error: eErr } = await supabase.from('seg_escalas').insert([escalaPayload]).select().single();
  if (eErr) throw new Error('Erro ao inserir escala: ' + eErr.message);
  console.log('✅ Escala inserida com sucesso:', eData.id, eData.data, eData.turno);

  // 4. Inserir Armaria
  const armaPayload = {
    empresa_id: empresaId,
    tipo: 'Pistola 9mm',
    marca: 'Taurus',
    modelo: 'PT92',
    numero_serie: 'TAU-897120',
    calibre: '9x19mm',
    capacidade: 15,
    licenca_porte: 'LP-ANG-9921',
    validade_licenca: '2029-05-10',
    estado: 'disponivel',
    localizacao: 'Cofre Principal'
  };

  const { data: aData, error: aErr } = await supabase.from('seg_armaria').insert([armaPayload]).select().single();
  if (aErr) throw new Error('Erro ao inserir arma: ' + aErr.message);
  console.log('✅ Armaria inserida com sucesso:', aData.id, aData.tipo, aData.numero_serie);

  // 5. Inserir Ocorrência
  const ocorrenciaPayload = {
    empresa_id: empresaId,
    titulo: 'Tentativa de Acesso Não Autorizado',
    tipo: 'Segurança Física',
    gravidade: 'alta',
    posto_id: pData.id,
    vigilante_id: vData.id,
    data_hora: new Date().toISOString(),
    descricao: 'Indivíduo tentou ultrapassar o perímetro exterior fora de horas.',
    status: 'em_investigacao'
  };

  const { data: oData, error: oErr } = await supabase.from('seg_ocorrencias').insert([ocorrenciaPayload]).select().single();
  if (oErr) throw new Error('Erro ao inserir ocorrência: ' + oErr.message);
  console.log('✅ Ocorrência inserida com sucesso:', oData.id, oData.titulo);

  // 6. Inserir Produto com imagem
  const produtoPayload = {
    empresa_id: empresaId,
    name: 'Colete Balístico Nível III-A',
    nome: 'Colete Balístico Nível III-A',
    price: 350000,
    cost_price: 220000,
    stock_quantity: 25,
    category: 'Equipamento de Segurança',
    unit: 'UN',
    image_url: 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/produtos-imagens/colete.png',
    imagem_url: 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/produtos-imagens/colete.png'
  };

  const { data: prodData, error: prodErr } = await supabase.from('produtos').insert([produtoPayload]).select().single();
  if (prodErr) throw new Error('Erro ao inserir produto: ' + prodErr.message);
  console.log('✅ Produto inserido com sucesso:', prodData.id, prodData.name, prodData.image_url);

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
}

testAll().catch(e => {
  console.error('❌ Falha:', e);
  process.exit(1);
});

