import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

import compression from "compression";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import crypto from "crypto";

// Carregar variáveis de ambiente do ficheiro .env
dotenv.config();

// --- Supabase Admin (Bypasses Rate Limits) ---
const rawSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawSupabaseUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const supabaseServiceRole = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

// Verificação de segurança para o Supabase Admin
const isServiceKeyValid = supabaseServiceRole && supabaseServiceRole.length > 50;

const supabaseAdmin = (supabaseUrl && isServiceKeyValid) 
  ? createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

if (!supabaseAdmin) {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY não detetada ou inválida. O bypass de Rate Limit do Registo não funcionará.");
}

const DB_FILE = path.join(process.cwd(), "db.json");

const loadData = () => {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn("Aviso Vercel: db.json não persistirá entre sessões serverless. Use Supabase para produção.", e);
  }
  return null;
};

const savedData = loadData();

// --- In-Memory Database (No Supabase, No SQL) ---
const generateId = () => Date.now() + Math.floor(Math.random() * 1000000);
const generateStrId = () => (Date.now() + Math.floor(Math.random() * 1000000)).toString();

let clients: any[] = savedData?.clients || [];
let products: any[] = savedData?.products || [];
let issuedDocuments: any[] = savedData?.issuedDocuments || [];
let workSites: any[] = savedData?.workSites || [];
let workSiteMovements: any[] = savedData?.workSiteMovements || [];
let employees: any[] = savedData?.employees || [];
let fiscalSeries: any[] = savedData?.fiscalSeries || [
  { id: 1, name: 'Série 2026', user_id: '1', type: 'normal', reference: 'S', counters: {}, year: 2026, is_active: true, data_inicio: '2026-01-01', destino: 'Vendas Sede' }
];
let caixas: any[] = savedData?.caixas || [];
let costCenters: any[] = savedData?.costCenters || [];
let posPoints: any[] = savedData?.posPoints || [{ id: 1, name: 'POS Principal', is_active: true }];
let sessions: any[] = savedData?.sessions || [];
let posSales: any[] = savedData?.posSales || [];
let caixaMovements: any[] = savedData?.caixaMovements || [];
let warehouses: any[] = savedData?.warehouses || [];
let systemUsers: any[] = savedData?.systemUsers || [];
let archives: any[] = savedData?.archives || [];
let fleetVehicles: any[] = savedData?.fleetVehicles || [];
let projectTasks: any[] = savedData?.projectTasks || [];
let companies: any[] = savedData?.companies || [
  { id: '11111111-1111-1111-1111-111111111111', name: 'FaturaPronta Lda', nif: '500123456', address: 'Luanda, Angola', regime: 'Geral', coordinates: '', logo: '', footer: 'Processado por computador' }
];

