/**
 * api/_handlers/user-activities.js
 * Handler Serverless de Gestão de Atividades e Métricas de Desempenho.
 * Suporta:
 *  - GET /api/user-activities/history  (Filas e registos de comportamento dos utilizadores)
 *  - GET /api/user-activities/stats    (Estatísticas globais e Top Utilizadores / Leaderboard)
 *  - POST /api/user-activities/heartbeat (Heartbeat de sessão e monitorização em tempo real)
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEnvConfig(req);
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const host = req.headers?.host || 'localhost';
    let pathname = '';
    try {
      const parsedUrl = new URL(req.url || '', `http://${host}`);
      pathname = parsedUrl.pathname;
    } catch (e) {
      pathname = req.url || '';
    }

    const targetEmpresaId = auth.empresa_id;
    if (!targetEmpresaId) {
      if (pathname.includes('stats')) {
        return res.status(200).json({
          totalLogins: 0,
          totalTempoSegundos: 0,
          totalMovimentos: 0,
          totalInsercoes: 0,
          totalTarefas: 0,
          topPerformers: []
        });
      }
      return res.status(200).json([]);
    }

    const authHeader = `Bearer ${config.serviceRoleKey}`;

    // ─── 1. HISTÓRICO DE ATIVIDADES: /api/user-activities/history ─────────────
    if (req.method === 'GET' && (pathname.includes('history') || pathname.endsWith('/history'))) {
      const isManager = Boolean(
        auth.isSuperAdmin ||
        auth.isCompanyAdmin ||
        auth.perfil?.is_admin ||
        ['admin', 'proprietario', 'superadmin', 'super_admin', 'admin_empresa', 'gerente'].includes((auth.perfil?.role || '').toLowerCase()) ||
        Number(auth.perfil?.level || 0) >= 5
      );

      let queryUrl = `${config.supabaseUrl}/rest/v1/user_activities_sessions?empresa_id=eq.${targetEmpresaId}&select=*&order=data_entrada.desc&limit=400`;
      if (!isManager && auth.user?.id) {
        queryUrl += `&or=(utilizador_id.eq.${auth.user.id},user_id.eq.${auth.user.id})`;
      }

      const dbRes = await fetch(queryUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      if (!dbRes.ok) {
        console.warn('[user-activities] Erro ao consultar histórico:', dbRes.status);
        return res.status(200).json([]);
      }

      const rows = await dbRes.json();
      return res.status(200).json(Array.isArray(rows) ? rows : []);
    }

    // ─── 2. ESTATÍSTICAS E LEADERBOARD: /api/user-activities/stats ─────────────
    if (req.method === 'GET' && (pathname.includes('stats') || pathname.endsWith('/stats'))) {
      const queryUrl = `${config.supabaseUrl}/rest/v1/user_activities_sessions?empresa_id=eq.${targetEmpresaId}&select=*&limit=1000`;
      const dbRes = await fetch(queryUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });

      const fallbackStats = {
        totalLogins: 0,
        totalTempoSegundos: 0,
        totalMovimentos: 0,
        totalInsercoes: 0,
        totalTarefas: 0,
        topPerformers: []
      };

      if (!dbRes.ok) {
        console.warn('[user-activities] Erro ao consultar estatísticas:', dbRes.status);
        return res.status(200).json(fallbackStats);
      }

      const rows = await dbRes.json();
      const sessions = Array.isArray(rows) ? rows : [];

      let totalTempoSegundos = 0;
      let totalMovimentos = 0;
      let totalInsercoes = 0;
      let totalTarefas = 0;
      const performMap = {};

      sessions.forEach((s) => {
        totalTempoSegundos += Number(s.tempo_ativo_segundos || s.duracao || 0);
        totalMovimentos += Number(s.movimentos || 0);
        totalInsercoes += Number(s.insercoes || 0);
        totalTarefas += Number(s.tarefas_concluidas || 0);

        const email = s.email || 'Utilizador Geral';
        if (!performMap[email]) {
          performMap[email] = {
            email,
            logins: 0,
            tempo: 0,
            movimentos: 0,
            insercoes: 0,
            tarefas: 0
          };
        }
        performMap[email].logins += 1;
        performMap[email].tempo += Number(s.tempo_ativo_segundos || s.duracao || 0);
        performMap[email].movimentos += Number(s.movimentos || 0);
        performMap[email].insercoes += Number(s.insercoes || 0);
        performMap[email].tarefas += Number(s.tarefas_concluidas || 0);
      });

      const topPerformers = Object.values(performMap).map((p) => {
        const activeMinutes = p.tempo / 60;
        const score = Math.floor(
          p.movimentos * 0.05 + p.insercoes * 1.5 + p.tarefas * 3 + activeMinutes * 0.2
        );
        return {
          ...p,
          score
        };
      }).sort((a, b) => b.score - a.score);

      return res.status(200).json({
        totalLogins: sessions.length,
        totalTempoSegundos,
        totalMovimentos,
        totalInsercoes,
        totalTarefas,
        topPerformers
      });
    }

    // ─── 3. HEARTBEAT DE SESSÃO: /api/user-activities/heartbeat ────────────────
    if (req.method === 'POST' && pathname.includes('heartbeat')) {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const sessionId = body.sessionId || body.id;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId é obrigatório' });
      }

      const isLogout = body.status === 'finalizado' || body.isLogout === true;
      const nowIso = new Date().toISOString();

      const sessionPayload = {
        id: sessionId,
        empresa_id: targetEmpresaId,
        utilizador_id: auth.user.id,
        user_id: auth.user.id,
        email: auth.user.email,
        tempo_ativo_segundos: Number(body.tempo_ativo_segundos || body.duracao || 0),
        movimentos: Number(body.movements || body.movimentos || 0),
        insercoes: Number(body.insercoes || 0),
        tarefas_concluidas: Number(body.tarefas_concluidas || body.tarefas || 0),
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Local',
        navegador: req.headers['user-agent'] || '',
        ultimo_clique: nowIso,
        status: isLogout ? 'finalizado' : 'ativo'
      };

      if (isLogout) {
        sessionPayload.data_saida = nowIso;
      }

      // Upsert via PostgREST
      const upsertRes = await fetch(`${config.supabaseUrl}/rest/v1/user_activities_sessions`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify([sessionPayload])
      });

      if (!upsertRes.ok) {
        // Tentar PATCH simples
        await fetch(`${config.supabaseUrl}/rest/v1/user_activities_sessions?id=eq.${sessionId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sessionPayload)
        }).catch(() => {});
      }

      return res.status(200).json({ success: true, sessionId });
    }

    // Default fallback
    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[user-activities] Erro no handler:', err);
    return res.status(500).json({ error: err.message });
  }
}
