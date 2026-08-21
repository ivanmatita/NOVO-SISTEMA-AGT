import { getAdminClient } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getAdminClient(req);

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('locais_trabalho')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      console.error('[API-LOCAIS] Erro GET:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const { data, error } = await supabase
        .from('locais_trabalho')
        .insert([{
          nome: body.nome,
          codigo: body.codigo || null,
          endereco: body.endereco || null,
          telefone: body.telefone || null,
          responsavel: body.responsavel || null,
          empresa_id: body.empresa_id || null,
          is_active: body.is_active !== false
        }])
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    } catch (err) {
      console.error('[API-LOCAIS] Erro POST:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
