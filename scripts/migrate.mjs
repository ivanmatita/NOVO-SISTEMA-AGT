/**
 * Migration Runner — NOVO-SISTEMA-AGT
 * 
 * Gerencia e aplica migrations versionadas de forma idempotente e segura
 * entre os ambientes de STAGING e PRODUÇÃO.
 * 
 * Uso:
 *   node scripts/migrate.mjs staging
 *   node scripts/migrate.mjs production [--confirm]
 *   node scripts/migrate.mjs status [staging|production]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const token = process.env.SUPABASE_TOKEN;

const ENV_CONFIG = {
  staging: {
    ref: 'sfnibpxfevhelaikqbiq',
    name: 'STAGING',
    url: 'https://sfnibpxfevhelaikqbiq.supabase.co'
  },
  production: {
    ref: 'nawqfidnawokqaheqvar',
    name: 'PRODUÇÃO',
    url: 'https://nawqfidnawokqaheqvar.supabase.co'
  }
};

async function executeSql(targetEnv, query) {
  const config = ENV_CONFIG[targetEnv];
  if (!config) throw new Error(`Ambiente desconhecido: ${targetEnv}`);

  const res = await fetch(`https://api.supabase.com/v1/projects/${config.ref}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erro na query SQL (${res.status}): ${errText}`);
  }

  return await res.json();
}

async function ensureMigrationTable(targetEnv) {
  const initSql = `
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      version text PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz DEFAULT now(),
      environment text NOT NULL,
      status text NOT NULL DEFAULT 'SUCCESS'
    );
  `;
  await executeSql(targetEnv, initSql);
}

async function getAppliedMigrations(targetEnv) {
  await ensureMigrationTable(targetEnv);
  const rows = await executeSql(targetEnv, `SELECT version, name, checksum, applied_at, status FROM public._schema_migrations ORDER BY version ASC;`);
  return Array.isArray(rows) ? rows : [];
}

function getLocalMigrations() {
  const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
  if (!fs.existsSync(migrationsDir)) return [];

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return files.map(file => {
    const fullPath = path.join(migrationsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const version = file.split('_')[0] + (file.split('_')[1] ? '_' + file.split('_')[1] : '');
    const checksum = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    return {
      file,
      version,
      name: file,
      content,
      checksum,
      path: fullPath
    };
  });
}

export async function runMigrations(targetEnv, options = {}) {
  const config = ENV_CONFIG[targetEnv];
  if (!config) {
    console.error(`❌ Ambiente inválido: ${targetEnv}. Use 'staging' ou 'production'.`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`📦 MIGRATION RUNNER — ALVO: [${config.name}] (${config.ref})`);
  console.log(`======================================================\n`);

  // Regra Suprema para Produção: verificar se as migrations já foram aplicadas em Staging
  if (targetEnv === 'production' && !options.skipStagingCheck) {
    console.log(`🔍 [Validação de Segurança] Verificando histórico de migrations em STAGING...`);
    const stagingApplied = await getAppliedMigrations('staging');
    const stagingVersions = new Set(stagingApplied.filter(m => m.status === 'SUCCESS').map(m => m.name));

    const localMigrations = getLocalMigrations();
    const unappliedInStaging = localMigrations.filter(m => !stagingVersions.has(m.name));

    if (unappliedInStaging.length > 0) {
      console.error(`\n🛑 [BLOQUEIO CRÍTICO DE PRODUÇÃO]`);
      console.error(`As seguintes migrations ainda NÃO foram aplicadas com sucesso em STAGING:`);
      unappliedInStaging.forEach(m => console.error(`   - ${m.name}`));
      console.error(`\nExecute primeiro: npm run migrate:staging\n`);
      if (!options.isModule) process.exit(1);
      return { success: false, error: 'Migrations pendentes em staging' };
    }
    console.log(`✅ Todas as migrations locais já foram testadas em STAGING.`);
  }

  const applied = await getAppliedMigrations(targetEnv);
  const appliedMap = new Map(applied.map(m => [m.name, m]));
  const local = getLocalMigrations();

  console.log(`📁 Total de migrations locais: ${local.length}`);
  console.log(`📊 Migrations já aplicadas em ${config.name}: ${applied.length}\n`);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const mig of local) {
    if (appliedMap.has(mig.name)) {
      console.log(`⏩ [IGNORADA] ${mig.name} (Já aplicada em ${appliedMap.get(mig.name).applied_at})`);
      skippedCount++;
      continue;
    }

    console.log(`⚡ [EXECUTANDO] ${mig.name}...`);
    try {
      // Executa o SQL da migration
      await executeSql(targetEnv, mig.content);

      // Registra no histórico de migrations
      const recordSql = `
        INSERT INTO public._schema_migrations (version, name, checksum, applied_at, environment, status)
        VALUES ('${mig.version}', '${mig.name}', '${mig.checksum}', now(), '${targetEnv}', 'SUCCESS')
        ON CONFLICT (version) DO UPDATE SET 
          checksum = EXCLUDED.checksum, 
          applied_at = now(), 
          status = 'SUCCESS';
      `;
      await executeSql(targetEnv, recordSql);

      console.log(`   ✅ SUCESSO: ${mig.name} aplicada e registrada.`);
      appliedCount++;
    } catch (err) {
      console.error(`\n❌ [ERRO AO APLICAR MIGRATION] ${mig.name}:`, err.message);
      
      // Registra a falha se possível
      try {
        await executeSql(targetEnv, `
          INSERT INTO public._schema_migrations (version, name, checksum, applied_at, environment, status)
          VALUES ('${mig.version}', '${mig.name}', '${mig.checksum}', now(), '${targetEnv}', 'FAILED')
          ON CONFLICT (version) DO UPDATE SET status = 'FAILED';
        `);
      } catch (e) {}

      if (!options.isModule) process.exit(1);
      return { success: false, error: err.message, failedMigration: mig.name };
    }
  }

  console.log(`\n======================================================`);
  console.log(`🏁 RESULTADO: ${appliedCount} aplicadas | ${skippedCount} já existentes | 0 erros`);
  console.log(`======================================================\n`);

  return { success: true, appliedCount, skippedCount };
}

// Execução direta via linha de comando
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

if (isDirectRun || process.argv[1]?.includes('migrate.mjs')) {
  const target = (process.argv[2] || 'staging').toLowerCase();
  
  if (target === 'status') {
    const env = (process.argv[3] || 'staging').toLowerCase();
    getAppliedMigrations(env).then(list => {
      console.log(`\nHistórico de Migrations em [${env.toUpperCase()}]:`);
      console.table(list);
    }).catch(console.error);
  } else {
    runMigrations(target).catch(console.error);
  }
}
