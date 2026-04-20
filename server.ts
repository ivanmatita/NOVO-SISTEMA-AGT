import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// --- In-Memory Database (No Supabase, No SQL) ---
let clients: any[] = [];
let products: any[] = [];
let issuedDocuments: any[] = [];
let workSites: any[] = [];
let employees: any[] = [];
let fiscalSeries: any[] = [
  { id: 1, name: 'Série 2024', user_id: '1', type: 'normal', reference: 'S12024', counter: 1, year: 2024, is_active: true, data_inicio: '2024-01-01', destino: 'Vendas Sede' }
];
let caixas: any[] = [];
let caixaMovements: any[] = [];
let warehouses: any[] = [];
let systemUsers: any[] = [];
let archives: any[] = [];
let fleetVehicles: any[] = [];
let projectTasks: any[] = [];
let companies: any[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'FaturaPronta Lda', nif: '500123456', address: 'Luanda, Angola', regime: 'Geral', coordinates: '', logo: '', footer: 'Processado por computador' }
];

let stockMovements: any[] = [];
let securityOccurrences: any[] = [];
let securityArmory: any[] = [];
let securityRoster: any[] = [];
let transactions: any[] = [];
let suppliers: any[] = [];
let purchases: any[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- API Routes (Robust Mock) ---

  app.get("/api/health", (req, res) => res.json({ status: "ok", mode: "offline" }));

  // Stats
  app.get("/api/stats", (req, res) => {
    res.json({
      totalInvoiced: issuedDocuments.reduce((acc, doc) => acc + (doc.total || 0), 0),
      pendingCount: issuedDocuments.filter(d => d.payment_status === 'pending').length,
      clientCount: clients.length,
      totalExpenses: 0,
      cashBalance: caixas.reduce((acc, c) => acc + (c.currentBalance || 0), 0),
      recentInvoices: issuedDocuments.slice(-5)
    });
  });

  // Clients
  app.get("/api/clients", (req, res) => res.json(clients));
  app.post("/api/clients", (req, res) => {
    const newClient = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
    clients.push(newClient);
    res.json(newClient);
  });
  app.put("/api/clients/:id", (req, res) => {
    const id = req.params.id;
    clients = clients.map(c => String(c.id) === String(id) ? { ...c, ...req.body } : c);
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", (req, res) => res.json(products));
  app.post("/api/products", (req, res) => {
    const newProd = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
    products.push(newProd);
    res.json(newProd);
  });

  // Invoices & Issued Documents
  app.get("/api/invoices", (req, res) => res.json(issuedDocuments));
  app.get("/api/issued-documents", (req, res) => res.json(issuedDocuments));
  app.get("/api/invoices/:id", (req, res) => {
    const doc = issuedDocuments.find(d => d.id === Number(req.params.id));
    if (doc) res.json(doc);
    else res.status(404).json({ error: "Document not found" });
  });
  app.delete("/api/invoices/:id", (req, res) => {
    const index = issuedDocuments.findIndex(d => d.id === Number(req.params.id));
    if (index !== -1) {
      issuedDocuments.splice(index, 1);
      res.json({ success: true });
    } else res.status(404).json({ error: "Document not found" });
  });
  app.post("/api/invoices/:id/clone", (req, res) => {
    const doc = issuedDocuments.find(d => d.id === Number(req.params.id));
    if (doc) {
      const cloned = { ...doc, id: Date.now(), invoice_number: `${doc.invoice_number} (CLONE)`, created_at: new Date().toISOString() };
      issuedDocuments.push(cloned);
      res.json(cloned);
    } else res.status(404).json({ error: "Document not found" });
  });
  app.post("/api/invoices", (req, res) => {
    const series = fiscalSeries.find(s => s.id === Number(req.body.series_id));
    
    // Auto-generate or use manual number
    let invoice_number = req.body.invoice_number;
    
    if (!invoice_number) {
      const counter = series ? series.counter : (issuedDocuments.length + 1);
      if (series) series.counter++;
      invoice_number = `${req.body.document_type || 'FT'} ${new Date().getFullYear()}/${series ? series.reference + '/' : ''}${counter}`;
    }

    // Strict uniqueness check
    const isDuplicate = issuedDocuments.some(d => d.invoice_number === invoice_number);
    if (isDuplicate) {
      // If auto-generated, try adding a timestamp or random suffix
      invoice_number = `${invoice_number}-${Date.now().toString().slice(-4)}`;
    }

    const newDoc = { 
      ...req.body, 
      id: Date.now(), 
      invoice_number,
      created_at: new Date().toISOString() 
    };
    issuedDocuments.push(newDoc);
    res.json(newDoc);
  });

  // Fiscal Series
  app.get("/api/fiscal-series", (req, res) => res.json(fiscalSeries));
  app.post("/api/fiscal-series", (req, res) => {
    const newSeries = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
    fiscalSeries.push(newSeries);
    res.json(newSeries);
  });

  // System Users
  app.get("/api/system-users", (req, res) => res.json(systemUsers));
  app.post("/api/system-users", (req, res) => {
    const newUser = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
    systemUsers.push(newUser);
    res.json(newUser);
  });

  // Archives
  app.get("/api/archives", (req, res) => res.json(archives));
  app.post("/api/archives", (req, res) => {
    const newFile = { ...req.body, id: Date.now(), created_at: new Date().toISOString() };
    archives.push(newFile);
    res.json(newFile);
  });

  // Fleet
  app.get("/api/fleet", (req, res) => res.json(fleetVehicles));
  app.post("/api/fleet", (req, res) => {
    const newVehicle = { ...req.body, id: Date.now() };
    fleetVehicles.push(newVehicle);
    res.json(newVehicle);
  });

  // Projects
  app.get("/api/projects/tasks", (req, res) => res.json(projectTasks));
  app.post("/api/projects/tasks", (req, res) => {
    const newTask = { ...req.body, id: Date.now() };
    projectTasks.push(newTask);
    res.json(newTask);
  });

  // Caixas
  app.get("/api/caixas", (req, res) => res.json(caixas));
  app.post("/api/caixas", (req, res) => {
    const newCaixa = { ...req.body, id: Date.now() };
    caixas.push(newCaixa);
    res.json(newCaixa);
  });

  // Work Sites
  app.get("/api/work-sites", (req, res) => res.json(workSites));
  app.post("/api/work-sites", (req, res) => {
    const newSite = { ...req.body, id: Date.now() };
    workSites.push(newSite);
    res.json(newSite);
  });

  // Transactions
  app.get("/api/transactions", (req, res) => res.json(transactions));
  app.post("/api/transactions", (req, res) => {
    const newTrans = { ...req.body, id: Date.now(), date: new Date().toISOString() };
    transactions.push(newTrans);
    res.json(newTrans);
  });

  // Suppliers & Purchases
  app.get("/api/suppliers", (req, res) => res.json(suppliers));
  app.post("/api/suppliers", (req, res) => {
    const newSupplier = { ...req.body, id: Date.now() };
    suppliers.push(newSupplier);
    res.json(newSupplier);
  });
  app.get("/api/purchases", (req, res) => res.json(purchases));
  app.post("/api/purchases", (req, res) => {
    const newPurchase = { ...req.body, id: Date.now(), date: new Date().toISOString() };
    purchases.push(newPurchase);
    res.json(newPurchase);
  });

  // Company info
  app.get("/api/company/:id", (req, res) => {
    const comp = companies.find(c => c.id === req.params.id) || companies[0];
    res.json(comp);
  });

  // Generic Catch-alls
  app.get("/api/employees", (req, res) => res.json(employees));
  app.get("/api/warehouses", (req, res) => res.json(warehouses));
  app.get("/api/caixa-movements", (req, res) => res.json(caixaMovements));
  app.get("/api/stock/movements", (req, res) => res.json(stockMovements));
  app.get("/api/security/occurrences", (req, res) => res.json(securityOccurrences));
  app.get("/api/security/armory", (req, res) => res.json(securityArmory));
  app.get("/api/security/roster", (req, res) => res.json(securityRoster));

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server (Offline Mode) running on port ${PORT}`);
  });
}

startServer();
