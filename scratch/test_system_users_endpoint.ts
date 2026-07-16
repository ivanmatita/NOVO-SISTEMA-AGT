import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  const empresa_id = 'f2cac9f4-a0f1-4ce0-b173-37770c24e01f'; // Imatec Angola ID
  console.log("Simulating system-users endpoint for empresa_id:", empresa_id);

  let { data: perfisList, error: errorPerfis } = await supabase
      .from('perfis')
      .select('*')
      .eq('empresa_id', empresa_id);
  console.log("perfisList count:", perfisList?.length, "error:", errorPerfis);

  let { data: sysUsersListA, error: errorSysA } = await supabase
      .from('system_users')
      .select('*')
      .eq('empresa_id', empresa_id);
  console.log("sysUsersListA count:", sysUsersListA?.length, "error:", errorSysA);

  let sysUsersListB: any[] = [];
  try {
      const res2 = await supabase
          .from('system_users')
          .select('*')
          .eq('company_id', empresa_id);
      sysUsersListB = res2.data || [];
  } catch(e: any) {
      console.log("sysUsersListB error (expected if company_id column missing):", e.message);
  }
  console.log("sysUsersListB count:", sysUsersListB?.length);

  const sysMap = new Map<string, any>();
  for (const s of [...(sysUsersListA || []), ...(sysUsersListB || [])]) {
      if (s?.id && !sysMap.has(String(s.id))) sysMap.set(String(s.id), s);
  }
  const sysUsersList = Array.from(sysMap.values());

  const sysUsersDataMap = new Map();
  if (sysUsersList) {
      sysUsersList.forEach((su: any) => {
          sysUsersDataMap.set(String(su.id), su);
      });
  }

  const mappedList = perfisList ? perfisList.map((p: any) => {
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
      const perfisIds = new Set((perfisList || []).map((p: any) => String(p.id)));
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

  console.log("=== FINAL uniqueUsers ===");
  console.log(JSON.stringify(uniqueUsers, null, 2));
}

run();
