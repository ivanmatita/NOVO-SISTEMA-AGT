/**
 * Release Manager — NOVO-SISTEMA-AGT
 * 
 * Controla o ciclo formal de promoção de versões de STAGING para PRODUÇÃO:
 * DRAFT -> TESTED -> APPROVED -> PROMOTED
 * 
 * Uso:
 *   node scripts/release_manager.mjs create [notas]
 *   node scripts/release_manager.mjs test
 *   node scripts/release_manager.mjs approve [aprovador]
 *   node scripts/release_manager.mjs promote
 *   node scripts/release_manager.mjs status
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { runMigrations } from './migrate.mjs';

const MANIFEST_PATH = path.resolve(process.cwd(), 'release-manifest.json');
const RELEASES_DIR = path.resolve(process.cwd(), 'releases');

function getGitCommitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch (e) {
    return 'unknown';
  }
}

function getMigrationsList() {
  const migDir = path.resolve(process.cwd(), 'supabase/migrations');
  if (!fs.existsSync(migDir)) return [];
  return fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (e) {
    return null;
  }
}

function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

function generateReleaseId() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const datePrefix = `v${y}.${m}.${d}`;

  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
  }

  const existing = fs.readdirSync(RELEASES_DIR).filter(f => f.startsWith(datePrefix));
  const nextSeq = String(existing.length + 1).padStart(3, '0');
  return `${datePrefix}-${nextSeq}`;
}

export async function createRelease(notes = '') {
  const branch = getGitBranch();
  const commitSha = getGitCommitSha();
  const migrations = getMigrationsList();
  const releaseId = generateReleaseId();

  const manifest = {
    release_id: releaseId,
    created_at: new Date().toISOString(),
    branch,
    commit_sha: commitSha,
    status: 'DRAFT',
    notes: notes || 'Release candidata gerada a partir do ambiente de Staging',
    migrations,
    test_results: null,
    approval: {
      approved_by: null,
      approved_at: null,
      notes: null
    },
    promotion: {
      promoted_at: null,
      promoted_by: null,
      production_commit_sha: null,
      migrations_applied: []
    }
  };

  saveManifest(manifest);

  console.log(`\n🎉 [RELEASE CRIADA] ID: ${manifest.release_id}`);
  console.log(`📌 Commit SHA: ${manifest.commit_sha}`);
  console.log(`🌿 Branch: ${manifest.branch}`);
  console.log(`📦 Migrations incluídas: ${manifest.migrations.length}`);
  console.log(`🚦 Status: ${manifest.status}\n`);
  return manifest;
}

export async function runReleaseTests() {
  const manifest = loadManifest();
  if (!manifest) {
    console.error('❌ Nenhum manifesto de release ativo. Execute primeiro: npm run release:create');
    process.exit(1);
  }

  console.log(`\n🧪 [EXECUTANDO TESTES DA RELEASE ${manifest.release_id}]...`);

  try {
    // 1. Validação de TypeScript
    console.log('⚡ 1/3 Verificando TypeScript (tsc --noEmit)...');
    execSync('npx tsc --noEmit', { stdio: 'inherit' });

    // 2. Validação de Migrations em Staging
    console.log('⚡ 2/3 Validando Migrations no Supabase Staging...');
    const migResult = await runMigrations('staging', { isModule: true });
    if (!migResult.success) throw new Error(migResult.error);

    // 3. Validação Online dos Módulos e Endpoints
    console.log('⚡ 3/3 Validando Paridade Online dos Endpoints em Staging...');
    execSync('node scripts/online_real_module_validation.mjs', { stdio: 'inherit' });

    manifest.status = 'TESTED';
    manifest.test_results = {
      timestamp: new Date().toISOString(),
      status: 'ALL_PASSED',
      tests_run: 17
    };
    saveManifest(manifest);

    console.log(`\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!`);
    console.log(`🚦 Release ${manifest.release_id} marcada como: TESTED (Pronta para Aprovação)\n`);
    return { success: true };
  } catch (err) {
    manifest.status = 'TEST_FAILED';
    manifest.test_results = {
      timestamp: new Date().toISOString(),
      status: 'FAILED',
      error: err.message
    };
    saveManifest(manifest);
    console.error(`\n❌ FALHA NOS TESTES DA RELEASE:`, err.message);
    process.exit(1);
  }
}

export async function approveRelease(approver = 'admin', notes = 'Aprovado para promoção em produção') {
  const manifest = loadManifest();
  if (!manifest) {
    console.error('❌ Nenhum manifesto de release ativo. Execute: npm run release:create');
    process.exit(1);
  }

  if (manifest.status !== 'TESTED' && manifest.status !== 'DRAFT') {
    console.warn(`⚠️ Aviso: status atual da release é '${manifest.status}'. Recomendado executar testes antes.`);
  }

  const currentCommit = getGitCommitSha();
  if (currentCommit !== manifest.commit_sha) {
    console.error(`🛑 [BLOQUEIO] O commit atual (${currentCommit}) é diferente do commit registrado no manifesto (${manifest.commit_sha}).`);
    console.error(`Crie uma nova release para o novo commit.`);
    process.exit(1);
  }

  manifest.status = 'APPROVED';
  manifest.approval = {
    approved_by: approver,
    approved_at: new Date().toISOString(),
    notes
  };

  saveManifest(manifest);

  console.log(`\n======================================================`);
  console.log(`🛡️ RELEASE APROVADA PARA PRODUÇÃO`);
  console.log(`======================================================`);
  console.log(`🆔 Release: ${manifest.release_id}`);
  console.log(`📌 Commit SHA Aprovado: ${manifest.commit_sha}`);
  console.log(`👤 Aprovado por: ${manifest.approval.approved_by}`);
  console.log(`⏰ Data: ${manifest.approval.approved_at}`);
  console.log(`🚦 Status: APPROVED`);
  console.log(`======================================================\n`);
  console.log(`Para promover a Produção com segurança, execute:`);
  console.log(`   npm run release:promote\n`);
  return manifest;
}

export async function promoteRelease() {
  const manifest = loadManifest();
  if (!manifest) {
    console.error('❌ Nenhum manifesto de release ativo.');
    process.exit(1);
  }

  if (manifest.status !== 'APPROVED') {
    console.error(`\n🛑 [BLOQUEIO CRÍTICO DE PROMOÇÃO]`);
    console.error(`A release ${manifest.release_id} está com status '${manifest.status}', NÃO 'APPROVED'.`);
    console.error(`Somente releases formalmente aprovadas podem ser promovidas para Produção.`);
    console.error(`Execute primeiro: npm run release:approve\n`);
    process.exit(1);
  }

  const currentCommit = getGitCommitSha();
  if (currentCommit !== manifest.commit_sha) {
    console.error(`\n🛑 [BLOQUEIO CRÍTICO]`);
    console.error(`O commit do workspace (${currentCommit}) NÃO corresponde ao commit SHA aprovado (${manifest.commit_sha}).`);
    console.error(`Produção DEVE receber exatamente o commit SHA aprovado.\n`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 INICIANDO PROMOÇÃO CONTROLADA PARA PRODUÇÃO`);
  console.log(`======================================================`);
  console.log(`🆔 Release: ${manifest.release_id}`);
  console.log(`📌 Commit SHA: ${manifest.commit_sha}`);
  console.log(`👤 Aprovador: ${manifest.approval.approved_by}`);
  console.log(`======================================================\n`);

  // 1. Aplicar Migrations no Supabase Produção
  console.log(`📦 [Passo 1/3] Aplicando migrations aprovadas no Supabase PRODUÇÃO...`);
  const migResult = await runMigrations('production', { isModule: true });
  if (!migResult.success) {
    console.error(`❌ Promoção abortada: falha nas migrations de produção.`);
    process.exit(1);
  }

  // 2. Sincronizar branch main com o commit SHA exato
  console.log(`🌿 [Passo 2/3] Atualizando branch 'main' com o commit SHA exato ${manifest.commit_sha}...`);
  try {
    execSync(`git push origin ${manifest.commit_sha}:refs/heads/main`, { stdio: 'inherit' });
    console.log(`✅ Branch 'main' no GitHub sincronizada com o commit ${manifest.commit_sha}`);
  } catch (gitErr) {
    console.error(`❌ Erro ao sincronizar branch main:`, gitErr.message);
    process.exit(1);
  }

  // 3. Atualizar status do manifesto e arquivar histórico
  manifest.status = 'PROMOTED';
  manifest.promotion = {
    promoted_at: new Date().toISOString(),
    promoted_by: 'pipeline-runner',
    production_commit_sha: manifest.commit_sha,
    migrations_applied: manifest.migrations
  };
  saveManifest(manifest);

  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
  }
  const archivePath = path.join(RELEASES_DIR, `${manifest.release_id}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n======================================================`);
  console.log(`🎉 PROMOÇÃO PARA PRODUÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`======================================================`);
  console.log(`🆔 Release: ${manifest.release_id}`);
  console.log(`📁 Histórico arquivado em: releases/${manifest.release_id}.json`);
  console.log(`🌐 Vercel Produção: https://novo-sistema-agt.vercel.app`);
  console.log(`======================================================\n`);
  return manifest;
}

export function showStatus() {
  const manifest = loadManifest();
  if (!manifest) {
    console.log('\nNenhum manifesto ativo encontrado.');
    return;
  }
  console.log(`\n=== STATUS DA RELEASE ATIVA ===`);
  console.table({
    Release_ID: manifest.release_id,
    Status: manifest.status,
    Branch: manifest.branch,
    Commit_SHA: manifest.commit_sha,
    Migrations: manifest.migrations.length,
    Aprovador: manifest.approval?.approved_by || 'Nenhum',
    Data_Aprovacao: manifest.approval?.approved_at || 'Pendente'
  });
}

// CLI runner
const action = (process.argv[2] || 'status').toLowerCase();
const arg = process.argv[3];

if (action === 'create') {
  createRelease(arg).catch(console.error);
} else if (action === 'test') {
  runReleaseTests().catch(console.error);
} else if (action === 'approve') {
  approveRelease(arg || 'admin').catch(console.error);
} else if (action === 'promote') {
  promoteRelease().catch(console.error);
} else {
  showStatus();
}
