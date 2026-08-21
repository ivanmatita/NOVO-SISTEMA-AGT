import { getAdminClient, getUserFromRequest } from '../_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const supabase = getAdminClient(req);

  try {
    const { data: perfil, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      user,
      perfil: perfil || { id: user.id, email: user.email, role: 'admin' }
    });
  } catch (err) {
    return res.status(200).json({
      user,
      perfil: { id: user.id, email: user.email, role: 'admin' }
    });
  }
}
