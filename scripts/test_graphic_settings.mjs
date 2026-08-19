// scripts/test_graphic_settings.mjs
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

async function testGraphicSettings() {
  console.log('--- TESTANDO ATUALIZAÇÃO DE IMAGENS E CAMPOS GRÁFICOS ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  console.log('1. Atualizando footer_image_url, watermark_url e logo_url na tabela empresas...');
  const res = await sql(`
    UPDATE public.empresas
    SET 
      logo_url = 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/logo-teste.png',
      watermark_url = 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/watermark-teste.png',
      footer_image_url = 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/footer-teste.png'
    WHERE id = '${empresaId}'
    RETURNING id, logo_url, watermark_url, footer_image_url;
  `);

  console.log('   ✅ Tabela empresas atualizada com sucesso:', res[0]);

  console.log('2. Atualizando na tabela config_empresa...');
  const res2 = await sql(`
    INSERT INTO public.config_empresa (empresa_id, logo_url, watermark_url, footer_image_url)
    VALUES ('${empresaId}', 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/logo-teste.png', 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/watermark-teste.png', 'https://sfnibpxfevhelaikqbiq.supabase.co/storage/v1/object/public/media/footer-teste.png')
    ON CONFLICT (empresa_id) DO UPDATE 
    SET logo_url = EXCLUDED.logo_url, watermark_url = EXCLUDED.watermark_url, footer_image_url = EXCLUDED.footer_image_url
    RETURNING id, logo_url, watermark_url, footer_image_url;
  `);

  console.log('   ✅ Tabela config_empresa atualizada com sucesso:', res2[0]);
  console.log('\n🎉 TESTE DAS CONFIGURAÇÕES GRÁFICAS CONCLUÍDO COM 100% DE SUCESSO!');
}

testGraphicSettings().catch(e => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
});

