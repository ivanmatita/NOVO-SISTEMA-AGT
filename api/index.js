/**
 * api/index.js
 * Roteador Serverless Unificado para Vercel (Hobby Plan Compliant: 1 Serverless Function).
 * Encaminha todas as chamadas /api/* para os respetivos handlers isolados em api/_handlers/.
 * Preserva 100% dos contratos de API, isolamento multi-tenant e segurança.
 */

import { setCORS } from './_env.js';
import authSaasHandler from './_handlers/auth-saas.js';
import configEmpresaHandler from './_handlers/config-empresa.js';
import crmHandler from './_handlers/crm.js';
import exerciciosFiscaisHandler from './_handlers/exercicios-fiscais.js';
import healthHandler from './_handlers/health.js';
import invoicesHandler from './_handlers/invoices.js';
import licencasHandler from './_handlers/licencas.js';
import migracaoHandler from './_handlers/migracao.js';
import posHandler from './_handlers/pos.js';
import secureClientesHandler from './_handlers/secure-clientes.js';
import secureFornecedoresHandler from './_handlers/secure-fornecedores.js';
import secureLocaisTrabalhoHandler from './_handlers/secure-locais-trabalho.js';
import systemUsersHandler from './_handlers/system-users.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers?.host || 'localhost';
  let pathname = '';
  try {
    const parsedUrl = new URL(req.url || '', `http://${host}`);
    pathname = parsedUrl.pathname;
  } catch (e) {
    pathname = req.url || '';
  }

  // 1. Autenticação e Onboarding SaaS
  if (pathname.startsWith('/api/auth') || pathname === '/api/auth') {
    return authSaasHandler(req, res);
  }

  // 2. CRM Global (Exclusivo Super Admin / Imatec Angola)
  if (pathname.startsWith('/api/crm') || pathname === '/api/crm') {
    return crmHandler(req, res);
  }

  // 3. Clientes (Multi-tenant Seguro)
  if (pathname.startsWith('/api/secure-clientes') || pathname === '/api/secure-clientes') {
    return secureClientesHandler(req, res);
  }

  // 4. Fornecedores (Multi-tenant Seguro)
  if (pathname.startsWith('/api/secure-fornecedores') || pathname === '/api/secure-fornecedores') {
    return secureFornecedoresHandler(req, res);
  }

  // 5. Locais de Trabalho (Multi-tenant Seguro)
  if (pathname.startsWith('/api/secure-locais-trabalho') || pathname === '/api/secure-locais-trabalho') {
    return secureLocaisTrabalhoHandler(req, res);
  }

  // 6. Faturação e Documentos Fiscais
  if (pathname.startsWith('/api/invoices') || pathname === '/api/invoices') {
    return invoicesHandler(req, res);
  }

  // 7. POS, Caixas, Pontos de Venda e Centros de Custo
  if (
    pathname.startsWith('/api/pos') ||
    pathname.startsWith('/api/pos-points') ||
    pathname.startsWith('/api/cost-centers') ||
    pathname.startsWith('/api/caixa-movements') ||
    pathname.startsWith('/api/pos-user-configs')
  ) {
    return posHandler(req, res);
  }

  // 8. Configurações da Empresa
  if (pathname.startsWith('/api/config-empresa') || pathname === '/api/config-empresa') {
    return configEmpresaHandler(req, res);
  }

  // 9. Exercícios Fiscais
  if (pathname.startsWith('/api/exercicios-fiscais') || pathname === '/api/exercicios-fiscais') {
    return exerciciosFiscaisHandler(req, res);
  }

  // 10. Utilizadores da Empresa
  if (pathname.startsWith('/api/system-users') || pathname === '/api/system-users') {
    return systemUsersHandler(req, res);
  }

  // 11. Licenças SaaS
  if (pathname.startsWith('/api/licencas') || pathname === '/api/licencas') {
    return licencasHandler(req, res);
  }

  // 12. Migração de Empresas (Staging -> Produção)
  if (pathname.startsWith('/api/migracao') || pathname === '/api/migracao') {
    return migracaoHandler(req, res);
  }

  // 13. Health check e métricas / estatísticas
  if (pathname === '/api/health' || pathname.startsWith('/api/health') || pathname === '/api/stats') {
    return healthHandler(req, res);
  }

  // Fallback para health / 404 seguro
  return healthHandler(req, res);
}
