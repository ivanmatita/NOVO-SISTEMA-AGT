/**
 * api/auth/email-by-username.js
 * Resolve email a partir do username para login seguro
 */

import { setCORS } from '../_env.js';
import { getAdminClient } from '../_supabase.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { username } = req.query || {};
    const cleanUsername = (username || '').trim().toLowerCase();

    if (!cleanUsername) {
      return res.status(400).json({ error: 'Username não especificado.' });
    }

    const adminClient = getAdminClient(req);
    const { data: perfil, error } = await adminClient
      .from('perfis')
      .select('email')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (error || !perfil || !perfil.email) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    return res.status(200).json({ email: perfil.email });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
