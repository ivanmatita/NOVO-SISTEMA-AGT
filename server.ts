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
  { id: 1, name: 'Série 2026', user_id: '1', type: 'normal', reference: 'S', counters: {}, year: 2026, is_active: true, data_inicio: '2026-01-01', destino: 'Vendas Sede' }
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

  // Reports
  app.get("/api/reports/profit-loss", (req, res) => {
    // Generate mock data for the 12 months (1-12)
    const mockData = Array.from({ length: 12 }, (_, i) => {
      const factS = Math.floor(Math.random() * 800000) + 200000;
      const impRec = factS * 0.14;
      const costs = Math.floor(Math.random() * 400000) + 100000;
      const wages = 50000;
      const inss = wages * 0.08;
      const totalCosts = costs + wages + inss;
      return {
        month: i + 1,
        facturacaoSImposto: factS,
        impostoRecebido: impRec,
        facturacaoCImposto: factS + impRec,
        custosAceites: costs * 0.8,
        fornecedoresSImposto: costs * 0.9,
        ivaSuportado: costs * 0.14,
        salarios: wages,
        inss: inss,
        totaisCustos: totalCosts,
        margem: factS - totalCosts,
      };
    });
    res.json(mockData);
  });
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
        const counter = issuedDocuments.filter(d => d.document_type === docType).length + 1;
        invoice_number = `${docType} ${new Date().getFullYear()}/${counter}`;
      }

      // Uniqueness check
      if (issuedDocuments.some(d => d.invoice_number === invoice_number)) {
        invoice_number = `${invoice_number}-${Date.now().toString().slice(-4)}`;
      }

      const cloned = { 
        ...doc, 
        id: Date.now(), 
        invoice_number, 
        is_certified: false, 
        hash: undefined,
        created_at: new Date().toISOString() 
      };
      issuedDocuments.push(cloned);
      res.json(cloned);
    } else res.status(404).json({ error: "Document not found" });
  });

  app.put("/api/invoices/:id", (req, res) => {
    const index = issuedDocuments.findIndex(d => d.id === Number(req.params.id));
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
      res.json(issuedDocuments[index]);
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  });

  // Receipts
  app.post("/api/receipts", (req, res) => {
    const { invoice_id, amount, payment_method, date, cash_box } = req.body;
    const invoice = issuedDocuments.find(d => d.id === Number(invoice_id));
    
    if (invoice) {
      if (!invoice.paid_amount) invoice.paid_amount = 0;
      invoice.paid_amount += Number(amount);
      
      const total = invoice.total || invoice.counter_value || 0;
      
      if (invoice.paid_amount >= total) {
        invoice.payment_status = 'paid';
        invoice.status = 'pago';
        invoice.estado_documento = 'ativo'; // Still active but paid
      } else if (invoice.paid_amount > 0) {
        invoice.payment_status = 'partial';
        invoice.status = 'parcial';
      }

      // Record transaction
      const newTransaction = {
        id: Date.now(),
        type: 'income',
        category: 'Vendas',
        amount: Number(amount),
        description: `Recebimento Ref: ${invoice.invoice_number}`,
        date: date || new Date().toISOString(),
        reference_id: invoice_id,
        payment_method,
        cash_box
      };
      transactions.push(newTransaction);
      
      res.json({ success: true, invoice });
    } else {
      res.status(404).json({ error: "Invoice not found" });
    }
  });

  app.get("/api/transactions", (req, res) => res.json(transactions));

  app.post("/api/invoices/:id/void", (req, res) => {
    const doc = issuedDocuments.find(d => d.id === Number(req.params.id));
    if (doc) {
      const { reason } = req.body;
      doc.status = 'anulado';
      doc.estado_documento = 'anulado';
      doc.description = 'ANULADO - SEM VALIDADE'; // Added
      doc.is_valid = false; // Added
      doc.void_reason = reason;
      doc.void_at = new Date().toISOString();
      
      // Generate associated credit note
      const series = fiscalSeries.find(s => s.id === Number(doc.series_id));
      const docType = 'Nota de Crédito';
      let nc_number = "";
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[docType]) series.counters[docType] = 1;
        const counter = series.counters[docType];
        series.counters[docType]++;
        nc_number = `${docType} ${series.reference}${new Date().getFullYear()}/${counter}`;
      }
      
      const creditNote = {
        ...doc,
        id: Date.now() + 1,
        document_type: 'Nota de Crédito',
        tipo_documento: 'Nota de Crédito',
        invoice_number: nc_number,
        reference_document: doc.invoice_number,
        total: -Math.abs(doc.total || doc.counter_value || 0),
        contravalor: -Math.abs(doc.contravalor || doc.counter_value || 0),
        created_at: new Date().toISOString(),
        is_certified: true,
        status: 'ativo'
      };
      issuedDocuments.push(creditNote);

      res.json({ success: true, creditNote });
    } else {
      res.status(404).json({ error: "Document not found" });
    }
  });

  app.post("/api/invoices/:id/certify", (req, res) => {
    const doc = issuedDocuments.find(d => d.id === Number(req.params.id));
    if (doc) {
      doc.is_certified = true;
      doc.hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      res.json({ success: true, doc });
    } else res.status(404).json({ error: "Document not found" });
  });
  app.post("/api/invoices", (req, res) => {
    const series = fiscalSeries.find(s => s.id === Number(req.body.series_id));
    const docType = req.body.document_type || 'Fatura';
    
    // Auto-generate or use manual number
    let invoice_number = req.body.invoice_number;
    
    if (!invoice_number) {
      if (series) {
        if (!series.counters) series.counters = {};
        if (!series.counters[docType]) series.counters[docType] = 1;
        const counter = series.counters[docType];
        series.counters[docType]++;
        const year = new Date().getFullYear();
        // Matching example: "docType S2026/1"
        invoice_number = `${docType} ${series.reference}${year}/${counter}`;
      } else {
        const counter = issuedDocuments.filter(d => d.document_type === docType).length + 1;
        invoice_number = `${docType} ${new Date().getFullYear()}/${counter}`;
      }
    }

    // Strict uniqueness check
    const isDuplicate = issuedDocuments.some(d => d.invoice_number === invoice_number);
    if (isDuplicate) {
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
