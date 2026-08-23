/**
 * api/health.js
 * Endpoint de diagnóstico de saúde do servidor
 */

import { getEnvConfig, setCORS } from './_env.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);

  return res.status(200).json({
    success: true,
    environment: config.environment,
    server: "running",
    agtMode: config.agtMode,
    timestamp: new Date().toISOString()
  });
}
