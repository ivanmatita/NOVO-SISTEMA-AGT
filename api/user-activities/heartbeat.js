import { setCORS } from '../_env.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  return res.status(200).json({
    status: 'ok',
    alive: true,
    timestamp: new Date().toISOString()
  });
}
