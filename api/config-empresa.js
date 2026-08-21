import { getAdminClient, getUserFromRequest } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getAdminClient(req);

  if (req.method === 'GET') {
    try {
      const { data: configs, error } = await supabase.from('config_empresa').select('*').limit(1);
      if (error) {
        // Fallback to empresas table
        const { data: emp } = await supabase.from('empresas').select('*').limit(1).single();
        return res.status(200).json(emp || { nome_empresa: 'IMATEC SOFT', nif: '5000000000' });
      }
      return res.status(200).json(configs?.[0] || {});
    } catch (err) {
      console.error('[API-CONFIG] Erro:', err.message);
      return res.status(200).json({ nome_empresa: 'IMATEC SOFT' });
    }
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      const payload = req.body || {};
      const { data, error } = await supabase
        .from('config_empresa')
        .upsert([payload])
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
