// scripts/test_compras_insert.mjs
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

async function testCompras() {
  console.log('--- TESTANDO REGISTO NA TABELA COMPRAS ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  const res = await sql(`
    INSERT INTO public.compras (
      empresa_id,
      supplier_name,
      fornecedor_nome,
      supplier_nif,
      document_type,
      tipo_documento,
      invoice_number,
      numero_documento,
      date,
      items,
      total,
      valor_total,
      vat_amount,
      caixa,
      caixa_id,
      status,
      saldo_pendente
    ) VALUES (
      '${empresaId}',
      'FORNECEDOR TESTE LDA',
      'FORNECEDOR TESTE LDA',
      '5000000002',
      'Fatura de Compra',
      'Fatura de Compra',
      'FT 2026/001',
      'FT 2026/001',
      CURRENT_DATE,
      '[{"descricao": "Artigo Teste", "quantidade": 2, "preco_unitario": 5000, "total": 10000}]'::jsonb,
      10000,
      10000,
      1400,
      'Caixa Central',
      '1',
      'pendente',
      10000
    ) RETURNING id, invoice_number, total, supplier_name;
  `);

  console.log('✅ Compra registada com sucesso no banco de dados:', res[0]);
}

testCompras().catch(e => {
  console.error('❌ Erro:', e);
  process.exit(1);
});

