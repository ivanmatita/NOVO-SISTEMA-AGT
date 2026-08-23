import { getEnvConfig, setCORS } from './_env.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);
  return res.status(200).json({
    status: 'ok',
    mode: config.environment,
    live: true,
    supabaseConfigured: !!config.supabaseUrl,
    timestamp: new Date().toISOString()
  });
}
