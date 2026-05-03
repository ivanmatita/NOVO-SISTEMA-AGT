import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const DB_FILE = path.join(process.cwd(), "db.json");

const loadData = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Error loading data from db.json:", e);
    }
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
let suppliers: any[] = savedData?.suppliers || [];
let purchases: any[] = savedData?.purchases || [];
let professions: any[] = savedData?.professions || [];
let attendance: any[] = savedData?.attendance || [];
let absences: any[] = savedData?.absences || [];
let laborTerminations: any[] = savedData?.laborTerminations || [];

const saveData = () => {
  const data = {
    clients, products, issuedDocuments, workSites, workSiteMovements,
    employees, fiscalSeries, caixas, caixaMovements, warehouses,
    systemUsers, archives, fleetVehicles, projectTasks, companies,
    stockMovements, securityOccurrences, securityArmory, securityRoster,
    transactions, receipts, suppliers, purchases, professions,
    attendance, absences, laborTerminations,
    costCenters, posPoints, sessions, posSales
  };
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error saving data to db.json:", e);
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // --- API Routes (Robust Mock) ---

  app.get("/api/health", (req, res) => res.json({ status: "ok", mode: "offline" }));

  // Reports
  app.get("/api/reports/profit-loss", (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    
    const monthsData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      
      // Calculate Revenue from certified invoices for this month
      const monthDocs = issuedDocuments.filter(d => {
        const dDate = new Date(d.date || d.created_at);
        return d.is_certified && dDate.getFullYear() === year && (dDate.getMonth() + 1) === month;
      });

      const factS = monthDocs.reduce((acc, d) => acc + (Number(d.total || d.counter_value || 0) / 1.14), 0); // approx s/ imposto
      const impRec = factS * 0.14;
      
      // Calculate Costs from transactions (type: 'expense' or similar)
      const monthTransactions = transactions.filter(t => {
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
    const newClient = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    clients.push(newClient);
    res.json(newClient);
  });
  app.put("/api/clients/:id", (req, res) => {
    const id = req.params.id;
    clients = clients.map(c => String(c.id) === String(id) ? { ...c, ...req.body } : c);
    saveData();
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", (req, res) => res.json(products));
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
      saveData();
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

      // Record receipt
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

      // Also create a "Recibo" document to show in the list
      const year = new Date().getFullYear();
      const reciboCounter = issuedDocuments.filter(d => d.document_type === 'Recibo').length + 1;
      const reciboNumber = `Recibo ${year}/${reciboCounter}`;

      const reciboDoc = {
        id: generateId(),
        document_type: 'Recibo',
        tipo_documento: 'Recibo',
        invoice_number: reciboNumber,
        numero_documento: reciboNumber,
        client_name: invoice.client_name,
        client_nif: invoice.client_nif,
        client_address: invoice.client_address,
        date: date || new Date().toISOString(),
        data_emissao: date || new Date().toISOString(),
        total: Number(amount),
        counter_value: Number(amount),
        moeda: invoice.moeda || 'Kwanza',
        payment_method: payment_method,
        cash_box: cash_box,
        is_certified: true, // Auto-certified as it is a receipt of payment
        hash: Math.random().toString(36).substring(2, 15),
        reference_document: invoice.invoice_number,
        items: [{
           description: `Liquidante da Fatura ${invoice.invoice_number}`,
           quantity: 1,
           unit_price: Number(amount),
           total: Number(amount),
           tax_rate: 0
        }]
      };
      issuedDocuments.push(reciboDoc);

      // Record caixa movement if applicable
      if (cash_box) {
        caixaMovements.push({
          id: generateStrId(),
          caixaId: cash_box,
          type: 'entrada',
          amount: Number(amount),
          moeda: invoice.moeda || 'Kwanza',
          description: `Recebimento Ref: ${invoice.invoice_number}`,
          date: new Date().toISOString()
        });
        const targetCaixa = caixas.find(c => String(c.id) === String(cash_box) || c.name === cash_box);
        if (targetCaixa) {
          targetCaixa.currentBalance = (targetCaixa.currentBalance || 0) + Number(amount);
        }
      }
      
      saveData();
      res.json({ success: true, invoice, recibo: reciboDoc });
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
        const counter = issuedDocuments.filter(d => d.document_type === associatedDocType).length + 1;
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
    const doc = issuedDocuments.find(d => d.id === Number(req.params.id));
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
        const counter = issuedDocuments.filter(d => d.document_type === targetType).length + 1;
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
    const docIndex = issuedDocuments.findIndex(d => d.id === Number(req.params.id));
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
        invoice_number = `${docType} ${series.reference}${year}/${counter}`;
      } else {
        const counter = issuedDocuments.filter(d => d.document_type === docType).length + 1;
        invoice_number = `${docType} ${new Date().getFullYear()}/${counter}`;
      }
    }

    const isDuplicate = issuedDocuments.some(d => d.invoice_number === invoice_number);
    if (isDuplicate) {
      invoice_number = `${invoice_number}-${Date.now().toString().slice(-4)}`;
    }

    const newDoc = { 
      ...req.body, 
      id: generateId(), 
      invoice_number,
      currency: req.body.currency || req.body.moeda || 'Kwanza',
      moeda: req.body.moeda || req.body.currency || 'Kwanza',
      created_at: new Date().toISOString() 
    };
    issuedDocuments.push(newDoc);
    saveData();
    res.json(newDoc);
  });

  // Fiscal Series
  app.get("/api/fiscal-series", (req, res) => res.json(fiscalSeries));
  app.post("/api/fiscal-series", (req, res) => {
    const newSeries = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    fiscalSeries.push(newSeries);
    saveData();
    res.json(newSeries);
  });

  // POS Endpoints
  app.get("/api/cost-centers", (req, res) => res.json(costCenters));
  app.get("/api/pos-points", (req, res) => res.json(posPoints));
  app.get("/api/cash/sessions", (req, res) => res.json(sessions));
  
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
  app.get("/api/system-users", (req, res) => res.json(systemUsers));
  app.post("/api/system-users", (req, res) => {
    const newUser = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    systemUsers.push(newUser);
    saveData();
    res.json(newUser);
  });

  // Archives
  app.get("/api/archives", (req, res) => res.json(archives));
  app.post("/api/archives", (req, res) => {
    const newFile = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    archives.push(newFile);
    saveData();
    res.json(newFile);
  });

  // Fleet
  app.get("/api/fleet", (req, res) => res.json(fleetVehicles));
  app.post("/api/fleet", (req, res) => {
    const newVehicle = { ...req.body, id: generateId() };
    fleetVehicles.push(newVehicle);
    saveData();
    res.json(newVehicle);
  });

  // Projects
  app.get("/api/projects/tasks", (req, res) => res.json(projectTasks));
  app.post("/api/projects/tasks", (req, res) => {
    const newTask = { ...req.body, id: generateId() };
    projectTasks.push(newTask);
    saveData();
    res.json(newTask);
  });

  // Caixas
  app.get("/api/caixas", (req, res) => res.json(caixas));
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
  app.get("/api/work-sites", (req, res) => res.json(workSites));
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
  app.get("/api/transactions", (req, res) => res.json(transactions));
  app.post("/api/transactions", (req, res) => {
    const newTrans = { ...req.body, id: generateId(), date: new Date().toISOString() };
    transactions.push(newTrans);
    saveData();
    res.json(newTrans);
  });

  // Suppliers & Purchases
  app.get("/api/suppliers", (req, res) => res.json(suppliers));
  app.post("/api/suppliers", (req, res) => {
    const newSupplier = { ...req.body, id: generateId() };
    suppliers.push(newSupplier);
    saveData();
    res.json(newSupplier);
  });
  app.get("/api/purchases", (req, res) => res.json(purchases));
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

  // Generic Catch-alls
  app.get("/api/employees", (req, res) => res.json(employees));
  app.get("/api/professions", (req, res) => res.json(professions));
  app.get("/api/employees/attendance", (req, res) => {
    if (req.query.date) {
      res.json(attendance.filter(a => a.date === req.query.date));
    } else {
      res.json(attendance);
    }
  });
  app.post("/api/employees/attendance", (req, res) => {
    const newAtt = { ...req.body, id: generateId() };
    attendance.push(newAtt);
    res.json(newAtt);
  });
  app.get("/api/employees/absences", (req, res) => res.json(absences));
  app.get("/api/labor-terminations", (req, res) => res.json(laborTerminations));
  app.get("/api/warehouses", (req, res) => res.json(warehouses));
  app.post("/api/warehouses", (req, res) => {
    const newWh = { ...req.body, id: generateId(), created_at: new Date().toISOString() };
    warehouses.push(newWh);
    res.json(newWh);
  });
  app.get("/api/caixa-movements", (req, res) => res.json(caixaMovements));
  app.get("/api/stock/movements", (req, res) => res.json(stockMovements));
  app.get("/api/security/occurrences", (req, res) => res.json(securityOccurrences));
  app.get("/api/security/armory", (req, res) => res.json(securityArmory));
  app.get("/api/security/roster", (req, res) => res.json(securityRoster));

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ERP Server (Offline Mode) running on port ${PORT}`);
  });
}

startServer();
