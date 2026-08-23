/**
 * api/auth/me.js
 * Retorna o utilizador atual, perfil e contexto da empresa
 */

import { setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await authenticateRequest(req);

  if (!auth.authenticated) {
    return res.status(401).json({
      success: false,
      error: auth.error,
      message: auth.message
    });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      created_at: auth.user.created_at
    },
    perfil: auth.perfil,
    empresa_id: auth.empresa_id,
    isSuperAdmin: auth.isSuperAdmin
  });
}