let stockMovements: any[] = savedData?.stockMovements || [];
let securityOccurrences: any[] = savedData?.securityOccurrences || [];
let securityArmory: any[] = savedData?.securityArmory || [];
let securityRoster: any[] = savedData?.securityRoster || [];
let transactions: any[] = savedData?.transactions || [];
let receipts: any[] = savedData?.receipts || [];
let accountingJournals: any[] = savedData?.accountingJournals || [
  { id: '0000', name: 'Abertura', movementsCount: 26, type: 'Nativo Sistema', obs: '' },
  { id: '0001', name: 'Vendas', movementsCount: 67, type: 'Systema', obs: '' },
  { id: '0002', name: 'Compras', movementsCount: 540, type: 'Systema', obs: '' },
  { id: '0003', name: 'Imobilizado', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0004', name: 'Caixa', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0005', name: 'Bancos', movementsCount: 42, type: 'Systema', obs: '' },
  { id: '0006', name: 'Fecho do Periodo', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '0007', name: 'Fecho de Contas', movementsCount: 0, type: 'Systema', obs: '' },
  { id: '9993', name: 'Imobilizado', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9994', name: 'Impostos e Taxas', movementsCount: 24, type: 'Nativo Sistema', obs: '' },
  { id: '9995', name: 'Apuramento IVA Mensal', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9996', name: 'Salários', movementsCount: 384, type: 'Nativo Sistema', obs: '' },
  { id: '9997', name: 'Regularização do Periodo de Tributação', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9998', name: 'Movimentos de Ajustamento', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: '9999', name: 'Apuramento de Resultados', movementsCount: 0, type: 'Nativo Sistema', obs: '' },
  { id: 'Impost', name: 'Impostos e Taxas', movementsCount: 0, type: 'Nativo Sistema', obs: 'Diário utilizado para registo impostos e taxa' },
  { id: 'Sal', name: 'Salários', movementsCount: 0, type: 'Nativo Sistema', obs: 'Diário utilizado para registo do processamento de' },
];
let accountingMovements: any[] = savedData?.accountingMovements || [];
let pgcAccounts: any[] = savedData?.pgcAccounts || [
  { id: '01', type: 'GR', description: 'Meios Fixos e Investimentos', justification: '', layout: '' },
  { id: '02', type: 'GR', description: 'Existências', justification: '', layout: '' },
  { id: '03', type: 'GR', description: 'Terceiros', justification: '', layout: '' },
  { id: '04', type: 'GR', description: 'Meios Monetários', justification: '', layout: '' },
  { id: '05', type: 'GR', description: 'Capital e Reservas', justification: '', layout: '' },
  { id: '06', type: 'GR', description: 'Proveitos por Natureza', justification: '', layout: '' },
  { id: '07', type: 'GR', description: 'Custos por Natureza', justification: '', layout: '' },
  { id: '08', type: 'GR', description: 'Resultados', justification: '', layout: '' },
  { id: '11', type: 'GA', description: 'IMOBILIZAÇÕES CORPOREAS', justification: '', layout: '' },
  { id: '11.01', type: 'GA', description: 'Terrenos e recursos naturais', justification: '', layout: '' },
  { id: '11.01.01', type: 'GM', description: 'Terrenos em bruto', justification: '', layout: '' },
  { id: '11.05', type: 'GA', description: 'Equipamentos Administrativos', justification: '', layout: '' },
  { id: '11.05.03', type: 'GM', description: 'Cadeiras', justification: '', layout: '' },
];
let suppliers: any[] = savedData?.suppliers || [];
let purchases: any[] = savedData?.purchases || [];
let professions: any[] = savedData?.professions || [];
let attendance: any[] = savedData?.attendance || [];
let absences: any[] = savedData?.absences || [];
let laborTerminations: any[] = savedData?.laborTerminations || [];
let contracts: any[] = savedData?.contracts || [];

// --- Supabase Persistence Layer (Cloud Sync) ---
let isInitialLoadComplete = false;
let syncPromise: Promise<void> | null = null;

async function syncFromSupabase(): Promise<void> {
  if (!supabaseAdmin) return;
  if (isInitialLoadComplete) return;

  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      console.log("[Supabase Persistence] Tentando carregar db.json da Storage...");
      const { data, error } = await supabaseAdmin
        .storage
        .from('system-data')
        .download('db.json');

      if (error) {
        const errMsg = (error.message || '').toLowerCase();
        const status = (error as any).status || (error as any).statusCode;
        if (
          errMsg.includes('object not found') || 
          errMsg.includes('bucket not found') || 
          errMsg.includes('does not exist') ||
          status === 404 ||
          status === 400
        ) {
           console.log("[Supabase Persistence] db.json ou bucket 'system-data' não encontrado. Tentando criar o bucket...");
           try {
              const { error: createError } = await supabaseAdmin.storage.createBucket('system-data', { public: false });
              if (createError) {
                console.warn("[Supabase Persistence] Erro ao criar o bucket automaticamente:", createError.message);
              } else {
                console.log("[Supabase Persistence] Bucket 'system-data' criado/verificado com sucesso.");
              }
           } catch (createErr: any) {
              console.warn("[Supabase Persistence] Exceção ao tentar criar o bucket:", createErr.message || createErr);
           }
           console.log("[Supabase Persistence] Usando estado inicial local.");
           isInitialLoadComplete = true;
           return;
        }
        throw error;
      }
      
      const content = await data.text();
      const json = JSON.parse(content);
      
      // Sync to memory
      if (json.clients) clients = json.clients;
      if (json.products) products = json.products;
      if (json.issuedDocuments) issuedDocuments = json.issuedDocuments;
      if (json.workSites) workSites = json.workSites;
      if (json.workSiteMovements) workSiteMovements = json.workSiteMovements;
      if (json.employees) employees = json.employees;
      if (json.fiscalSeries) fiscalSeries = json.fiscalSeries;
      if (json.caixas) caixas = json.caixas;
      if (json.costCenters) costCenters = json.costCenters;
      if (json.posPoints) posPoints = json.posPoints;
      if (json.sessions) sessions = json.sessions;
      if (json.posSales) posSales = json.posSales;
      if (json.caixaMovements) caixaMovements = json.caixaMovements;
      if (json.warehouses) warehouses = json.warehouses;
      if (json.systemUsers) systemUsers = json.systemUsers;
      if (json.archives) archives = json.archives;
      if (json.fleetVehicles) fleetVehicles = json.fleetVehicles;
      if (json.projectTasks) projectTasks = json.projectTasks;
      if (json.companies) companies = json.companies;
      if (json.stockMovements) stockMovements = json.stockMovements;
      if (json.securityOccurrences) securityOccurrences = json.securityOccurrences;
      if (json.securityArmory) securityArmory = json.securityArmory;
      if (json.securityRoster) securityRoster = json.securityRoster;
      if (json.transactions) transactions = json.transactions;
      if (json.receipts) receipts = json.receipts;
      if (json.suppliers) suppliers = json.suppliers;
      if (json.purchases) purchases = json.purchases;
      if (json.professions) professions = json.professions;
      if (json.attendance) attendance = json.attendance;
      if (json.absences) absences = json.absences;
      if (json.laborTerminations) laborTerminations = json.laborTerminations;
      if (json.contracts) contracts = json.contracts;
      if (json.accountingJournals) accountingJournals = json.accountingJournals;
      if (json.accountingMovements) accountingMovements = json.accountingMovements;
      if (json.pgcAccounts) pgcAccounts = json.pgcAccounts;

      console.log("[Supabase Persistence] Dados sincronizados com sucesso.");
      isInitialLoadComplete = true;
    } catch (err: any) {
      console.warn("[Supabase Persistence] Erro ao sincronizar:", err.message || err);
      const errMsg = (err?.message || String(err)).toLowerCase();
      if (errMsg.includes('bucket not found') || errMsg.includes('storage') || errMsg.includes('not found') || (err as any)?.__isStorageError) {
        console.log("[Supabase Persistence] Tratamento de fallback de erro de storage ativado. Tentando criar bucket...");
        try {
          await supabaseAdmin.storage.createBucket('system-data', { public: false });
          console.log("[Supabase Persistence] Bucket 'system-data' criado como fallback.");
        } catch (e) {}
      }
      isInitialLoadComplete = true; // Evitar travar todo o resto em caso de falha de conexão
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

let pendingSave: Promise<any> = Promise.resolve();

const saveData = () => {
    // Chain the save operation to guarantee serialization and that we can wait on the latest operation
    pendingSave = pendingSave.then(async () => {
        const data = {
            clients, products, issuedDocuments, workSites, workSiteMovements,
            employees, fiscalSeries, caixas, caixaMovements, warehouses,
            systemUsers, archives, fleetVehicles, projectTasks, companies,
            stockMovements, securityOccurrences, securityArmory, securityRoster,
            transactions, receipts, suppliers, purchases, professions,
            attendance, absences, laborTerminations, contracts,
            costCenters, posPoints, sessions, posSales,
            accountingJournals, accountingMovements, pgcAccounts
        };
        
        // 1. Local attempt
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        } catch (e) {}

        // 2. Supabase Upload
        if (supabaseAdmin) {
            try {
                let { error } = await supabaseAdmin.storage
                    .from('system-data')
                    .upload('db.json', JSON.stringify(data, null, 2), {
                        upsert: true,
                        contentType: 'application/json'
                    });
                if (error) {
                    const errMsg = (error.message || '').toLowerCase();
                    if (errMsg.includes('bucket not found') || errMsg.includes('does not exist') || (error as any)?.__isStorageError) {
                        console.log("[Supabase Persistence] Bucket 'system-data' não encontrado ao salvar. Tentando criar...");
                        try {
                            const { error: createError } = await supabaseAdmin.storage.createBucket('system-data', { public: false });
                            if (!createError) {
                                // Tentar upload novamente
                                const { error: retryError } = await supabaseAdmin.storage
                                    .from('system-data')
                                    .upload('db.json', JSON.stringify(data, null, 2), {
                                        upsert: true,
                                        contentType: 'application/json'
                                    });
                                if (retryError) {
                                    console.error("[Supabase Persistence] Erro ao tentar salvar após criar o bucket:", retryError.message);
                                } else {
                                    console.log("[Supabase Persistence] Salvo com sucesso após criação automática do bucket.");
                                }
                            } else {
                                console.error("[Supabase Persistence] Erro ao criar bucket 'system-data':", createError.message);
                            }
                        } catch (e: any) {
                            console.error("[Supabase Persistence] Exceção ao criar bucket:", e.message || e);
                        }
                    } else {
                        console.error("[Supabase Persistence] Erro ao fazer cloud save:", error.message);
                    }
                }
            } catch (err: any) {
                console.error("Cloud Save Exception:", err.message || err);
            }
        }
    });
};

const app = express();
const PORT = 3000;

// Middleware to ensure data is loaded before processing requests
app.use(async (req, res, next) => {
  if (!isInitialLoadComplete && supabaseAdmin && req.path.startsWith('/api')) {
    await syncFromSupabase();
  }
  next();
});

// Middleware to guarantee that all preceding and current saveData operations are fully 
// persisted before returning the HTTP response. Essential to prevent Vercel Serverless Function freezes.
app.use((req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;
  let hasAwaited = false;

  res.json = function (obj) {
    if (hasAwaited) {
      return originalJson.call(this, obj);
    }
    hasAwaited = true;
    pendingSave.finally(() => {
      originalJson.call(this, obj);
    });
    return this;
  };

  res.send = function (body) {
    if (hasAwaited) {
      return originalSend.call(this, body);
    }
    hasAwaited = true;
    pendingSave.finally(() => {
      originalSend.call(this, body);
    });
    return this;
  };

  next();
});

async function startServer() {
  // Sync in background on startup (non-blocking to prevent serverless/Vercel timeouts)
  syncFromSupabase().catch(err => console.warn("[Background Sync] Failed on startup:", err));
  
  app.use(compression());
  app.use(express.json({ limit: '50mb' }));

  // --- Content Security Policy (CSP) ---
  app.use((req, res, next) => {
    const csp = [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: cdn.jsdelivr.net https://*.supabase.co",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss: https: blob:",
      "worker-src 'self' blob: data:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'"
    ].join("; ");
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // --- API Routes (Robust Mock) ---

  // --- Tenancy Repair & Admin Tools ---
  app.post("/api/admin/repair-tenancy", async (req, res) => {
    if (!supabaseAdmin) return res.status(500).json({ error: "Service role key missing" });

    try {
      console.log("[SERVER-ADMIN] Iniciando reparação global de tenacidade...");

      // 1. Obter todos os utilizadores auth
      const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers();
      if (usersErr) throw usersErr;

      const results = [];

      for (const authUser of users) {
        // Verificar se tem empresa
        const { data: company } = await supabaseAdmin
          .from('empresas')
          .select('id')
          .eq('auth_user_id', authUser.id)
          .maybeSingle();

        let companyId = company?.id;

        if (!companyId) {
          // Se não for dono, verificar se está num perfil
          const { data: profile } = await supabaseAdmin
            .from('perfis')
            .select('empresa_id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          companyId = profile?.empresa_id;
        }

        // Se ainda não tiver empresa, criar uma Empresa Padrão (Auto-Onboarding)
        if (!companyId) {
          console.warn(`[SERVER-ADMIN] Utilizador órfão detetado: ${authUser.email}. Criando empresa base...`);
          
          const newCompanyId = crypto.randomUUID();
          const { data: newCompany, error: createError } = await supabaseAdmin
            .from('empresas')
            .insert([{
              id: newCompanyId,
              auth_user_id: authUser.id,
              nome_empresa: `Empresa de ${authUser.email?.split('@')[0]}`,
              email: authUser.email,
              plano: 'trial'
            }])
            .select('id')
            .single();

          if (createError) {
            results.push({ email: authUser.email, status: 'error', error: `Falha ao criar empresa: ${createError.message}` });
            continue;
          }
          companyId = newCompany.id;
        }

        // Garantir Perfil e Metadata
        const { error: upsertErr } = await supabaseAdmin
          .from('perfis')
          .upsert({
            id: authUser.id,
            empresa_id: companyId,
            email: authUser.email,
            role: 'admin',
            nome: authUser.user_metadata?.full_name || authUser.email?.split('@')[0]
          }, { onConflict: 'id' });

        if (upsertErr) {
          results.push({ email: authUser.email, status: 'error', error: upsertErr.message });
        } else {
          // Atualizar Auth Metadata para permitir policy via JWT se o utilizador quiser
          await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            user_metadata: { ...authUser.user_metadata, empresa_id: companyId }
          });
          results.push({ email: authUser.email, status: 'fixed', companyId });
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("[SERVER-ADMIN] Falha na reparação:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/health", (req, res) => res.json({ status: "ok", mode: "offline" }));

  app.get("/api/auth/me", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing token" });
      }
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "No admin client available" });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
      
      if (userError || !user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Fetch without RLS
      const { data: perfil } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (perfil?.empresa_id) {
        const { data: empresa } = await supabaseAdmin
          .from('empresas')
          .select('*')
          .eq('id', perfil.empresa_id)
          .maybeSingle();
          
        return res.json({
          user: user,
          perfil: perfil,
          empresa: empresa
        });
      }

      // Fallback: look for empresa where user is owner
      const { data: legacyEmpresa } = await supabaseAdmin
        .from('empresas')
        .select('*')
        .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
        .maybeSingle();
        
      if (legacyEmpresa) {
        return res.json({
          user: user,
          perfil: { id: user.id, empresa_id: legacyEmpresa.id, role: 'admin' },
          empresa: legacyEmpresa
        });
      }

      return res.status(404).json({ error: "Profile not found" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/migrate-ativo", async (req, res) => {
    try {
      const sql = "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;";
      
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.rpc('query_exec', { query: sql });
        if (error) {
             console.error("RPC Error:", error);
             res.status(500).json({ error: error.message });
        } else {
             res.json({ status: "done" });
        }
      } else {
        res.status(500).json({ error: "No supabaseAdmin" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/run-fix", async (req, res) => {
    try {
      const sqlBuffer = fs.readFileSync(path.join(process.cwd(), 'FIX_RECURSION.sql'), 'utf-8');
      
      let errorStr = "";
      if (supabaseAdmin) {
        const { error } = await supabaseAdmin.rpc('query_exec', { query: sqlBuffer });
        if (error) { errorStr = JSON.stringify(error) || error.message; }
      } else {
        errorStr = "No supabaseAdmin available";
      }

      res.json({ status: "done", error: errorStr });
    } catch (e: any) {
      res.json({ error: e.message });
    }
  });

  // --- SaaS Registration (Bypassing Rate Limits) ---
  app.post("/api/auth/register-saas", async (req, res) => {
    if (!supabaseAdmin) {
      console.error("[SERVER-AUTH] Tentativa de registo sem SUPABASE_SERVICE_ROLE_KEY configurada.");
      return res.status(500).json({ 
        error: "Configuração Incompleta: A chave 'SUPABASE_SERVICE_ROLE_KEY' (Service Role) não foi configurada nas definições do servidor. Por favor, adicione-a no menu Definições para permitir registos sem limites de segurança." 
      });
    }

    const { email, password, formData } = req.body;

    try {
      console.log(`[SERVER-AUTH] Iniciando registo via Admin para: ${email}`);

      // 1. Criar Utilizador Auth (Admin Bypass)
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: formData.nome_administrador || formData.nome_empresa
        }
      });

      if (authError) {
        console.error("[SERVER-AUTH] Erro Auth Admin:", authError);
        
        // Se o erro for "Invalid API key" ou similar, avisamos especificamente
        if (authError.message.toLowerCase().includes('api key') || authError.status === 401 || authError.status === 403) {
          return res.status(401).json({ 
            error: "Erro de Autenticação Supabase: A 'SUPABASE_SERVICE_ROLE_KEY' fornecida é inválida. Certifique-se de que está a usar a 'service_role' (secreta) e não a 'anon' (pública) no servidor." 
          });
        }
        
        return res.status(authError.status || 400).json({ error: authError.message });
      }

      const userId = authUser.user.id;

      // 2. Criar Empresa (O Banco de Dados gera o ID automaticamente agora que aplicamos o SQL)
      const { data: company, error: companyError } = await supabaseAdmin
        .from('empresas')
        .insert([{
          auth_user_id: userId,
          nome_empresa: formData.nome_empresa,
          nif: formData.nif,
          email: email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          provincia: formData.provincia,
          municipio: formData.municipio,
          pais: formData.pais || 'Angola',
          tipo_empresa: formData.tipo_empresa,
          nome_administrador: formData.nome_administrador,
          plano: 'trial'
        }])
        .select('id')
        .single();

      if (companyError) {
        console.error("[SERVER-AUTH] Erro ao criar empresa admin:", companyError);
        // Tenta limpar o user criado se a empresa falhar (cleanup)
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Erro na Tabela Empresas: ${companyError.message}` });
      }

      // 3. Criar Perfil
      const { error: profileError } = await supabaseAdmin
        .from('perfis')
        .upsert({
          id: userId,
          empresa_id: company.id,
          email: email,
          nome: formData.nome_administrador || formData.nome_empresa,
          role: 'admin'
        });

      if (profileError) {
        console.error("[SERVER-AUTH] Erro ao criar perfil admin:", profileError);
        return res.status(400).json({ error: `Erro na Tabela Perfis: ${profileError.message}` });
      }

      console.log(`[SERVER-AUTH] Registo SaaS concluído com sucesso para ${email}`);
      res.json({ success: true, userId });
    } catch (err: any) {
      console.error("[SERVER-AUTH] Falha crítica no endpoint:", err);
      res.status(500).json({ error: "Erro interno no servidor de autenticação." });
    }
  });

  app.post("/api/login-local", (req, res) => {
    const { identifier, password } = req.body;
    // Simples bypass local: se for 'admin' ou tiver um email, permitimos com o demoUser
    const demoUser = {
      id: '00000000-0000-0000-0000-000000000000',
      username: identifier === 'admin' ? 'Administrador Demo' : identifier.split('@')[0],
      email: identifier.includes('@') ? identifier : 'demo@empresa.com',
      company_id: '11111111-1111-1111-1111-111111111111',
      role: 'admin',
      created_at: new Date().toISOString()
    };
    res.json(demoUser);
  });

  // Reports - Integrated with Supabase for SaaS Profit & Loss
  app.get("/api/reports/profit-loss", async (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    
    let docs = issuedDocuments;
    let trans = transactions;

    if (supabaseAdmin && empresa_id) {
       try {
         const { data: dbDocs } = await supabaseAdmin.from('documentos_emitidos').select('*').eq('empresa_id', empresa_id);
         if (dbDocs) docs = dbDocs;
         // Transactions still legacy for now, or we can add /compras if they exist in Supabase
       } catch (e) {
         console.error("[SERVER-REPORTS] Supabase error:", e);
       }
    }

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      
      // Calculate Revenue from certified documents for this month
      const monthDocs = docs.filter(d => {
        if (empresa_id && d.empresa_id !== empresa_id) return false;
        const dDate = new Date(d.date || d.created_at || d.data_emissao);
        return (d.is_certified || d.status === 'CERTIFICADO') && dDate.getFullYear() === year && (dDate.getMonth() + 1) === month;
      });

      const factS = monthDocs.reduce((acc, d) => acc + (Number(d.total || d.counter_value || 0) / 1.14), 0); // approx s/ imposto
      const impRec = factS * 0.14;
      
      // Calculate Costs from transactions (type: 'expense' or similar)
      const monthTransactions = trans.filter(t => {
        if (empresa_id && t.empresa_id !== empresa_id) return false;
        const tDate = new Date(t.date);
        return tDate.getFullYear() === year && (tDate.getMonth() + 1) === month;
      });

      const costs = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
      const wages = monthTransactions.filter(t => t.category === 'Salários').reduce((acc, t) => acc + Number(t.amount), 0);
      const inss = wages * 0.08;
      
      const totalCosts = costs + wages + inss;

      return {
        month,
        facturacaoSImposto: factS,
        impostoRecebido: impRec,
        facturacaoCImposto: factS + impRec,
        custosAceites: costs * 0.8,
        fornecedoresSImposto: costs * 1.0,
        ivaSuportado: costs * 0.14,
        salarios: wages,
        inss: inss,
        totaisCustos: totalCosts,
        margem: factS - totalCosts,
      };
    });

    res.json(monthsData);
  });
  // Stats - Integrated with Supabase for Real-time SaaS data
  app.get("/api/stats", async (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (!empresa_id) return res.status(400).json({ error: "empresa_id required" });

    // Use Supabase if Admin is available, otherwise fallback to memory
    if (supabaseAdmin) {
      try {
        const [docsRes, clientsRes, caixasRes] = await Promise.all([
          supabaseAdmin.from('documentos_emitidos')
            .select('*')
            .eq('empresa_id', empresa_id)
            .gte('created_at', `${year}-01-01T00:00:00Z`)
            .lte('created_at', `${year}-12-31T23:59:59Z`),
          supabaseAdmin.from('clientes')
            .select('id')
            .eq('empresa_id', empresa_id),
          supabaseAdmin.from('caixas').select('current_balance').eq('empresa_id', empresa_id)
        ]);

        const dbDocs = docsRes.data || [];
        const dbClientsCount = clientsRes.data?.length || 0;
        const dbCaixasTotal = (caixasRes.data || []).reduce((acc, c) => acc + (Number(c.current_balance) || 0), 0);

        return res.json({
          totalInvoiced: dbDocs.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0),
          pendingCount: dbDocs.filter(d => (d.status || d.estado_documento || '').toLowerCase() === 'pendente' || d.payment_status === 'pending').length,
          clientCount: dbClientsCount,
          totalExpenses: 0,
          cashBalance: dbCaixasTotal,
          recentInvoices: dbDocs.slice(-5).map(doc => ({
            id: doc.id,
            invoice_number: doc.numero_documento || doc.invoice_number,
            client_name: doc.cliente_nome || doc.client_name,
            total: doc.total,
            date: doc.data_emissao || doc.created_at
          }))
        });
      } catch (err) {
        console.error("[SERVER-STATS] Error fetching from Supabase:", err);
        // Fallback to memory
      }
    }

    const companyDocs = issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id) && new Date(d.date || d.created_at || d.data_emissao).getFullYear() === year);
    const companyClients = clients.filter(c => String(c.empresa_id) === String(empresa_id));
    const companyCaixas = caixas.filter(c => String(c.empresa_id) === String(empresa_id));

    res.json({
      totalInvoiced: companyDocs.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0),
      pendingCount: companyDocs.filter(d => d.payment_status === 'pending').length,
      clientCount: companyClients.length,
      totalExpenses: 0,
      cashBalance: companyCaixas.reduce((acc, c) => acc + (Number(c.currentBalance) || 0), 0),
      recentInvoices: companyDocs.slice(-5)
    });
  });

  // Clients are now exclusively handled by Supabase via ClienteService.
app.post("/api/exec-sql", express.json(), async (req, res) => {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: "Missing SQL" });
    
    // We already have supabaseAdmin from earlier in server.ts (I will check if there is one, otherwise use REST or pg)
    // Actually, Supabase postgREST doesn't support exec_sql without rpc. Let me just use `pg` module.
    // wait, server.ts has standard pg/pool?
  } catch(e) { }
});
  // but they will not store or leak data in memory.
  app.get("/api/clients", (req, res) => {
    res.json([]);
  });
  app.post("/api/clients", (req, res) => {
    res.status(400).json({ error: "Deprecated endpoint. Use Supabase directly." });
  });
  app.put("/api/clients/:id", (req, res) => {
    res.status(400).json({ error: "Deprecated endpoint. Use Supabase directly." });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) {
      return res.json(products.filter(p => String(p.empresa_id) === String(empresa_id)));
    }
    res.json([]);
  });
  app.post("/api/products", (req, res) => {
    const newProd = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    products.push(newProd);
    
    // Add initial stock movement if quantity > 0
    if (Number(newProd.stock_quantity) > 0) {
      stockMovements.push({
        id: generateId(),
        product_id: newProd.id,
        product_name: newProd.name,
        type: 'entry',
        quantity: Number(newProd.stock_quantity),
        description: 'Stock Inicial',
        warehouse_id: Number(newProd.warehouse_id || 1),
        created_at: new Date().toISOString()
      });
    }
    
    saveData();
    res.json(newProd);
  });

  // Invoices & Issued Documents
  app.get("/api/invoices", async (req, res) => {
    const { empresa_id } = req.query;
    if (!empresa_id) return res.json([]);

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('empresa_id', empresa_id)
          .order('data_emissao', { ascending: false });

        if (!error && data) {
          const formatted = data.map((d: any) => ({
            ...d,
            id: d.id,
            client_id: d.cliente_id || d.client_id,
            client_name: d.cliente_nome || d.client_name || 'Desconhecido',
            invoice_number: d.numero_documento || d.invoice_number,
            date: d.data_emissao || d.created_at,
            due_date: d.data_vencimento || d.due_date,
            status: (d.status || d.estado || 'ativo').toLowerCase(),
            total: Number(d.total || 0),
            imposto: Number(d.imposto || 0),
            items: d.detalhes?.items || d.items || [],
            client_email: d.cliente_email || d.client_email,
            document_type: d.tipo_documento || d.document_type,
            is_certified: d.is_certified,
            hash: d.hash_documento || d.hash
          }));
          return res.json(formatted);
        }
      } catch (err) {
        console.error('Erro ao ler faturas do Supabase:', err);
      }
    }

    // Fallback
    res.json(issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id)));
  });

  app.get("/api/issued-documents", async (req, res) => {
    const { empresa_id } = req.query;
    if (!empresa_id) return res.json([]);

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('empresa_id', empresa_id)
          .order('data_emissao', { ascending: false });

        if (!error && data) {
          const formatted = data.map((d: any) => ({
            ...d,
            id: d.id,
            client_id: d.cliente_id || d.client_id,
            client_name: d.cliente_nome || d.client_name || 'Desconhecido',
            invoice_number: d.numero_documento || d.invoice_number,
            date: d.data_emissao || d.created_at,
            due_date: d.data_vencimento || d.due_date,
            status: (d.status || d.estado || 'ativo').toLowerCase(),
            total: Number(d.total || 0),
            imposto: Number(d.imposto || 0),
            items: d.detalhes?.items || d.items || [],
            client_email: d.cliente_email || d.client_email,
            document_type: d.tipo_documento || d.document_type,
            is_certified: d.is_certified,
            hash: d.hash_documento || d.hash
          }));
          return res.json(formatted);
        }
      } catch (err) {
        console.error('Erro ao ler documentos emitidos do Supabase:', err);
      }
    }

    // Fallback
    res.json(issuedDocuments.filter(d => String(d.empresa_id) === String(empresa_id)));
  });

  app.get("/api/invoices/:id", async (req, res) => {
    const docId = req.params.id;

    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('documentos_emitidos')
          .select('*')
          .eq('id', docId)
          .single();

        if (!error && data) {
          const formatted = {
            ...data,
            id: data.id,
            client_id: data.cliente_id || data.client_id,
            client_name: data.cliente_nome || data.client_name || 'Desconhecido',
            invoice_number: data.numero_documento || data.invoice_number,
            date: data.data_emissao || data.created_at,
            due_date: data.data_vencimento || data.due_date,
            status: (data.status || data.estado || 'ativo').toLowerCase(),
            total: Number(data.total || 0),
            imposto: Number(data.imposto || 0),
            items: data.detalhes?.items || data.items || [],
            client_email: data.cliente_email || data.client_email,
            document_type: data.tipo_documento || data.document_type,
            is_certified: data.is_certified,
            hash: data.hash_documento || data.hash,
            codigo_validacao: data.codigo_validacao
          };
          return res.json(formatted);
        }
      } catch (err) {
        console.error('Erro ao buscar fatura unica no Supabase:', err);
      }
    }

    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) res.json(doc);
    else res.status(404).json({ error: "Document not found" });
  });
  app.delete("/api/invoices/:id", (req, res) => {
    const docId = req.params.id;
    const index = issuedDocuments.findIndex(d => String(d.id) === String(docId));
    if (index !== -1) {
      if (issuedDocuments[index].is_certified) {
        return res.status(403).json({ error: "Cannot delete certified document" });
      }
      issuedDocuments.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else res.status(404).json({ error: "Document not found" });
  });
  app.post("/api/invoices/:id/clone", (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      // Re-use logic for generating number
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      const docType = doc.document_type || 'Fatura';
      let invoice_number = "";
      
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[docType]) series.counters[docType] = 1;
        const counter = series.counters[docType];
        series.counters[docType]++;
        const year = new Date().getFullYear();
        invoice_number = `${docType} ${series.reference}${year}/${counter}`;
      } else {
        const counter = issuedDocuments.filter(d => 
          (d.document_type === docType || d.tipo_documento === docType) && 
          String(d.empresa_id) === String(doc.empresa_id)
        ).length + 1;
        invoice_number = `${docType} ${new Date().getFullYear()}/${counter}`;
      }

      // Uniqueness check
      if (issuedDocuments.some(d => d.invoice_number === invoice_number)) {
        invoice_number = `${invoice_number}-${Date.now().toString().slice(-4)}`;
      }

      const cloned = { 
        ...doc, 
        id: generateId(), 
        invoice_number, 
        numero_documento: invoice_number,
        is_certified: false, 
        hash: undefined,
        reference_document: doc.invoice_number || doc.numero_documento,
        created_at: new Date().toISOString() 
      };
      issuedDocuments.push(cloned);
      saveData();
      res.json(cloned);
    } else res.status(404).json({ error: "Document not found" });
  });

  app.put("/api/invoices/:id", (req, res) => {
    const docId = req.params.id;
    const index = issuedDocuments.findIndex(d => String(d.id) === String(docId));
    if (index !== -1) {
      const existing = issuedDocuments[index];
      // If certified, only allow non-fiscal updates (simulated)
      if (existing.is_certified) {
        // In reality, AGT rules forbid modifying fiscal data once certified.
        // For this mock, we just update what's sent but we should ideally restrict it.
        issuedDocuments[index] = { ...existing, ...req.body, is_certified: true };
      } else {
        issuedDocuments[index] = { ...existing, ...req.body };
      }
      saveData();
      res.json(issuedDocuments[index]);
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // Receipts
  app.post("/api/receipts", async (req, res) => {
    const { invoice_id, amount, payment_method, date, cash_box, empresa_id } = req.body;
    let invoice = issuedDocuments.find(d => d.id === Number(invoice_id));
    
    // Fallback search in database in case of Vercel memory sweep
    if (!invoice && supabaseAdmin) {
      const { data } = await supabaseAdmin.from('documentos_emitidos').select('*').eq('id', invoice_id).single();
      if (data) {
        invoice = {
          ...data,
          contravalor: Number(data.total || 0),
          date: data.data_emissao || data.created_at,
          client_name: data.cliente_nome || data.client_name,
          invoice_number: data.numero_documento || data.invoice_number,
          estado_documento: (data.estado || 'ativo').toLowerCase(),
          document_type: data.tipo_documento || data.document_type
        };
      }
    }

    if (invoice) {
      if (!invoice.paid_amount) invoice.paid_amount = 0;
      invoice.paid_amount += Number(amount);
      
      const total = invoice.total || invoice.counter_value || 0;
      let p_status = 'partial';
      let statusStr = 'parcial';
      
      if (invoice.paid_amount >= total) {
        p_status = 'paid';
        statusStr = 'pago';
        invoice.payment_status = 'paid';
        invoice.status = 'pago';
        invoice.estado_documento = 'ativo';
      } else if (invoice.paid_amount > 0) {
        invoice.payment_status = 'partial';
        invoice.status = 'parcial';
      }

      const activeCompanyId = empresa_id || invoice.empresa_id || '11111111-1111-1111-1111-111111111111';

      // 1. Update the parent invoice in Supabase
      if (supabaseAdmin) {
        await supabaseAdmin
          .from('documentos_emitidos')
          .update({ 
            paid_amount: invoice.paid_amount,
            payment_status: p_status,
            status: statusStr
          })
          .eq('id', invoice_id);
      }

      // 2. Generate and Insert the 'Recibo' document into documentos_emitidos so it appears in the documents list
      const receiptNum = `RC PRD/${Date.now().toString().slice(-6)}`;
      const newReceiptDoc = {
        empresa_id: activeCompanyId,
        tipo_documento: 'Recibo',
        document_type: 'Recibo',
        numero_documento: receiptNum,
        invoice_number: receiptNum,
        cliente_id: invoice.cliente_id || invoice.client_id || null,
        cliente_nome: invoice.cliente_nome || invoice.client_name || 'Desconhecido',
        total: Number(amount),
        counter_value: Number(amount),
        data_emissao: date || new Date().toISOString(),
        date: date || new Date().toISOString(),
        is_certified: true, // receipts are certified
        status: 'emitido',
        payment_method: payment_method,
        cash_box: cash_box,
        items: [
          {
            description: `Liquidação de Factura Ref. ${invoice.numero_documento || invoice.invoice_number}`,
            quantity: 1,
            price: Number(amount),
            total: Number(amount)
          }
        ]
      };

      if (supabaseAdmin) {
        await supabaseAdmin.from('documentos_emitidos').insert([newReceiptDoc]);
      }

      // Record receipt in memory list
      const newReceipt = { id: generateId(), invoice_id: Number(invoice_id), amount: Number(amount), payment_method, date: date || new Date().toISOString(), cash_box, status: 'ativo' };
      receipts.push(newReceipt);

      // Record transaction
      const newTransaction = {
        id: generateId(),
        type: 'income',
        category: 'Vendas',
        amount: Number(amount),
        moeda: invoice.moeda || 'AOA',
        description: `Recebimento Ref: ${invoice.invoice_number}`,
        date: date || new Date().toISOString(),
        reference_id: invoice_id,
        payment_method,
        cash_box,
        work_site_id: invoice.work_site_id
      };
      transactions.push(newTransaction);

      // Record Caixa movement if cash_box is provided
      if (cash_box) {
        caixaMovements.push({
          id: generateStrId(),
          caixaId: cash_box,
          type: 'entrada',
          amount: Number(amount),
          moeda: invoice.moeda || 'Kwanza',
          description: `Recebimento Ref. ${invoice.invoice_number}`,
          date: date || new Date().toISOString()
        });
        const targetCaixa = caixas.find(c => String(c.id) === String(cash_box) || c.name === cash_box);
        if (targetCaixa) {
          targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) + Number(amount);
        }

        // Direct write to caixas and caixa_movimentacoes on Supabase
        if (supabaseAdmin) {
          const { data: dbCaixas } = await supabaseAdmin.from('caixas').select('*').eq('empresa_id', activeCompanyId);
          const matchedDbCaixa = dbCaixas?.find(c => String(c.id) === String(cash_box) || c.nome_caixa === cash_box);
          if (matchedDbCaixa) {
            const newBal = Number(matchedDbCaixa.current_balance || 0) + Number(amount);
            await supabaseAdmin.from('caixas').update({ current_balance: newBal }).eq('id', matchedDbCaixa.id);
            
            await supabaseAdmin.from('caixa_movimentacoes').insert([{
              empresa_id: activeCompanyId,
              caixa_id: matchedDbCaixa.id,
              type: 'entrada',
              amount: Number(amount),
              description: `Recebimento Ref. ${invoice.invoice_number}`,
              date: date || new Date().toISOString(),
              moeda: invoice.moeda || 'AOA'
            }]);
          }
        }
      }

      // Record Work Site Movement if applicable
      if (invoice.work_site_id) {
        workSiteMovements.push({
          id: generateId(),
          work_site_id: invoice.work_site_id,
          date: date || new Date().toISOString(),
          doc_no: `REC-${generateId()}`,
          company: invoice.client_name,
          description: `Recebimento de Factura - Ref. ${invoice.invoice_number}`,
          debit: 0,
          credit: Number(amount),
          balance: 0,
          moeda: invoice.moeda || 'AOA'
        });
      }

      saveData();
      res.json({ success: true, receipt: newReceipt });
    } else {
      res.status(404).json({ error: "Invoice not found or invalid." });
    }
  });

  app.get("/api/transactions", (req, res) => res.json(transactions));

  app.post("/api/invoices/:id/void", (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      const { reason } = req.body;
      doc.status = 'anulado';
      doc.estado_documento = 'anulado';
      doc.description = `[ANULADO] ${doc.numero_documento || doc.invoice_number} - SEM VALIDADE`; 
      doc.is_valid = false;
      doc.void_reason = reason;
      doc.void_at = new Date().toISOString();
      
      // If it's a Receipt, free up the original Invoice
      if (doc.document_type === 'Recibo') {
        const originalInvoice = issuedDocuments.find(inv => inv.invoice_number === doc.reference_document || inv.id === Number(doc.invoice_id));
        if (originalInvoice) {
          originalInvoice.paid_amount = (originalInvoice.paid_amount || 0) - (doc.total || 0);
          if (originalInvoice.paid_amount <= 0) {
            originalInvoice.paid_amount = 0;
            originalInvoice.status = 'pendente';
            originalInvoice.payment_status = 'pending';
          } else {
            originalInvoice.status = 'parcial';
            originalInvoice.payment_status = 'partial';
          }
          originalInvoice.estado_documento = 'ativo';
        }

        // Also reverse Caixa movement if exists
        const reverseAmount = doc.total || 0;
        if (doc.cash_box) {
           caixaMovements.push({
             id: generateStrId(),
             caixaId: doc.cash_box,
             type: 'saida',
             amount: reverseAmount,
             moeda: doc.moeda || 'Kwanza',
             description: `[ESTORNO] Anulação Recibo ${doc.invoice_number}`,
             date: new Date().toISOString()
           });
           const targetCaixa = caixas.find(c => String(c.id) === String(doc.cash_box) || c.name === doc.cash_box);
           if (targetCaixa) {
             targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) - reverseAmount;
           }
        }
      }

      // Generate associated correction document (Credit Note normally, Debit Note if voiding a Credit Note)
      const isCreditNote = doc.document_type === 'Nota de Crédito' || doc.tipo_documento === 'Nota de Crédito';
      const associatedDocType = isCreditNote ? 'Nota de Débito' : 'Nota de Crédito';
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      let assoc_number = "";
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[associatedDocType]) series.counters[associatedDocType] = 1;
        const counter = series.counters[associatedDocType];
        series.counters[associatedDocType]++;
        assoc_number = `${associatedDocType} ${series.reference}${new Date().getFullYear()}/${counter}`;
      } else {
        const empresaId = doc.empresa_id;
        const counter = issuedDocuments.filter(d => 
          (d.document_type === associatedDocType || d.tipo_documento === associatedDocType) && 
          String(d.empresa_id) === String(empresaId)
        ).length + 1;
        assoc_number = `${associatedDocType} ${new Date().getFullYear()}/${counter}`;
      }
      
      const correctionDoc = {
        ...doc,
        id: generateId(),
        document_type: associatedDocType,
        tipo_documento: associatedDocType,
        invoice_number: assoc_number,
        numero_documento: assoc_number,
        reference_document: doc.numero_documento || doc.invoice_number,
        contravalor: isCreditNote ? Math.abs(doc.contravalor || doc.counter_value || 0) : -Math.abs(doc.contravalor || doc.counter_value || 0),
        counter_value: isCreditNote ? Math.abs(doc.contravalor || doc.counter_value || 0) : -Math.abs(doc.contravalor || doc.counter_value || 0),
        total: isCreditNote ? Math.abs(doc.total || doc.counter_value || 0) : -Math.abs(doc.total || doc.counter_value || 0),
        created_at: new Date().toISOString(),
        is_certified: true,
        status: 'ativo',
        description: `Ref. ${doc.numero_documento || doc.invoice_number}`
      };
      
      issuedDocuments.push(correctionDoc);
      saveData();
      res.json({ success: true, correctionDoc });
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // SAFT Export Logic (Mock AGT SAFT-AO format)
  app.get("/api/accounting/saft", (req, res) => {
    const { year, month } = req.query;
    const certifiedDocs = issuedDocuments.filter(doc => doc.is_certified);
    
    // In a real app we'd build the XML here
    // For this context, we return a structural JSON that represents SAFT
    const saft = {
      Header: {
        AuditFileVersion: "1.01_01",
        CompanyID: "500000000",
        TaxRegistrationNumber: "500000000",
        TaxAccountingBasis: "F",
        CompanyName: "Empresa Exemplo",
        FiscalYear: year || new Date().getFullYear(),
        SoftwareCertificateNumber: "000/AGT/2026"
      },
      SourceDocuments: {
        SalesInvoices: {
          NumberOfEntries: certifiedDocs.length,
          TotalDebit: 0,
          TotalCredit: certifiedDocs.reduce((acc, d) => acc + (d.total || 0), 0),
          Invoices: certifiedDocs
        }
      }
    };
    res.json(saft);
  });

  app.post("/api/invoices/:id/convert", (req, res) => {
    const docId = req.params.id;
    const doc = issuedDocuments.find(d => String(d.id) === String(docId));
    if (doc) {
      const { targetType } = req.body;
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      let new_number = "";
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[targetType]) series.counters[targetType] = 1;
        const counter = series.counters[targetType];
        series.counters[targetType]++;
        new_number = `${targetType} ${series.reference}${new Date().getFullYear()}/${counter}`;
      } else {
        const counter = issuedDocuments.filter(d => 
          (d.document_type === targetType || d.tipo_documento === targetType) && 
          String(d.empresa_id) === String(doc.empresa_id)
        ).length + 1;
        new_number = `${targetType} ${new Date().getFullYear()}/${counter}`;
      }

      const converted = {
        ...doc,
        id: generateId(),
        document_type: targetType,
        tipo_documento: targetType,
        invoice_number: new_number,
        numero_documento: new_number,
        reference_document: doc.numero_documento || doc.invoice_number,
        is_certified: false,
        hash: undefined,
        created_at: new Date().toISOString(),
        description: `Ref. ${doc.numero_documento || doc.invoice_number}`
      };
      issuedDocuments.push(converted);
      res.json(converted);
    } else res.status(404).json({ error: "Invoice not found" });
  });

  app.post("/api/invoices/:id/certify", (req, res) => {
    const docId = req.params.id;
    const docIndex = issuedDocuments.findIndex(d => String(d.id) === String(docId));
    if (docIndex !== -1) {
      const doc = issuedDocuments[docIndex];
      doc.is_certified = true;
      doc.hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // 1. Record stock movements ONLY on certification
      if (Array.isArray(doc.items)) {
        doc.items.forEach((item: any) => {
          if (item.product_id) {
            const prod = products.find(p => p.id === Number(item.product_id));
            stockMovements.push({
              id: generateId() + Math.random(),
              product_id: Number(item.product_id),
              product_name: item.description || prod?.name || 'Produto',
              type: 'exit',
              quantity: Number(item.quantity || 1),
              description: `Venda ${doc.invoice_number} (Certificado)`,
              created_at: new Date().toISOString(),
              work_site_id: doc.work_site_id ? Number(doc.work_site_id) : undefined,
              previous_stock: prod?.stock_quantity || 0,
              current_stock: (prod?.stock_quantity || 0) - Number(item.quantity || 1),
              warehouse_id: Number(item.warehouse_id || 1)
            });
            if (prod) prod.stock_quantity -= Number(item.quantity || 1);
          }
        });
      }

      // 2. Record finance movement (Accounting)
      const amount = Number(doc.total || doc.counter_value || 0);
      transactions.push({
        id: generateId(),
        type: 'income',
        category: 'Vendas',
        amount: amount,
        moeda: doc.moeda || doc.currency || 'AOA',
        description: `Venda ${doc.invoice_number} (Certificada)`,
        date: new Date().toISOString(),
        reference_id: doc.id.toString(),
        work_site_id: doc.work_site_id
      });

      // Update Work Site Movements if applicable
      if (doc.work_site_id) {
        workSiteMovements.push({
          id: generateId(),
          work_site_id: doc.work_site_id,
          date: new Date().toISOString(),
          doc_no: doc.invoice_number || doc.numero_documento,
          company: doc.client_name || 'Cliente',
          description: `Facturação Certificada - Ref. ${doc.invoice_number}`,
          debit: 0,
          credit: amount,
          balance: 0,
          moeda: doc.moeda || doc.currency || 'AOA'
        });
      }

      // 3. Record caixa movement if applicable
      if (doc.cash_box && (doc.document_type.includes('Recibo') || doc.payment_method === 'Pronto Pagamento')) {
        caixaMovements.push({
          id: generateStrId(),
          caixaId: doc.cash_box,
          type: 'entrada',
          amount: amount,
          moeda: doc.moeda || 'Kwanza',
          description: `Venda ${doc.invoice_number} (Certificado)`,
          date: new Date().toISOString()
        });
        const targetCaixa = caixas.find(c => String(c.id) === String(doc.cash_box) || c.name === doc.cash_box);
        if (targetCaixa) {
          targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) + amount;
        }
      }

      res.json({ success: true, doc });
    } else res.status(404).json({ error: "Document not found" });
  });

  function getDocTypeAbbreviation(type: string): string {
    const t = String(type || '').trim().toLowerCase();
    if (t.includes('fatura recibo') || t === 'fr' || t === 'fatura_recibo') return 'FR';
    if (t.includes('proforma') || t === 'fp' || t === 'fatura_proforma') return 'FP';
    if (t.includes('nota de credito') || t.includes('nota de crédito') || t === 'nc') return 'NC';
    if (t.includes('nota de debito') || t.includes('nota de débito') || t === 'nd') return 'ND';
    if (t.includes('recibo') || t === 'rc') return 'RC';
    if (t.includes('fatura') || t === 'ft') return 'FT';
    return 'FT'; // Default
  }

  app.post("/api/invoices", async (req, res) => {
    try {
      const docType = req.body.document_type || 'Fatura';
      const docTypeAbbr = getDocTypeAbbreviation(docType);
      
      const series = fiscalSeries.find(s => s.id === Number(req.body.series_id));
      const year = new Date().getFullYear();
      
      const companyId = req.body.empresa_id || (series ? series.empresa_id : undefined);

      // Ensure we have a series reference
      const seriesRef = series ? series.reference : 'PRD';

      // Lock and increment active series / counter
      let counter = 1;
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[docTypeAbbr]) series.counters[docTypeAbbr] = 0;
        series.counters[docTypeAbbr]++;
        counter = series.counters[docTypeAbbr];
      } else if (companyId) {
        const matchingDocs = issuedDocuments.filter(d => {
          const dAbbr = getDocTypeAbbreviation(d.document_type || d.tipo_documento);
          return dAbbr === docTypeAbbr && String(d.empresa_id) === String(companyId);
        });
        counter = matchingDocs.length + 1;
      } else {
        const matchingDocs = issuedDocuments.filter(d => {
          const dAbbr = getDocTypeAbbreviation(d.document_type || d.tipo_documento);
          return dAbbr === docTypeAbbr;
        });
        counter = matchingDocs.length + 1;
      }

      // Format AGT compliant sequential billing number: FT PRD/2026/000001
      let invoice_number = req.body.invoice_number;
      if (!invoice_number) {
        invoice_number = `${docTypeAbbr} ${seriesRef}/${year}/${String(counter).padStart(6, '0')}`;
      }

      // Check duplicates
      const isDuplicate = issuedDocuments.some(d => d.invoice_number === invoice_number);
      if (isDuplicate) {
        invoice_number = `${invoice_number}-${Date.now().toString().slice(-4)}`;
      }

      // Chain Hashing (Encadeamento Fiscal)
      const previousDoc = [...issuedDocuments]
        .reverse()
        .find(d => {
          const dAbbr = getDocTypeAbbreviation(d.document_type || d.tipo_documento);
          return dAbbr === docTypeAbbr && String(d.empresa_id) === String(companyId);
        });
      const previousHash = previousDoc?.hash || '';

      const totalValue = Number(req.body.total || req.body.counter_value || 0);
      const impuestoValue = Number(req.body.imposto || req.body.total_tax || 0);

      const hashContent = `${invoice_number}${req.body.client_name || ''}${totalValue}${impuestoValue}${previousHash}`;
      const hash = crypto.createHash('sha256').update(hashContent).digest('hex');
      const codigo_validacao = hash.substring(0, 4).toUpperCase();

      const newId = generateId();

      const newDoc = { 
        ...req.body, 
        id: newId, 
        invoice_number,
        numero_documento: invoice_number,
        document_type: docTypeAbbr,
        tipo_documento: docTypeAbbr,
        is_certified: true, // Auto-certified immediately!
        hash,
        codigo_validacao,
        currency: req.body.currency || req.body.moeda || 'Kwanza',
        moeda: req.body.moeda || req.body.currency || 'Kwanza',
        created_at: new Date().toISOString()
      };

      if (supabaseAdmin && companyId) {
        try {
          const { data: dbData, error: dbErr } = await supabaseAdmin
            .from('documentos_emitidos')
            .insert([{
              empresa_id: companyId,
              tipo_documento: docTypeAbbr,
              numero_documento: invoice_number,
              cliente_nome: req.body.client_name || req.body.cliente_nome || 'Consumidor Final',
              cliente_email: req.body.client_email || req.body.customer_email || '',
              total: totalValue,
              imposto: impuestoValue,
              estado: 'emitido',
              data_emissao: newDoc.created_at,
              detalhes: {
                items: req.body.items || [],
                payment_method: req.body.payment_method,
                series_id: req.body.series_id,
                observations: req.body.observations
              },
              serie: seriesRef,
              ano: year,
              numero_sequencial: counter,
              hash_anterior: previousHash,
              hash_documento: hash,
              codigo_validacao: codigo_validacao,
              assinatura_digital: hash,
              documento_formatado: invoice_number,
              is_certified: true,
              estado_certificacao: 'CERTIFICADO',
              status: 'ativo'
            }])
            .select()
            .single();

          if (!dbErr && dbData) {
            newDoc.id = dbData.id; // Sync back database UUID to maintain absolute relational link
          } else {
            console.error('Erro ao instanciar no Supabase:', dbErr);
          }
        } catch (supabaseErr) {
          console.error('Falha de ligacao ao Supabase:', supabaseErr);
        }
      }

      issuedDocuments.push(newDoc);
      saveData();
      res.json(newDoc);
    } catch (err: any) {
      console.error('Erro geral ao instanciar fatura:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Fiscal Series
  app.get("/api/fiscal-series", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(fiscalSeries.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/fiscal-series", (req, res) => {
    const newSeries = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    fiscalSeries.push(newSeries);
    saveData();
    res.json(newSeries);
  });

  // POS Endpoints
  app.get("/api/cost-centers", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(costCenters.filter(c => String(c.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/pos-points", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(posPoints.filter(p => String(p.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/cash/sessions", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(sessions.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  
  app.post("/api/pos-points", (req, res) => {
    const newPoint = { ...req.body, id: generateId(), is_active: true };
    posPoints.push(newPoint);
    saveData();
    res.json(newPoint);
  });

  app.post("/api/cash/open", (req, res) => {
    const newSession = {
      id: generateId(),
      opening_date: new Date().toISOString(),
      initial_balance: Number(req.body.initial_balance || 0),
      status: 'open',
      pos_point_id: req.body.pos_point_id,
      user_id: '1'
    };
    sessions.push(newSession);
    saveData();
    res.json(newSession);
  });

  app.post("/api/cash/close/:id", (req, res) => {
    const session = sessions.find(s => s.id === Number(req.params.id));
    if (session) {
      session.status = 'closed';
      session.closing_date = new Date().toISOString();
      session.final_balance = Number(req.body.final_balance || 0);
      saveData();
      res.json(session);
    } else res.status(404).json({ error: "Session not found" });
  });

  app.post("/api/pos/sales", (req, res) => {
    const newSale = {
      ...req.body,
      id: generateId(),
      created_at: new Date().toISOString()
    };
    posSales.push(newSale);
    saveData();
    res.json(newSale);
  });

  // System Users
  app.get("/api/system-users", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(systemUsers.filter(u => String(u.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/system-users", (req, res) => {
    const newUser = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    systemUsers.push(newUser);
    saveData();
    res.json(newUser);
  });

  // Archives
  app.get("/api/archives", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(archives.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/archives", (req, res) => {
    const newFile = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    archives.push(newFile);
    saveData();
    res.json(newFile);
  });

  // Fleet
  app.get("/api/fleet", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(fleetVehicles.filter(v => String(v.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/fleet", (req, res) => {
    const newVehicle = { ...req.body, id: generateId() };
    fleetVehicles.push(newVehicle);
    saveData();
    res.json(newVehicle);
  });

  // Projects
  app.get("/api/projects/tasks", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(projectTasks.filter(t => String(t.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/projects/tasks", (req, res) => {
    const newTask = { ...req.body, id: generateId() };
    projectTasks.push(newTask);
    saveData();
    res.json(newTask);
  });

  // Caixas
  app.get("/api/caixas", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(caixas.filter(c => String(c.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/caixas", (req, res) => {
    const newCaixa = { ...req.body, id: generateId() };
    caixas.push(newCaixa);
    saveData();
    res.json(newCaixa);
  });
  app.put("/api/caixas/:id", (req, res) => {
    const index = caixas.findIndex(c => String(c.id) === String(req.params.id));
    if (index !== -1) {
      caixas[index] = { ...caixas[index], ...req.body };
      saveData();
      res.json(caixas[index]);
    } else res.status(404).json({ error: "Caixa not found" });
  });

  // Work Sites
  app.get("/api/work-sites", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(workSites.filter(w => String(w.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/work-sites", (req, res) => {
    const newSite = { ...req.body, id: generateId() };
    workSites.push(newSite);
    saveData();
    res.json(newSite);
  });
  app.put("/api/work-sites/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = workSites.findIndex(w => w.id === id);
    if (index !== -1) {
      workSites[index] = { ...workSites[index], ...req.body, id };
      saveData();
      res.json(workSites[index]);
    } else {
      res.status(404).json({ error: "Work Site not found" });
    }
  });
  app.get("/api/work-sites/:id/movements", (req, res) => {
    const { id } = req.params;
    const { company_id } = req.query;
    const siteMovements = workSiteMovements.filter(m => 
      m.work_site_id?.toString() === id.toString() && 
      (!company_id || m.company_id?.toString() === company_id.toString())
    );
    res.json(siteMovements);
  });
  app.get("/api/work-site-movements", (req, res) => {
    const { company_id } = req.query;
    const siteMovements = workSiteMovements.filter(m => 
      !company_id || m.company_id?.toString() === company_id.toString()
    );
    res.json(siteMovements);
  });
  app.post("/api/work-sites/:id/movements", (req, res) => {
    const movement = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    workSiteMovements.push(movement);
    saveData();
    res.json(movement);
  });

  // Transactions
  app.get("/api/transactions", (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (empresa_id) return res.json(transactions.filter(t => String(t.empresa_id) === String(empresa_id) && (!t.date || new Date(t.date).getFullYear() === year)));
    res.json([]);
  });
  app.post("/api/transactions", (req, res) => {
    const newTrans = { ...req.body, id: generateId(), date: new Date().toISOString() };
    transactions.push(newTrans);
    saveData();
    res.json(newTrans);
  });

  // Suppliers & Purchases
  app.get("/api/suppliers", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(suppliers.filter(s => String(s.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/suppliers", (req, res) => {
    const newSupplier = { ...req.body, id: generateId() };
    suppliers.push(newSupplier);
    saveData();
    res.json(newSupplier);
  });
  app.get("/api/purchases", (req, res) => {
    const { empresa_id } = req.query;
    const allPurchases = [...purchases];
    const receiptsAsPurchases = issuedDocuments.filter((d: any) => d.document_type === 'Recibo').map(d => ({
      ...d,
      supplier_name: d.client_name, // Map client to supplier for purchases list
      document_type: 'Recibo',
      invoice_number: d.numero_documento
    }));
    
    const combined = [...allPurchases, ...receiptsAsPurchases];
    if (empresa_id) {
      return res.json(combined.filter(p => String(p.empresa_id) === String(empresa_id)));
    }
    res.json([]);
  });

  // Accounting Endpoints
  app.get("/api/accounting/journals", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(accountingJournals.filter(j => String(j.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/journals", (req, res) => {
    const newJournal = { ...req.body, created_at: new Date().toISOString() };
    accountingJournals.push(newJournal);
    saveData();
    res.json(newJournal);
  });
  app.get("/api/accounting/movements", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(accountingMovements.filter(m => String(m.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/movements", (req, res) => {
    const newMovement = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    accountingMovements.push(newMovement);
    
    // Increment movements count in journal
    const journal = accountingJournals.find(j => j.id === req.body.journal_id);
    if (journal) {
      journal.movementsCount = (journal.movementsCount || 0) + 1;
    }
    
    saveData();
    res.json(newMovement);
  });

  app.get("/api/accounting/pgc", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(pgcAccounts.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/accounting/pgc", (req, res) => {
    const newAccount = { ...req.body };
    const existingIndex = pgcAccounts.findIndex(a => a.id === newAccount.id);
    if (existingIndex !== -1) {
      pgcAccounts[existingIndex] = newAccount;
    } else {
      pgcAccounts.push(newAccount);
    }
    saveData();
    res.json(newAccount);
  });

  // Movement Classification Endpoints
  app.post("/api/accounting/classify", (req, res) => {
    const { ids, type, targetAccount } = req.body;
    // In a real scenario, this would update the specific movements
    // For this implementation, we'll simulate the persistence
    console.log(`Classified ${type} movements ${ids.join(',')} to account ${targetAccount}`);
    saveData();
    res.json({ success: true });
  });

  app.put("/api/purchases/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = purchases.findIndex((p: any) => p.id === id);
    if (index !== -1) {
      purchases[index] = { ...purchases[index], ...req.body, id };
      saveData();
      res.json(purchases[index]);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  });
  app.delete("/api/purchases/:id", (req, res) => {
    const id = Number(req.params.id);
    purchases = purchases.filter((p: any) => p.id !== id);
    saveData();
    res.json({ success: true });
  });
  app.post("/api/purchases", (req, res) => {
    const newPurchaseId = generateId();
    
    // Automatic Sequential Numbering
    const docType = req.body.document_type || 'Compra';
    const sameTypeDocs = purchases.filter((p: any) => p.document_type === docType);
    const year = new Date().getFullYear();
    const nextNum = sameTypeDocs.length + 1;
    
    // Get prefix based on document type
    let prefix = 'CMP';
    if (docType === 'Fatura de Compra') prefix = 'FC';
    else if (docType === 'Recibo' || docType === 'Pagamento' || docType === 'Recibo de Pagamento') prefix = 'RC';
    else if (docType === 'Nota de Crédito de Fornecedor') prefix = 'NC';
    else if (docType === 'Venda a Dinheiro') prefix = 'VD';
    
    const purchaseNumber = req.body.purchase_number || `${prefix}-${year}/${nextNum.toString().padStart(3, '0')}`;

    // Get Work Site name if not provided
    let workSiteName = req.body.work_site;
    if (!workSiteName && req.body.work_site_id) {
      const ws = workSites.find(w => Number(w.id) === Number(req.body.work_site_id));
      if (ws) workSiteName = ws.name || ws.title;
    }

    const newPurchase: any = { 
      ...req.body, 
      id: newPurchaseId, 
      purchase_number: purchaseNumber,
      work_site: workSiteName,
      date: req.body.date || new Date().toISOString(), 
      status: 'completed',
      created_at: new Date().toISOString()
    };
    purchases.push(newPurchase);
    
    // Record finance movement (Accounting Cost)
    const amount = Number(newPurchase.total || 0);
    const isPayment = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Recibo de Pagamento', 'Venda a Dinheiro', 'Fatura Recibo'].includes(newPurchase.document_type);
    
    // Always record as a transaction for accounting
    transactions.push({
      id: generateId(),
      type: 'expense',
      category: 'Compras',
      amount: amount,
      moeda: newPurchase.moeda || newPurchase.currency || 'AOA',
      description: `${newPurchase.document_type || 'Compra'} Ref: ${newPurchase.purchase_number} - Fornecedor: ${newPurchase.supplier_name || 'N/A'}`,
      date: newPurchase.date || new Date().toISOString(),
      reference_id: newPurchase.id.toString(),
      work_site_id: newPurchase.work_site_id,
      company_id: newPurchase.company_id || '1'
    });

    // If it's a cash transaction, record in Caixa
    if (isPayment && newPurchase.cash_box) {
      const caixaId = Number(newPurchase.cash_box);
      const caixa = caixas.find(c => c.id === caixaId);
      if (caixa) {
        const movement = {
          id: generateId(),
          caixa_id: caixaId,
          type: 'saida',
          amount: amount,
          description: `Pagamento Compra: ${newPurchase.purchase_number} (${newPurchase.supplier_name})`,
          date: new Date().toISOString(),
          user_id: '1',
          company_id: newPurchase.company_id || '1'
        };
        caixaMovements.push(movement);
        caixa.balance = (caixa.balance || 0) - amount;
      }
    }
    
    // Update Work Site Movements if applicable 
    if (newPurchase.work_site_id || newPurchase.work_site) {
      const wsId = newPurchase.work_site_id || (workSites.find(ws => ws.name === newPurchase.work_site)?.id);
      if (wsId) {
        workSiteMovements.push({
          id: generateId(),
          work_site_id: String(wsId),
          company_id: newPurchase.company_id || '1',
          date: newPurchase.date || new Date().toISOString(),
          created_at: new Date().toISOString(),
          doc_no: newPurchase.purchase_number,
          company: newPurchase.supplier_name,
          description: `Material / Encargos - ${newPurchase.document_type}`,
          debit: amount,
          credit: 0,
          balance: 0,
          moeda: newPurchase.moeda || newPurchase.currency || 'AOA'
        });
      }
    }

    // Record stock movements for each item
    if (newPurchase.items && Array.isArray(newPurchase.items)) {
      newPurchase.items.forEach((item: any) => {
        if (item.product_id) {
          const product = products.find(p => Number(p.id) === Number(item.product_id));
          if (product) {
            // Create stock movement
            stockMovements.push({
              id: generateId(),
              product_id: product.id,
              type: 'entry',
              quantity: Number(item.quantity),
              unit_price: Number(item.unit_price),
              warehouse_id: item.warehouse_id || product.warehouse_id,
              description: `Compra Ref: ${newPurchase.purchase_number}`,
              created_at: new Date().toISOString(),
              company_id: newPurchase.company_id || '1'
            });
            // Update product stock
            product.stock_quantity = (Number(product.stock_quantity) || 0) + Number(item.quantity);
          }
        }
      });
    }

    saveData();
    res.json(newPurchase);
  });

  // Company info
  app.get("/api/company/:id", (req, res) => {
    const comp = companies.find(c => c.id === req.params.id) || companies[0];
    res.json(comp);
  });
  app.put("/api/company/:id", (req, res) => {
    const id = req.params.id;
    const index = companies.findIndex(c => c.id === id);
    if (index !== -1) {
      companies[index] = { ...companies[index], ...req.body };
      saveData();
      res.json(companies[index]);
    } else {
      const newComp = { ...req.body, id };
      companies.push(newComp);
      saveData();
      res.json(newComp);
    }
  });

  // Metrics
  app.get("/api/metrics", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) {
      const records = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')).metrics || [];
      return res.json(records.filter((m: any) => String(m.empresa_id) === String(empresa_id)));
    }
    res.json([]);
  });
  app.post("/api/metrics", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (!data.metrics) data.metrics = [];
    const newMetric = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    data.metrics.push(newMetric);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    res.json(newMetric);
  });
  app.get("/api/employees", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(employees.filter(e => String(e.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/employees", (req, res) => {
    const newEmp = { 
      ...req.body, 
      id: generateId(), 
      created_at: new Date().toISOString() 
    };
    employees.push(newEmp);
    saveData();
    res.json(newEmp);
  });
  app.put("/api/employees/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
      employees[index] = { ...employees[index], ...req.body };
      saveData();
      res.json(employees[index]);
    } else {
      res.status(404).json({ error: "Funcionário não encontrado" });
    }
  });
  app.delete("/api/employees/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
      employees.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Funcionário não encontrado" });
    }
  });
  app.get("/api/professions", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(professions.filter(p => String(p.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/professions", (req, res) => {
    const newP = { 
      ...req.body, 
      id: generateId(), 
      created_at: new Date().toISOString() 
    };
    professions.push(newP);
    saveData();
    res.json(newP);
  });
  app.put("/api/professions/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = professions.findIndex(p => p.id === id);
    if (index !== -1) {
      professions[index] = { ...professions[index], ...req.body };
      saveData();
      res.json(professions[index]);
    } else {
      res.status(404).json({ error: "Profissão não encontrada" });
    }
  });
  app.delete("/api/professions/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = professions.findIndex(p => p.id === id);
    if (index !== -1) {
      professions.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Profissão não encontrada" });
    }
  });
  app.get("/api/employees/attendance", (req, res) => {
    const { empresa_id, date } = req.query;
    let filtered = attendance;
    if (empresa_id) filtered = filtered.filter(a => String(a.empresa_id) === String(empresa_id));
    else return res.json([]);

    if (date) {
      filtered = filtered.filter(a => a.date === date);
    }
    res.json(filtered);
  });
  app.post("/api/employees/attendance", (req, res) => {
    const newAtt = { ...req.body, id: generateId() };
    attendance.push(newAtt);
    res.json(newAtt);
  });
  app.get("/api/employees/absences", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(absences.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/labor-terminations", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(laborTerminations.filter(l => String(l.empresa_id) === String(empresa_id)));
    res.json(laborTerminations);
  });
  app.get("/api/contracts", (req, res) => {
    res.json(contracts);
  });
  app.post("/api/contracts", (req, res) => {
    const newContract = { 
      ...req.body, 
      id: generateId(), 
      created_at: new Date().toISOString() 
    };
    contracts.push(newContract);
    
    // Also update the employee state in employees if they exist
    const empId = Number(newContract.employee_id);
    const empIndex = employees.findIndex(e => e.id === empId);
    if (empIndex !== -1) {
      employees[empIndex].contract_type = newContract.contract_type === "Contrato por Tempo Indeterminado" ? "efetivo" : "temporario";
      employees[empIndex].salary = Number(newContract.salary);
    }
    
    saveData();
    res.json(newContract);
  });
  app.put("/api/contracts/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = contracts.findIndex(c => c.id === id);
    if (index !== -1) {
      contracts[index] = { ...contracts[index], ...req.body };
      
      const empId = Number(contracts[index].employee_id);
      const empIndex = employees.findIndex(e => e.id === empId);
      if (empIndex !== -1) {
        employees[empIndex].contract_type = contracts[index].contract_type === "Contrato por Tempo Indeterminado" ? "efetivo" : "temporario";
        employees[empIndex].salary = Number(contracts[index].salary);
      }
      
      saveData();
      res.json(contracts[index]);
    } else {
      res.status(404).json({ error: "Contrato não encontrado" });
    }
  });
  app.delete("/api/contracts/:id", (req, res) => {
    const id = Number(req.params.id);
    const index = contracts.findIndex(c => c.id === id);
    if (index !== -1) {
      contracts.splice(index, 1);
      saveData();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Contrato não encontrado" });
    }
  });

  // Handle employee dismissal with automatic labor termination registration
  app.post("/api/employees/dismiss/:id", (req, res) => {
    const id = Number(req.params.id);
    const empIdx = employees.findIndex(e => e.id === id);
    if (empIdx === -1) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    const emp = employees[empIdx];
    const { date, reason, observations, orderedBy } = req.body;

    // Update employee status and block them
    emp.status = 'dismissed';
    emp.dismissed_at = date;
    emp.dismissal_reason = reason;
    emp.dismissal_ordered_by = orderedBy;
    emp.dismissal_observations = observations;
    emp.is_blocked = true;

    // Add to labor terminations
    const newLt = {
      id: generateId(),
      empresa_id: emp.empresa_id,
      employee_id: emp.id,
      employee_name: emp.name,
      employee_role: emp.role,
      dismissal_date: date,
      reason: reason || 'Mútuo Acordo',
      ordered_by: orderedBy || 'Direcção Geral',
      observations: observations || '',
      created_at: new Date().toISOString()
    };
    laborTerminations.push(newLt);
    saveData();
    res.json({ success: true, employee: emp, laborTermination: newLt });
  });

  // Handle employee readmission
  app.post("/api/employees/readmit/:id", (req, res) => {
    const id = Number(req.params.id);
    const empIdx = employees.findIndex(e => e.id === id);
    if (empIdx === -1) {
      return res.status(404).json({ error: "Funcionário não encontrado" });
    }
    const emp = employees[empIdx];
    const { date } = req.body;

    // Update employee status and unblock them
    emp.status = 'active';
    emp.dismissed_at = undefined;
    emp.is_blocked = false;
    emp.readmitted_at = date || new Date().toISOString().split('T')[0];

    // Remove from labor terminations
    const ltIndex = laborTerminations.findIndex(lt => lt.employee_id === id);
    if (ltIndex !== -1) {
      laborTerminations.splice(ltIndex, 1);
    }

    saveData();
    res.json({ success: true, employee: emp });
  });
  app.get("/api/warehouses", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(warehouses.filter(w => String(w.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.post("/api/warehouses", (req, res) => {
    const newWh = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    warehouses.push(newWh);
    res.json(newWh);
  });
  app.get("/api/caixa-movements", (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (empresa_id) return res.json(caixaMovements.filter(m => String(m.empresa_id) === String(empresa_id) && (!m.date || new Date(m.date).getFullYear() === year || !m.created_at || new Date(m.created_at).getFullYear() === year)));
    res.json([]);
  });
  app.get("/api/stock/movements", (req, res) => {
    const { empresa_id } = req.query;
    const year = Number(req.query.year) || new Date().getFullYear();
    if (empresa_id) return res.json(stockMovements.filter(m => String(m.empresa_id) === String(empresa_id) && (!m.created_at || new Date(m.created_at).getFullYear() === year)));
    res.json([]);
  });
  app.get("/api/security/occurrences", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityOccurrences.filter(o => String(o.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/security/armory", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityArmory.filter(a => String(a.empresa_id) === String(empresa_id)));
    res.json([]);
  });
  app.get("/api/security/roster", (req, res) => {
    const { empresa_id } = req.query;
    if (empresa_id) return res.json(securityRoster.filter(r => String(r.empresa_id) === String(empresa_id)));
    res.json([]);
  });

  app.post("/api/receipts/:id/void", (req, res) => {
    const receiptId = Number(req.params.id);
    const receiptIdx = receipts.findIndex(r => r.id === receiptId);
    
    if (receiptIdx !== -1) {
      const receipt = receipts[receiptIdx];
      receipt.status = 'anulado';
      
      const invoice = issuedDocuments.find(d => d.id === receipt.invoice_id);
      if (invoice) {
        invoice.paid_amount = Math.max(0, (invoice.paid_amount || 0) - (receipt.amount || 0));
        if (invoice.paid_amount < (invoice.total || invoice.counter_value || 0)) {
          invoice.status = 'pendente';
        }
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Recibo não encontrado" });
    }
  });

  app.post("/api/purchases/:id/upload", (req, res) => {
    const purchaseId = Number(req.params.id);
    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase) {
      const { fileName } = req.body;
      purchase.document_url = `/uploads/${fileName}`;
      purchase.document_path = fileName;
      res.json({ success: true, url: purchase.document_url });
    } else {
      res.status(404).json({ error: "Compra não encontrada" });
    }
  });

  app.get("/api/receipts", (req, res) => res.json(receipts));
  // Vite
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server (Offline Mode) running on port ${PORT}`);
  });
}
}
startServer();

export default app;
