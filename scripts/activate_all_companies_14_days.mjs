import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente de .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function activateAllCompanies() {
  console.log("==========================================================");
  console.log("🚀 INICIANDO ATIVAÇÃO DE 14 DIAS GRÁTIS PARA TODAS AS EMPRESAS");
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log("==========================================================");

  // 1. Buscar todas as empresas
  const { data: empresas, error: fetchError } = await supabase
    .from('empresas')
    .select('*');

  if (fetchError) {
    console.error("❌ Erro ao buscar empresas:", fetchError.message);
    process.exit(1);
  }

  if (!empresas || empresas.length === 0) {
    console.log("⚠️ Nenhuma empresa encontrada na tabela 'empresas'.");
    return;
  }

  console.log(`🏢 Total de empresas encontradas: ${empresas.length}`);

  const now = Date.now();
  const trial_inicio = new Date(now).toISOString();
  const trial_fim = new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
  const data_validade = trial_fim.split('T')[0];

  console.log(`⏱ Período do Trial:`);
  console.log(`   - Início: ${trial_inicio}`);
  console.log(`   - Fim:    ${trial_fim}`);
  console.log(`   - Data de Validade: ${data_validade}`);
  console.log("----------------------------------------------------------");

  let sucessos = 0;
  let falhas = 0;
  const erros = [];

  for (const emp of empresas) {
    const nomeEmpresa = emp.nome_empresa || emp.nome || emp.id;
    const plano = emp.plano || 'Profissional';

    console.log(`\n🔄 Processando empresa: [${emp.id}] - ${nomeEmpresa}`);

    try {
      // 1. Atualizar tabela empresas
      // NOTA: NÃO incluir 'valor_licenca'
      const updateEmpresaPayload = {
        status_licenca: 'ATIVA',
        licenca_ativa: true,
        ativo: true,
        trial_inicio: trial_inicio,
        trial_fim: trial_fim,
        data_expiracao_licenca: trial_fim
      };

      const { error: errEmpresa } = await supabase
        .from('empresas')
        .update(updateEmpresaPayload)
        .eq('id', emp.id);

      if (errEmpresa) {
        throw new Error(`Erro ao atualizar empresas: ${errEmpresa.message}`);
      }

      console.log(`   ✅ Tabela 'empresas' atualizada com status ATIVA`);

      // 2. Atualizar ou inserir na tabela licencas_empresas
      const licencaPayload = {
        empresa_id: emp.id,
        status_licenca: 'ATIVA',
        estado: 'Ativa',
        tipo_licenca: 'TRIAL',
        plano: plano,
        tipo_plano: plano,
        licenca_ativa: true,
        ativo: true,
        dias_trial: 14,
        trial_inicio: trial_inicio,
        trial_fim: trial_fim,
        data_inicio: trial_inicio,
        data_fim: trial_fim,
        data_expiracao: trial_fim,
        data_validade: data_validade
      };

      // Tenta primeiro upsert com onConflict: 'empresa_id'
      let { error: errLicenca } = await supabase
        .from('licencas_empresas')
        .upsert(licencaPayload, { onConflict: 'empresa_id' });

      // Se falhar devido a restrição de unicidade inexistente no onConflict, fazer fallback para select -> update/insert
      if (errLicenca) {
        console.warn(`   ⚠️ Upsert onConflict falhou (${errLicenca.message}). Tentando fallback manual...`);

        const { data: existingLic, error: licFindErr } = await supabase
          .from('licencas_empresas')
          .select('id')
          .eq('empresa_id', emp.id)
          .maybeSingle();

        if (licFindErr) {
          throw new Error(`Erro ao consultar licencas_empresas: ${licFindErr.message}`);
        }

        if (existingLic && existingLic.id) {
          const { error: updErr } = await supabase
            .from('licencas_empresas')
            .update(licencaPayload)
            .eq('id', existingLic.id);

          if (updErr) {
            throw new Error(`Erro ao atualizar licencas_empresas (fallback): ${updErr.message}`);
          }
          console.log(`   ✅ Tabela 'licencas_empresas' atualizada via update por ID`);
        } else {
          const { error: insErr } = await supabase
            .from('licencas_empresas')
            .insert(licencaPayload);

          if (insErr) {
            throw new Error(`Erro ao inserir em licencas_empresas (fallback): ${insErr.message}`);
          }
          console.log(`   ✅ Tabela 'licencas_empresas' criada via insert`);
        }
      } else {
        console.log(`   ✅ Tabela 'licencas_empresas' sincronizada via upsert`);
      }

      sucessos++;
    } catch (err) {
      console.error(`   ❌ Falha ao processar empresa ${emp.id}: ${err.message}`);
      falhas++;
      erros.push({ empresa_id: emp.id, nome: nomeEmpresa, erro: err.message });
    }
  }

  console.log("\n==========================================================");
  console.log("📊 RELATÓRIO FINAL DA ATIVAÇÃO");
  console.log("==========================================================");
  console.log(`• Total de empresas avaliadas: ${empresas.length}`);
  console.log(`• Empresas ativadas com sucesso: ${sucessos}`);
  console.log(`• Falhas: ${falhas}`);

  if (erros.length > 0) {
    console.log("\nDetalhes dos erros:");
    erros.forEach(e => console.log(`- [${e.empresa_id}] ${e.nome}: ${e.erro}`));
  }

  console.log("==========================================================");
}

activateAllCompanies().catch((err) => {
  console.error("❌ Erro fatal na execução do script:", err);
  process.exit(1);
});
