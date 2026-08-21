import { getAdminClient, getUserFromRequest } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getAdminClient(req);
  const user = await getUserFromRequest(req);

  if (req.method === 'GET') {
    try {
      let query = supabase.from('exercicios_fiscais').select('*').order('ano', { ascending: false });
      
      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data || []);
    } catch (err) {
      console.error('[API-EXERCICIOS] Erro:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { ano, data_inicio, data_fim, empresa_id, status } = req.body || {};
      const { data, error } = await supabase
        .from('exercicios_fiscais')
        .insert([{
          ano: parseInt(ano, 10),
          data_inicio,
          data_fim,
          empresa_id: empresa_id || null,
          status: status || 'aberto',
          is_closed: false
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error('[API-EXERCICIOS] Erro POST:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
