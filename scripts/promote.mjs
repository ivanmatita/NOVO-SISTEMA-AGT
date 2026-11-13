#!/usr/bin/env node
/**
 * ============================================================
 * PROMOTE.MJS — Pipeline Staging ? Produção
 * NOVO-SISTEMA-AGT
 * ============================================================
 * REGRA SUPREMA: NADA vai para Produção sem confirmação MANUAL
 * e EXPLÍCITA do administrador neste terminal.
 *
 * Uso:
 *   node scripts/promote.mjs              ? Fluxo completo
 *   node scripts/promote.mjs --status     ? Ver release ativa
 *   node scripts/promote.mjs --dry-run    ? Simulação
 * ============================================================
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';

const MANIFEST_PATH  = path.resolve(process.cwd(), 'release-manifest.json');
const RELEASES_DIR   = path.resolve(process.cwd(), 'releases');
const MIGRATIONS_DIR = path.resolve(process.cwd(), 'supabase/migrations');
const SUPABASE_TOKEN = process.env.SUPABASE_TOKEN;

const ENV = {
  staging:    { ref: 'sfnibpxfevhelaikqbiq', name: 'STAGING',  url: 'https://sfnibpxfevhelaikqbiq.supabase.co' },
  production: { ref: 'nawqfidnawokqaheqvar', name: 'PRODUCAO', url: 'https://nawqfidnawokqaheqvar.supabase.co' },
};

const isDryRun   = process.argv.includes('--dry-run');
const statusOnly = process.argv.includes('--status');

function sep(c='=',n=60){return c.repeat(n);}
function log(m) { console.log(m); }
function warn(m){ console.warn('\u26a0\ufe0f  '+m); }
function ok(m)  { console.log('\u2705 '+m); }
function err(m) { console.error('\n\ud83d\uded1 '+m); }
function hdr(m) { log('\n'+sep()+'\n'+m+'\n'+sep()); }

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH,'utf8')); } catch { return null; }
}
function saveManifest(m){ fs.writeFileSync(MANIFEST_PATH,JSON.stringify(m,null,2),'utf8'); }
function localMigrations(){ if(!fs.existsSync(MIGRATIONS_DIR)) return []; return fs.readdirSync(MIGRATIONS_DIR).filter(f=>f.endsWith('.sql')).sort(); }

async function sqlQuery(env, query){
  const cfg=ENV[env];
  const res=await fetch(`https://api.supabase.com/v1/projects/${cfg.ref}/database/query`,{
    method:'POST', headers:{'Authorization':`Bearer ${SUPABASE_TOKEN}`,'Content-Type':'application/json'},
    body:JSON.stringify({query})
  });
  if(!res.ok){ const t=await res.text(); throw new Error(`SQL error (${res.status}): ${t}`); }
  return res.json();
}

async function appliedMigrations(env){
  try {
    await sqlQuery(env,`CREATE TABLE IF NOT EXISTS public._schema_migrations (version text PRIMARY KEY, name text NOT NULL, checksum text NOT NULL, applied_at timestamptz DEFAULT now(), environment text NOT NULL, status text NOT NULL DEFAULT 'SUCCESS');`);
    const rows=await sqlQuery(env,`SELECT name FROM public._schema_migrations WHERE status='SUCCESS' ORDER BY name ASC;`);
    return Array.isArray(rows)?rows.map(r=>r.name):[];
  } catch { return []; }
}

function ask(rl,q){ return new Promise(r=>rl.question(q,r)); }

function showStatus(){
  const m=loadManifest();
  if(!m){ log('\nNenhum release-manifest.json. Execute: npm run release:create\n'); return; }
  const migs=localMigrations();
  hdr('STATUS DA RELEASE ATIVA');
  log(`Release:   ${m.release_id}`);
  log(`Branch:    ${m.branch}`);
  log(`Commit:    ${m.commit_sha}`);
  log(`Status:    ${m.status}`);
  log(`Criado:    ${m.created_at}`);
  log(`Notas:     ${m.notes||'-'}`);
  log(`\nMigrations (${migs.length}):`);
  migs.forEach(g=>log(`  - ${g}`));
  if(m.approval?.approved_by) log(`\nAprovado por: ${m.approval.approved_by} em ${m.approval.approved_at}`);
  log('');
}

async function preflightChecks(manifest){
  hdr('PRE-VERIFICACAO DE SEGURANCA PARA PRODUCAO');
  const checks={
    'Manifesto existe': !!manifest,
    'Status = APPROVED': manifest?.status==='APPROVED',
    'Branch = staging': manifest?.branch==='staging',
    'Commit SHA registrado': !!manifest?.commit_sha,
    'Aprovador registrado': !!manifest?.approval?.approved_by,
    'Migrations locais existem': localMigrations().length>0,
  };
  let ok_=true;
  for(const[l,p] of Object.entries(checks)){ log(`  ${p?'OK':'FAIL'}: ${l}`); if(!p)ok_=false; }
  if(!ok_){ err('Verificacoes falharam. Execute: npm run release:create && npm run migrate:staging && npm run release:approve'); process.exit(1); }

  log('\nVerificando migrations em STAGING...');
  const stagApplied=await appliedMigrations('staging');
  const local=localMigrations();
  const pendStag=local.filter(m=>!stagApplied.includes(m));
  if(pendStag.length>0){ err('Migrations nao testadas em Staging: '+pendStag.join(', ')+'. Execute: npm run migrate:staging'); process.exit(1); }
  log('OK: Todas as migrations testadas em Staging.');

  log('\nVerificando migrations pendentes em PRODUCAO...');
  const prodApplied=await appliedMigrations('production');
  const pendProd=local.filter(m=>!prodApplied.includes(m));
  if(pendProd.length===0) log('Banco de producao ja esta sincronizado.');
  else { log(`Migrations pendentes para PRODUCAO (${pendProd.length}):`); pendProd.forEach((m,i)=>log(`  ${i+1}. ${m} [Testada em Staging: ${stagApplied.includes(m)?'SIM':'NAO'}]`)); }
  return { pendingInProd: pendProd };
}

function showSummary(manifest, pendMigs){
  hdr('RELEASE PRONTA PARA PROMOCAO EM PRODUCAO');
  log(`Release:             ${manifest.release_id}`);
  log(`Commit Aprovado:     ${manifest.commit_sha}`);
  log(`Branch Origem:       ${manifest.branch}`);
  log(`Aprovado por:        ${manifest.approval.approved_by}`);
  log(`Data Aprovacao:      ${manifest.approval.approved_at}`);
  log(`\nMigrations para Producao (${pendMigs.length}):`);
  if(pendMigs.length===0) log('  Nenhuma (banco sincronizado)');
  else pendMigs.forEach((m,i)=>log(`  ${i+1}. ${m}`));
  log(`\nDestino Vercel:   https://novo-sistema-agt.vercel.app`);
  log(`Destino Supabase: ${ENV.production.url}`);
  log('\n'+sep('-'));
  warn('Esta acao promovera codigo e migrations para PRODUCAO OFICIAL.');
  warn('Irreversivel para dados existentes.');
  log(sep('-'));
}

async function applyMigrationsToProd(pendMigs){
  if(pendMigs.length===0){ log('Nenhuma migration para aplicar.'); return; }
  log('\nAPLICANDO MIGRATIONS NO SUPABASE PRODUCAO...\n');
  for(const migName of pendMigs){
    const migPath=path.join(MIGRATIONS_DIR,migName);
    if(!fs.existsSync(migPath)){ err('Migration nao encontrada: '+migPath); process.exit(1); }
    const sql=fs.readFileSync(migPath,'utf8');
    log(`Aplicando: ${migName}`);
    if(isDryRun){ log('  [DRY RUN] Simulando. Nada foi alterado.'); continue; }
    try {
      await sqlQuery('production',sql);
      const crypto=(await import('crypto')).default;
      const checksum=crypto.createHash('sha256').update(sql).digest('hex').substring(0,16);
      const version=migName.split('_').slice(0,2).join('_');
      await sqlQuery('production',`INSERT INTO public._schema_migrations (version,name,checksum,applied_at,environment,status) VALUES ('${version}','${migName}','${checksum}',now(),'production','SUCCESS') ON CONFLICT (version) DO UPDATE SET checksum=EXCLUDED.checksum,applied_at=now(),status='SUCCESS';`);
      log(`  OK: ${migName}`);
    } catch(e){ err(`FALHA migration ${migName}: ${e.message}`); process.exit(1); }
  }
}

async function promoteCodeToMain(manifest){
  log('\nPROMOVENDO CODIGO PARA BRANCH main...\n');
  if(isDryRun){ log(`[DRY RUN] git push origin ${manifest.commit_sha}:refs/heads/main`); return; }
  try { execSync(`git push origin ${manifest.commit_sha}:refs/heads/main`,{stdio:'inherit'}); log(`OK: Branch main atualizada com commit ${manifest.commit_sha}`); }
  catch(e){ err(`Falha ao push para main: ${e.message}`); process.exit(1); }
}

async function main(){
  if(statusOnly){ showStatus(); process.exit(0); }
  const rl=readline.createInterface({input:process.stdin,output:process.stdout});
  try {
    hdr('PIPELINE STAGING -> PRODUCAO — NOVO-SISTEMA-AGT');
    if(isDryRun) warn('MODO DRY-RUN ATIVO: Nenhuma alteracao real sera feita.\n');

    const manifest=loadManifest();
    if(!manifest){ err('Nenhum release-manifest.json. Execute: npm run release:create'); process.exit(1); }

    const { pendingInProd } = await preflightChecks(manifest);
    showSummary(manifest, pendingInProd);

    // CONFIRMACAO 1: Teste pessoal
    log('\nCONFIRMACOES OBRIGATORIAS\n');
    log('Confirmacao 1/2: Voce testou PESSOALMENTE o sistema em Staging?');
    log('  URL: https://novo-sistema-agt-staging.vercel.app\n');
    const t=await ask(rl,'  A atualizacao foi testada e aprovada por voce? (s/n): ');
    if(t.trim().toLowerCase()!=='s'){ warn('\nCancelado. Teste em Staging primeiro.\n'); process.exit(0); }
    log('OK: Confirmacao de testes pessoais recebida.');

    // CONFIRMACAO 2: Texto exato
    log('\n'+sep('-'));
    log('Confirmacao 2/2: CONFIRMACAO FINAL — PRODUCAO OFICIAL');
    log(sep('-'));
    log(`\n  Release:              ${manifest.release_id}`);
    log(`  Commit Aprovado:      ${manifest.commit_sha}`);
    log(`  Migrations a aplicar: ${pendingInProd.length}`);
    log(`  Ambiente:             PRODUCAO (dados reais)\n`);
    log('  Digite exatamente para confirmar:');
    log('  CONFIRMAR PRODUCAO\n');
    const c=await ask(rl,'  > ');
    if(c.trim()!=='CONFIRMAR PRODUCAO'){ warn('\nTexto incorreto. Cancelado.\n'); process.exit(0); }
    log('\nCONFIRMACOO MANUAL RECEBIDA. Iniciando promocao controlada...\n');

    // EXECUCAO
    hdr('PASSO 1/3 — MIGRATIONS NO SUPABASE PRODUCAO');
    await applyMigrationsToProd(pendingInProd);

    hdr('PASSO 2/3 — PROMOCAO DO CODIGO PARA main');
    await promoteCodeToMain(manifest);

    hdr('PASSO 3/3 — ARQUIVANDO RELEASE');
    manifest.status='PROMOTED';
    manifest.promotion={ promoted_at:new Date().toISOString(), promoted_by:manifest.approval.approved_by, production_commit_sha:manifest.commit_sha, migrations_applied:pendingInProd, dry_run:isDryRun };
    if(!isDryRun){
      saveManifest(manifest);
      if(!fs.existsSync(RELEASES_DIR)) fs.mkdirSync(RELEASES_DIR,{recursive:true});
      fs.writeFileSync(path.join(RELEASES_DIR,`${manifest.release_id}.json`),JSON.stringify(manifest,null,2),'utf8');
      log(`Arquivado em: releases/${manifest.release_id}.json`);
    } else log('[DRY RUN] Manifesto nao alterado.');

    hdr('PROMOCAO CONCLUIDA COM SUCESSO!');
    log(`Release:  ${manifest.release_id}`);
    log(`Commit:   ${manifest.commit_sha}`);
    log(`Vercel:   https://novo-sistema-agt.vercel.app`);
    log('\nProximos passos:');
    log('  1. Aguardar deploy Vercel (~2 min)');
    log('  2. Validar: login, APIs, modulos principais');
    log('  3. Se falhar: NAO fazer rollback automatico — avalie manualmente\n');
  } finally { rl.close(); }
}

main().catch(e=>{ err(`Erro: ${e.message}`); process.exit(1); });
