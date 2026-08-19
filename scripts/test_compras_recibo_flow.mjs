// scripts/test_compras_recibo_flow.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function testReciboFlow() {
  console.log('--- TESTANDO FLUXO COMPLETO DE FATURA DE COMPRA + EMISSÃO DE RECIBO ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  // 1. Criar fatura de compra
  const fatura = await sql(`
    INSERT INTO public.compras (
      empresa_id,
      supplier_name,
      fornecedor_nome,
      document_type,
      tipo_documento,
      purchase_number,
      numero_documento,
      total,
      valor_total,
      saldo_pendente,
      valor_pago,
      status,
      estado
    ) VALUES (
      '${empresaId}',
      'FORNECEDOR CENTRAL LDA',
      'FORNECEDOR CENTRAL LDA',
      'Fatura de Compra',
      'Fatura de Compra',
      'FTC/2026/099',
      'FTC/2026/099',
      50000,
      50000,
      50000,
      0,
      'pendente',
      'PENDENTE'
    ) RETURNING id, purchase_number, total, saldo_pendente;
  `);
  console.log('✅ 1. Fatura de compra criada:', fatura[0]);

  const faturaId = fatura[0].id;

  // 2. Atualizar fatura com liquidação
  const updatedFatura = await sql(`
    UPDATE public.compras
    SET 
      recibo_emitido = true,
      numero_recibo = 'R-FT-2026/001',
      data_recibo = NOW(),
      forma_pagamento = 'Transferência',
      valor_pago = 50000,
      saldo_pendente = 0,
      status = 'pago',
      estado = 'PAGO',
      atualizado_em = NOW()
    WHERE id = '${faturaId}'
    RETURNING id, status, saldo_pendente, valor_pago;
  `);
  console.log('✅ 2. Fatura de compra liquidada:', updatedFatura[0]);

  // 3. Inserir documento de Recibo na tabela compras
  const recibo = await sql(`
    INSERT INTO public.compras (
      empresa_id,
      fornecedor_nome,
      supplier_name,
      data_compra,
      data,
      valor_total,
      total,
      tipo_documento,
      document_type,
      status,
      estado,
      recibo_emitido,
      saldo_pendente,
      valor_pago,
      numero_documento,
      numero_compra,
      numero_fatura,
      invoice_number,
      forma_pagamento,
      metodo_pagamento,
      itens,
      items,
      hash,
      descricao
    ) VALUES (
      '${empresaId}',
      'FORNECEDOR CENTRAL LDA',
      'FORNECEDOR CENTRAL LDA',
      CURRENT_DATE,
      CURRENT_DATE,
      50000,
      50000,
      'Recibo',
      'Recibo',
      'pago',
      'PAGO',
      true,
      0,
      50000,
      'R-FT-2026/001',
      'R-FT-2026/001',
      'FTC/2026/099',
      'FTC/2026/099',
      'Transferência',
      'Transferência',
      '[{"description": "Liquidação de Fatura de Compra FTC/2026/099", "quantity": 1, "unit_price": 50000, "total": 50000}]'::jsonb,
      '[{"description": "Liquidação de Fatura de Compra FTC/2026/099", "quantity": 1, "unit_price": 50000, "total": 50000}]'::jsonb,
      'RC-SHA256-TEST999',
      'Pagamento de FT nº FTC/2026/099 - Recibo R-FT-2026/001'
    ) RETURNING id, numero_documento, total, status;
  `);
  console.log('✅ 3. Recibo emitido com sucesso na tabela compras:', recibo[0]);

  console.log('\n🎉 TESTE DE EMISSÃO DE RECIBOS DE COMPRAS CONCLUÍDO COM 100% DE SUCESSO!');
}

testReciboFlow().catch(err => {
  console.error('❌ Erro no teste de recibo:', err);
  process.exit(1);
});

