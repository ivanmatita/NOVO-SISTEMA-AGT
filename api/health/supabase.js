/**
 * api/health/supabase.js
 * Endpoint de diagnóstico seguro da conexão ao Supabase.
 * NUNCA retorna tokens, chaves secretas ou credenciais.
 */

import { getEnvConfig, setCORS } from '../_env.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);

  const checks = {
    server: "ok",
    supabaseUrl: config.supabaseUrl ? "configured" : "missing",
    anonKey: config.anonKey ? "configured" : "missing",
    serviceRole: config.serviceRoleKey ? "configured" : "missing",
    databaseConnection: "checking",
    authService: "checking"
  };

  try {
    // 1. Testar conexão REST à BD
    const dbRes = await fetch(`${config.supabaseUrl}/rest/v1/exercicios_fiscais?select=id&limit=1`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });
    checks.databaseConnection = dbRes.ok ? "ok" : `failed_http_${dbRes.status}`;

    // 2. Testar serviço de Auth
    const authRes = await fetch(`${config.supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': config.anonKey
      }
    });
    checks.authService = authRes.ok ? "ok" : `failed_http_${authRes.status}`;

    const isAllOk = checks.databaseConnection === "ok" && checks.authService === "ok";

    return res.status(isAllOk ? 200 : 503).json({
      success: isAllOk,
      environment: config.environment,
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    checks.databaseConnection = `error: ${err.message}`;
    return res.status(500).json({
      success: false,
      environment: config.environment,
      checks,
      timestamp: new Date().toISOString()
    });
  }
}
