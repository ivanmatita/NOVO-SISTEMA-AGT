import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const empresa_id = 'ecaf8701-4b54-4ab9-bad2-09f582ed3d09';

async function run() {
  console.log("Simulating GET /api/system-users for company:", empresa_id);
  
  // 1. Fetch from perfis
  let { data: perfisList, error: errorPerfis } = await supabaseAdmin
      .from('perfis')
      .select('*')
      .eq('empresa_id', empresa_id);
  
  console.log("perfisList count:", perfisList?.length);
  console.log("perfisList:", perfisList);

  // 2. Fetch from system_users
  let { data: sysUsersListA, error: errorSysA } = await supabaseAdmin
      .from('system_users')
      .select('*')
      .eq('empresa_id', empresa_id);
  
  console.log("sysUsersListA count:", sysUsersListA?.length);
  console.log("sysUsersListA:", sysUsersListA);

  const sysMap = new Map<string, any>();
  for (const s of [...(sysUsersListA || [])]) {
      if (s?.id && !sysMap.has(String(s.id))) sysMap.set(String(s.id), s);
  }
  const sysUsersList = Array.from(sysMap.values());
  let finalPerfisList = perfisList;
  
  const sysUsersDataMap = new Map();
  if (sysUsersList) {
      sysUsersList.forEach((su: any) => {
          sysUsersDataMap.set(String(su.id), su);
      });
  }

  const mappedList = finalPerfisList ? finalPerfisList.map((p: any) => {
      const su = sysUsersDataMap.get(String(p.id)) || {};
      return {
          ...su,
          ...p, 
          name: p.nome || su.name || p.name,
          company_id: p.empresa_id || p.company_id || su.company_id,
          empresa_id: p.empresa_id || p.company_id || su.company_id,
          permission_areas: p.permission_areas || su.permission_areas || [],
          level: p.level !== undefined ? p.level : (su.level !== undefined ? su.level : (p.role === 'admin' ? 10 : 1)),
          contact: p.contact || su.contact || '',
          morada: p.morada || su.morada || '',
          validade: p.validade || su.validade || su.date || '',
          profession: p.profession || su.profession || '',
          username: p.username || su.username || ''
      };
  }) : [];

  if (sysUsersList) {
      const perfisIds = new Set((finalPerfisList || []).map((p: any) => String(p.id)));
      sysUsersList.forEach((su: any) => {
          if (!perfisIds.has(String(su.id))) {
              mappedList.push({
                  ...su,
                  name: su.name,
                  company_id: su.company_id,
                  empresa_id: su.company_id,
                  permission_areas: su.permission_areas || [],
                  level: su.level || 1,
                  contact: su.contact || '',
                  morada: su.morada || '',
                  validade: su.validade || su.date || '',
                  profession: su.profession || '',
                  username: su.username || ''
              });
          }
      });
  }
  
  const seenIds = new Set();
  const uniqueUsers: any[] = [];
  for (const u of mappedList) {
      if (u && u.id && !seenIds.has(u.id)) {
          seenIds.add(u.id);
          uniqueUsers.push(u);
      }
  }

  console.log("uniqueUsers count:", uniqueUsers.length);
  console.log("uniqueUsers list:", JSON.stringify(uniqueUsers, null, 2));
}

run();
