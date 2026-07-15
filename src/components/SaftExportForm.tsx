import React, { useState, useMemo } from 'react';
import { Invoice, Purchase, Client, Product } from '../types';
import {
  Download, FileCode, CheckCircle2, AlertCircle,
  FileText, ShoppingCart, Users, Package, Calendar,
  ChevronLeft, ChevronDown
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type SaftType = 'F' | 'A';

interface Props {
  invoices?: Invoice[];
  purchases?: Purchase[];
  clients?: Client[];
  products?: Product[];
  companyData?: any;
  onBack?: () => void;
  defaultYear?: string;
  defaultMonth?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const esc = (s: any): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const n8 = (v: number) => v.toFixed(8);
const n2 = (v: number) => v.toFixed(2);

const fmtDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().replace('Z', '').split('.')[0];
    return d.toISOString().replace('Z', '').split('.')[0];
  } catch {
    return new Date().toISOString().replace('Z', '').split('.')[0];
  }
};

const fmtAmt = (v: number) => n2(v);

const invoiceTypeCode = (doc: Invoice): string => {
  const tp = (doc.document_type || doc.tipo_documento || 'FT').trim().toUpperCase();
  if (tp.includes('NOTA DE CRÉDITO') || tp === 'NC') return 'NC';
  if (tp.includes('NOTA DE DÉBITO') || tp === 'ND') return 'ND';
  if (tp.includes('FATURA RECIBO') || tp.includes('FACTURA RECIBO') || tp === 'FR') return 'FR';
  if (tp === 'RECIBO' || tp === 'RC') return 'RC';
  if (tp.includes('CONSULTA') || tp === 'CC') return 'CC';
  if (tp.includes('PROFORMA') || tp === 'PF') return 'PF';
  return 'FT';
};

const workTypeCode = (doc: Purchase): string => {
  const tp = (doc.document_type || doc.tipo_documento || '').trim().toUpperCase();
  if (tp.includes('PROFORMA') || tp === 'PF') return 'PF';
  if (tp.includes('CONSULTA') || tp === 'CC') return 'CC';
  if (tp.includes('ENCOMENDA') || tp === 'PP') return 'PP';
  return 'PP';
};

const invoiceStatus = (doc: Invoice): string => {
  if (doc.is_anulado || doc.status === 'anulado') return 'A';
  return 'N';
};

// ─────────────────────────────────────────────────────────────────────────────
// XML builder — SAF-T F (Faturas)
// ─────────────────────────────────────────────────────────────────────────────
const buildSaftXml = (
  invoices: Invoice[],
  purchases: Purchase[],
  clients: Client[],
  products: Product[],
  companyData: any,
  startDate: string,
  endDate: string,
  saftType: SaftType
): string => {
  const now = new Date();
  const fiscalYear = startDate ? startDate.substring(0, 4) : String(now.getFullYear());
  const dateCreated = now.toISOString().split('T')[0];
  const period = startDate ? startDate.substring(5, 7) : String(now.getMonth() + 1).padStart(2, '0');

  const co = companyData || {};
  const companyName = esc(co.name || co.nome_empresa || 'Empresa');
  const nif = esc(co.nif || '000000000');
  const address = esc(co.address || co.morada || 'NA');
  const city = esc(co.city || co.provincia || 'Luanda');
  const province = esc(co.provincia || 'Luanda');
  const phone = esc(co.contact || co.telefone || '');
  const email = esc(co.email || '');

  const filterByPeriod = (date: string): boolean => {
    if (!startDate && !endDate) return true;
    const d = date ? date.substring(0, 10) : '';
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const filteredInvoices = invoices.filter(i => filterByPeriod(i.date || i.data_emissao || ''));
  const filteredPurchases = purchases.filter(p => filterByPeriod(p.date || p.data_emissao || ''));

  // Customers / Suppliers
  const customerMap = new Map<string, any>();

  if (saftType === 'F') {
    customerMap.set('0', {
      id: '0', accountId: '0', nif: '999999999',
      name: 'Consumidor Final', address: 'Desconhecido',
      city: 'Desconhecido', postalCode: 'Desconhecido',
      province: 'Desconhecido', country: 'Desconhecido',
    });
    filteredInvoices.forEach(inv => {
      const cid = String(inv.client_id || '0');
      if (!customerMap.has(cid)) {
        const c = clients.find(cl => String(cl.id) === cid);
        customerMap.set(cid, {
          id: cid,
          accountId: `31.01.02.01.${cid.padStart(4, '0')}`,
          nif: esc(inv.client_nif || c?.contribuinte || c?.nif || '999999999'),
          name: esc(inv.client_name || c?.name || 'Desconhecido'),
          address: esc(c?.morada || c?.endereco || 'NA'),
          city: esc(c?.localidade || c?.provincia || 'Luanda'),
          postalCode: esc(c?.codigo_postal || '0000-000'),
          province: esc(c?.provincia || 'Luanda'),
          country: 'AO',
        });
      }
    });
  } else {
    // For Compras (SAF-T A), populate customerMap with suppliers to satisfy CustomerID references in WorkingDocuments!
    filteredPurchases.forEach(p => {
      const sid = String(p.supplier_id || '0');
      if (!customerMap.has(sid)) {
        customerMap.set(sid, {
          id: sid,
          accountId: `22.01.01.01.${sid.padStart(4, '0')}`,
          nif: esc((p as any).supplier_nif || (p as any).nif || '999999999'),
          name: esc(p.supplier_name || 'Fornecedor Desconhecido'),
          address: esc((p as any).supplier_address || 'NA'),
          city: esc((p as any).supplier_city || 'Luanda'),
          postalCode: esc((p as any).supplier_postal_code || '0000-000'),
          province: esc((p as any).supplier_province || 'Luanda'),
          country: 'AO',
        });
      }
    });
  }

  // Products
  const productMap = new Map<string, any>();
  productMap.set('0', { code: '0', group: 'NA', description: 'Sem Produtos', numberCode: '0', type: 'S' });

  if (saftType === 'F') {
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const pid = String(item.product_id || '0');
        if (!productMap.has(pid)) {
          const p = products.find(pr => String(pr.id) === pid);
          productMap.set(pid, {
            code: pid, group: esc(p?.category || 'NA'),
            description: esc(item.description || p?.name || 'Produto'),
            numberCode: pid, type: 'P',
          });
        }
      });
    });
  } else {
    filteredPurchases.forEach(p => {
      (p.items || []).forEach((item: any) => {
        const pid = String(item.product_id || item.product_code || '0');
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            code: pid, group: 'NA',
            description: esc(item.description || 'Produto/Serviço'),
            numberCode: pid, type: 'P',
          });
        }
      });
    });
  }

  // Tax rates
  const taxRates = new Set<number>();
  taxRates.add(14);
  if (saftType === 'F') {
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => taxRates.add(Number(item.tax_rate ?? 14)));
    });
  } else {
    filteredPurchases.forEach(p => {
      (p.items || []).forEach((item: any) => taxRates.add(Number(item.tax_rate ?? 14)));
    });
  }

  const totalCredit = filteredInvoices.reduce((s, inv) => {
    const items: any[] = Array.isArray(inv.items) ? inv.items : [];
    const net = items.reduce((si, item) => si + Number(item.total || 0), 0) || Number(inv.total || 0);
    return s + net;
  }, 0);
  const totalDebit = filteredInvoices
    .filter(i => invoiceTypeCode(i) === 'NC')
    .reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPurchasesCredit = filteredPurchases.reduce((s, p) => s + Number(p.total || 0), 0);

  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<AuditFile>`);

  // Header
  lines.push(`<Header xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.01_01" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`);
  lines.push(`  <AuditFileVersion>1.01_01</AuditFileVersion>`);
  lines.push(`  <CompanyID>${esc(co.matricula || co.alvara || 'NA')}</CompanyID>`);
  lines.push(`  <TaxRegistrationNumber>${nif}</TaxRegistrationNumber>`);
  lines.push(`  <TaxAccountingBasis>${saftType}</TaxAccountingBasis>`);
  lines.push(`  <CompanyName>${companyName}</CompanyName>`);
  lines.push(`  <CompanyAddress>`);
  lines.push(`    <BuildingNumber>NA</BuildingNumber>`);
  lines.push(`    <StreetName>NA</StreetName>`);
  lines.push(`    <AddressDetail>${address}</AddressDetail>`);
  lines.push(`    <City>${city}</City>`);
  lines.push(`    <PostalCode>${esc(co.codigo_postal || '0000000')}</PostalCode>`);
  lines.push(`    <Province>${province}</Province>`);
  lines.push(`    <Country>AO</Country>`);
  lines.push(`  </CompanyAddress>`);
  lines.push(`  <FiscalYear>${fiscalYear}</FiscalYear>`);
  lines.push(`  <StartDate>${startDate || `${fiscalYear}-01-01`}</StartDate>`);
  lines.push(`  <EndDate>${endDate || `${fiscalYear}-12-31`}</EndDate>`);
  lines.push(`  <CurrencyCode>AOA</CurrencyCode>`);
  lines.push(`  <DateCreated>${dateCreated}</DateCreated>`);
  lines.push(`  <TaxEntity>${city}</TaxEntity>`);
  lines.push(`  <ProductCompanyTaxID>${nif}</ProductCompanyTaxID>`);
  lines.push(`  <SoftwareValidationNumber>25/AGT/2019</SoftwareValidationNumber>`);
  lines.push(`  <ProductID>AGT-Sistema/${companyName}</ProductID>`);
  lines.push(`  <ProductVersion>1</ProductVersion>`);
  if (phone) lines.push(`  <Telephone>${phone}</Telephone>`);
  if (email) lines.push(`  <Email>${email}</Email>`);
  lines.push(`</Header>`);

  // MasterFiles
  lines.push(`<MasterFiles>`);
  
  // Customers are generated for both types (for SAF-T A, suppliers are declared as Customers because WorkingDocuments reference CustomerID)
  customerMap.forEach(c => {
    lines.push(`  <Customer>`);
    lines.push(`    <CustomerID>${esc(c.id)}</CustomerID>`);
    lines.push(`    <AccountID>${esc(c.accountId)}</AccountID>`);
    lines.push(`    <CustomerTaxID>${esc(c.nif)}</CustomerTaxID>`);
    lines.push(`    <CompanyName>${esc(c.name)}</CompanyName>`);
    lines.push(`    <Contact/>`);
    lines.push(`    <BillingAddress>`);
    lines.push(`      <AddressDetail>${esc(c.address)}</AddressDetail>`);
    lines.push(`      <City>${esc(c.city)}</City>`);
    lines.push(`      <PostalCode>${esc(c.postalCode)}</PostalCode>`);
    lines.push(`      <Province>${esc(c.province)}</Province>`);
    lines.push(`      <Country>${esc(c.country)}</Country>`);
    lines.push(`    </BillingAddress>`);
    lines.push(`    <ShipToAddress>`);
    lines.push(`      <BuildingNumber>NA</BuildingNumber>`);
    lines.push(`      <StreetName>NA</StreetName>`);
    lines.push(`      <AddressDetail>${esc(c.address)}</AddressDetail>`);
    lines.push(`      <City>${esc(c.city)}</City>`);
    lines.push(`      <PostalCode>${esc(c.postalCode)}</PostalCode>`);
    lines.push(`      <Province>${esc(c.province)}</Province>`);
    lines.push(`      <Country>${esc(c.country)}</Country>`);
    lines.push(`    </ShipToAddress>`);
    lines.push(`    <SelfBillingIndicator>0</SelfBillingIndicator>`);
    lines.push(`  </Customer>`);
  });

  // For SAF-T A, also generate Supplier records for completeness
  if (saftType === 'A') {
    customerMap.forEach(s => {
      if (s.id === '0') return;
      lines.push(`  <Supplier>`);
      lines.push(`    <SupplierID>${esc(s.id)}</SupplierID>`);
      lines.push(`    <AccountID>${esc(s.accountId)}</AccountID>`);
      lines.push(`    <SupplierTaxID>${esc(s.nif)}</SupplierTaxID>`);
      lines.push(`    <CompanyName>${esc(s.name)}</CompanyName>`);
      lines.push(`    <Contact/>`);
      lines.push(`    <BillingAddress>`);
      lines.push(`      <AddressDetail>${esc(s.address)}</AddressDetail>`);
      lines.push(`      <City>${esc(s.city)}</City>`);
      lines.push(`      <PostalCode>${esc(s.postalCode)}</PostalCode>`);
      lines.push(`      <Province>${esc(s.province)}</Province>`);
      lines.push(`      <Country>${esc(s.country)}</Country>`);
      lines.push(`    </BillingAddress>`);
      lines.push(`    <SelfBillingIndicator>0</SelfBillingIndicator>`);
      lines.push(`  </Supplier>`);
    });
  }

  // Products
  productMap.forEach(p => {
    lines.push(`  <Product>`);
    lines.push(`    <ProductType>${esc(p.type)}</ProductType>`);
    lines.push(`    <ProductCode>${esc(p.code)}</ProductCode>`);
    lines.push(`    <ProductGroup>${esc(p.group)}</ProductGroup>`);
    lines.push(`    <ProductDescription>${esc(p.description)}</ProductDescription>`);
    lines.push(`    <ProductNumberCode>${esc(p.numberCode)}</ProductNumberCode>`);
    lines.push(`  </Product>`);
  });
  lines.push(`  <TaxTable>`);
  taxRates.forEach(rate => {
    const code = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : 'NOR';
    const desc = rate === 0 ? 'Isento' : `IVA ${rate}%`;
    lines.push(`    <TaxTableEntry>`);
    lines.push(`      <TaxType>IVA</TaxType>`);
    lines.push(`      <TaxCountryRegion>AO</TaxCountryRegion>`);
    lines.push(`      <TaxCode>${code}</TaxCode>`);
    lines.push(`      <Description>${esc(desc)}</Description>`);
    lines.push(`      <TaxExpirationDate>2099-12-31</TaxExpirationDate>`);
    lines.push(`      <TaxPercentage>${rate.toFixed(2)}</TaxPercentage>`);
    lines.push(`    </TaxTableEntry>`);
  });
  lines.push(`  </TaxTable>`);
  lines.push(`</MasterFiles>`);

  lines.push(`<SourceDocuments>`);

  if (saftType === 'F') {
    // SalesInvoices only
    const salesInvoices = filteredInvoices.filter(i => {
      const tp = invoiceTypeCode(i);
      return tp === 'FT' || tp === 'FR' || tp === 'RC' || tp === 'NC' || tp === 'ND';
    });
    lines.push(`  <SalesInvoices>`);
    lines.push(`    <NumberOfEntries>${salesInvoices.length}</NumberOfEntries>`);
    lines.push(`    <TotalDebit>${n2(totalDebit)}</TotalDebit>`);
    lines.push(`    <TotalCredit>${n2(totalCredit)}</TotalCredit>`);
    salesInvoices.forEach((inv) => {
      const items: any[] = Array.isArray(inv.items) ? inv.items : [];
      const invDate = (inv.date || inv.data_emissao || '').substring(0, 10);
      const entryDate = fmtDateTime(inv.created_at || inv.date || '');
      const cid = String(inv.client_id || '0');
      const c = customerMap.get(cid) || customerMap.get('0')!;
      const invType = invoiceTypeCode(inv);
      const status = invoiceStatus(inv);
      const hash = esc(inv.hash || inv.hash_documento || inv.hash_fiscal || '');
      const docNum = esc(inv.invoice_number || inv.numero_documento || `DOC-${inv.id}`);
      let netTotal = 0;
      let taxPayable = 0;
      if (items.length > 0) {
        items.forEach(item => {
          const lineTotal = Number(item.total || 0);
          const rate = Number(item.tax_rate ?? 14) / 100;
          const net = lineTotal / (1 + rate);
          netTotal += net;
          taxPayable += lineTotal - net;
        });
      } else {
        const gross = Number(inv.total || 0);
        netTotal = gross / 1.14;
        taxPayable = gross - netTotal;
      }
      const grossTotal = netTotal + taxPayable;
      lines.push(`    <Invoice>`);
      lines.push(`      <InvoiceNo>${docNum}</InvoiceNo>`);
      lines.push(`      <DocumentStatus>`);
      lines.push(`        <InvoiceStatus>${status}</InvoiceStatus>`);
      lines.push(`        <InvoiceStatusDate>${entryDate}</InvoiceStatusDate>`);
      lines.push(`        <Reason>${esc(inv.motivo_anulacao || '')}</Reason>`);
      lines.push(`        <SourceID>${esc(inv.created_by || inv.criado_por || '1')}</SourceID>`);
      lines.push(`        <SourceBilling>P</SourceBilling>`);
      lines.push(`      </DocumentStatus>`);
      lines.push(`      <Hash>${hash}</Hash>`);
      lines.push(`      <HashControl>1</HashControl>`);
      lines.push(`      <Period>${period}</Period>`);
      lines.push(`      <InvoiceDate>${invDate}</InvoiceDate>`);
      lines.push(`      <InvoiceType>${invType}</InvoiceType>`);
      lines.push(`      <SpecialRegimes>`);
      lines.push(`        <SelfBillingIndicator>0</SelfBillingIndicator>`);
      lines.push(`        <CashVATSchemeIndicator>0</CashVATSchemeIndicator>`);
      lines.push(`        <ThirdPartiesBillingIndicator>0</ThirdPartiesBillingIndicator>`);
      lines.push(`      </SpecialRegimes>`);
      lines.push(`      <SourceID>${esc(inv.created_by || '1')}</SourceID>`);
      lines.push(`      <SystemEntryDate>${entryDate}</SystemEntryDate>`);
      lines.push(`      <CustomerID>${esc(cid)}</CustomerID>`);
      lines.push(`      <ShipTo>`);
      lines.push(`        <DeliveryDate>${invDate}</DeliveryDate>`);
      lines.push(`        <Address>`);
      lines.push(`          <AddressDetail>${esc(c.address)}</AddressDetail>`);
      lines.push(`          <City>${esc(c.city)}</City>`);
      lines.push(`          <PostalCode>${esc(c.postalCode)}</PostalCode>`);
      lines.push(`          <Country>${esc(c.country)}</Country>`);
      lines.push(`        </Address>`);
      lines.push(`      </ShipTo>`);
      lines.push(`      <ShipFrom>`);
      lines.push(`        <DeliveryDate>${invDate}</DeliveryDate>`);
      lines.push(`        <Address>`);
      lines.push(`          <AddressDetail>${address}</AddressDetail>`);
      lines.push(`          <City>${city}</City>`);
      lines.push(`          <PostalCode>${esc(co.codigo_postal || '0000-000')}</PostalCode>`);
      lines.push(`          <Country>AO</Country>`);
      lines.push(`        </Address>`);
      lines.push(`      </ShipFrom>`);
      lines.push(`      <MovementStartTime>${entryDate}</MovementStartTime>`);
      if (items.length > 0) {
        items.forEach((item, idx) => {
          const pid = String(item.product_id || '0');
          const rate = Number(item.tax_rate ?? 14);
          const taxCode = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : 'NOR';
          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || 0);
          const lineTotal = Number(item.total || qty * unitPrice);
          const isCredit = invType !== 'NC';
          lines.push(`      <Line>`);
          lines.push(`        <LineNumber>${idx + 1}</LineNumber>`);
          if (inv.numero_documento_origem) {
            lines.push(`        <OrderReferences>`);
            lines.push(`          <OriginatingON>${esc(inv.numero_documento_origem)}</OriginatingON>`);
            lines.push(`          <OrderDate>${invDate}</OrderDate>`);
            lines.push(`        </OrderReferences>`);
          }
          lines.push(`        <ProductCode>${esc(pid)}</ProductCode>`);
          lines.push(`        <ProductDescription>${esc(item.description || 'Produto/Serviço')}</ProductDescription>`);
          lines.push(`        <Quantity>${n8(qty)}</Quantity>`);
          lines.push(`        <UnitOfMeasure>${esc(item.unit || item.unidade || 'Un')}</UnitOfMeasure>`);
          lines.push(`        <UnitPrice>${n8(unitPrice)}</UnitPrice>`);
          lines.push(`        <TaxPointDate>${invDate}</TaxPointDate>`);
          lines.push(`        <Description>${esc(item.description || 'Produto/Serviço')}</Description>`);
          if (isCredit) {
            lines.push(`        <CreditAmount>${n8(lineTotal)}</CreditAmount>`);
          } else {
            lines.push(`        <DebitAmount>${n8(lineTotal)}</DebitAmount>`);
          }
          lines.push(`        <Tax>`);
          lines.push(`          <TaxType>IVA</TaxType>`);
          lines.push(`          <TaxCountryRegion>AO</TaxCountryRegion>`);
          lines.push(`          <TaxCode>${taxCode}</TaxCode>`);
          lines.push(`          <TaxPercentage>${rate}</TaxPercentage>`);
          lines.push(`        </Tax>`);
          lines.push(`        <SettlementAmount>0.00000000</SettlementAmount>`);
          lines.push(`      </Line>`);
        });
      } else {
        const lineTotal = Number(inv.total || 0);
        const isCredit = invType !== 'NC';
        lines.push(`      <Line>`);
        lines.push(`        <LineNumber>1</LineNumber>`);
        lines.push(`        <ProductCode>0</ProductCode>`);
        lines.push(`        <ProductDescription>Serviço/Produto</ProductDescription>`);
        lines.push(`        <Quantity>1.00000000</Quantity>`);
        lines.push(`        <UnitOfMeasure>Un</UnitOfMeasure>`);
        lines.push(`        <UnitPrice>${n8(lineTotal / 1.14)}</UnitPrice>`);
        lines.push(`        <TaxPointDate>${invDate}</TaxPointDate>`);
        lines.push(`        <Description>Serviço/Produto</Description>`);
        if (isCredit) {
          lines.push(`        <CreditAmount>${n8(lineTotal / 1.14)}</CreditAmount>`);
        } else {
          lines.push(`        <DebitAmount>${n8(lineTotal / 1.14)}</DebitAmount>`);
        }
        lines.push(`        <Tax>`);
        lines.push(`          <TaxType>IVA</TaxType>`);
        lines.push(`          <TaxCountryRegion>AO</TaxCountryRegion>`);
        lines.push(`          <TaxCode>NOR</TaxCode>`);
        lines.push(`          <TaxPercentage>14</TaxPercentage>`);
        lines.push(`        </Tax>`);
        lines.push(`        <SettlementAmount>0.00000000</SettlementAmount>`);
        lines.push(`      </Line>`);
      }
      lines.push(`      <DocumentTotals>`);
      lines.push(`        <TaxPayable>${fmtAmt(taxPayable)}</TaxPayable>`);
      lines.push(`        <NetTotal>${n8(netTotal)}</NetTotal>`);
      lines.push(`        <GrossTotal>${fmtAmt(grossTotal)}</GrossTotal>`);
      lines.push(`      </DocumentTotals>`);
      lines.push(`      <WithholdingTax>`);
      lines.push(`        <WithholdingTaxType>II</WithholdingTaxType>`);
      lines.push(`        <WithholdingTaxDescription>Lei 19/14 - Art.º67 N.º1</WithholdingTaxDescription>`);
      lines.push(`        <WithholdingTaxAmount>${n8(Number(inv.retencao_fonte_total || 0))}</WithholdingTaxAmount>`);
      lines.push(`      </WithholdingTax>`);
      lines.push(`    </Invoice>`);
    });
    lines.push(`  </SalesInvoices>`);
  } else {
    // WorkingDocuments only (SAF-T A)
    const workDocs = filteredPurchases;
    lines.push(`  <WorkingDocuments>`);
    lines.push(`    <NumberOfEntries>${workDocs.length}</NumberOfEntries>`);
    lines.push(`    <TotalDebit>0.00</TotalDebit>`);
    lines.push(`    <TotalCredit>${n2(totalPurchasesCredit)}</TotalCredit>`);
    workDocs.forEach((p) => {
      const items: any[] = Array.isArray(p.items) ? p.items : [];
      const pDate = (p.date || p.data_emissao || '').substring(0, 10);
      const entryDate = fmtDateTime((p as any).created_at || p.date || '');
      const docNum = esc(p.purchase_number || p.invoice_number || p.numero_documento || `PUR-${p.id}`);
      const wType = workTypeCode(p);
      const supplierId = String(p.supplier_id || '0');
      let netTotal = 0;
      let taxPayable = 0;
      if (items.length > 0) {
        items.forEach(item => {
          const lineTotal = Number(item.total || 0);
          const rate = Number(item.tax_rate ?? 14) / 100;
          const net = lineTotal / (1 + rate);
          netTotal += net;
          taxPayable += lineTotal - net;
        });
      } else {
        const gross = Number(p.total || 0);
        netTotal = gross / 1.14;
        taxPayable = gross - netTotal;
      }
      const grossTotal = netTotal + taxPayable;
      lines.push(`    <WorkDocument>`);
      lines.push(`      <DocumentNumber>${docNum}</DocumentNumber>`);
      lines.push(`      <DocumentStatus>`);
      lines.push(`        <WorkStatus>${p.status === 'completed' ? 'F' : p.status === 'anulado' ? 'A' : 'N'}</WorkStatus>`);
      lines.push(`        <WorkStatusDate>${entryDate}</WorkStatusDate>`);
      lines.push(`        <Reason/>`);
      lines.push(`        <SourceID>${esc(p.created_by || '1')}</SourceID>`);
      lines.push(`        <SourceBilling>P</SourceBilling>`);
      lines.push(`      </DocumentStatus>`);
      lines.push(`      <Hash>${esc(p.hash || '')}</Hash>`);
      lines.push(`      <HashControl>1</HashControl>`);
      lines.push(`      <Period>${period}</Period>`);
      lines.push(`      <WorkDate>${pDate}</WorkDate>`);
      lines.push(`      <WorkType>${wType}</WorkType>`);
      lines.push(`      <SourceID>${esc(p.created_by || '1')}</SourceID>`);
      lines.push(`      <SystemEntryDate>${entryDate}</SystemEntryDate>`);
      lines.push(`      <TransactionID/>`);
      lines.push(`      <CustomerID>${esc(supplierId)}</CustomerID>`);
      if (items.length > 0) {
        items.forEach((item, idx) => {
          const pid = String(item.product_id || '0');
          const rate = Number(item.tax_rate ?? item.taxa ?? 14);
          const taxCode = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : 'NOR';
          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || 0);
          const lineTotal = Number(item.total || qty * unitPrice);
          lines.push(`      <Line>`);
          lines.push(`        <LineNumber>${idx + 1}</LineNumber>`);
          lines.push(`        <ProductCode>${esc(pid)}</ProductCode>`);
          lines.push(`        <ProductDescription>${esc(item.description || 'Produto')}</ProductDescription>`);
          lines.push(`        <Quantity>${n8(qty)}</Quantity>`);
          lines.push(`        <UnitOfMeasure>${esc(item.unit || 'Un')}</UnitOfMeasure>`);
          lines.push(`        <UnitPrice>${n8(unitPrice)}</UnitPrice>`);
          lines.push(`        <TaxPointDate>${pDate}</TaxPointDate>`);
          lines.push(`        <Description>${esc(item.description || 'Produto')}</Description>`);
          lines.push(`        <CreditAmount>${n8(lineTotal)}</CreditAmount>`);
          lines.push(`        <Tax>`);
          lines.push(`          <TaxType>IVA</TaxType>`);
          lines.push(`          <TaxCountryRegion>AO</TaxCountryRegion>`);
          lines.push(`          <TaxCode>${taxCode}</TaxCode>`);
          lines.push(`          <TaxPercentage>${rate}</TaxPercentage>`);
          lines.push(`        </Tax>`);
          lines.push(`        <SettlementAmount>0.00000000</SettlementAmount>`);
          lines.push(`      </Line>`);
        });
      } else {
        const lineTotal = Number(p.total || 0);
        lines.push(`      <Line>`);
        lines.push(`        <LineNumber>1</LineNumber>`);
        lines.push(`        <ProductCode>0</ProductCode>`);
        lines.push(`        <ProductDescription>Compra/Serviço</ProductDescription>`);
        lines.push(`        <Quantity>1.00000000</Quantity>`);
        lines.push(`        <UnitOfMeasure>Un</UnitOfMeasure>`);
        lines.push(`        <UnitPrice>${n8(lineTotal / 1.14)}</UnitPrice>`);
        lines.push(`        <TaxPointDate>${pDate}</TaxPointDate>`);
        lines.push(`        <Description>Compra/Serviço</Description>`);
        lines.push(`        <CreditAmount>${n8(lineTotal / 1.14)}</CreditAmount>`);
        lines.push(`        <Tax>`);
        lines.push(`          <TaxType>IVA</TaxType>`);
        lines.push(`          <TaxCountryRegion>AO</TaxCountryRegion>`);
        lines.push(`          <TaxCode>NOR</TaxCode>`);
        lines.push(`          <TaxPercentage>14</TaxPercentage>`);
        lines.push(`        </Tax>`);
        lines.push(`        <SettlementAmount>0.00000000</SettlementAmount>`);
        lines.push(`      </Line>`);
      }
      lines.push(`      <DocumentTotals>`);
      lines.push(`        <TaxPayable>${fmtAmt(taxPayable)}</TaxPayable>`);
      lines.push(`        <NetTotal>${n2(netTotal)}</NetTotal>`);
      lines.push(`        <GrossTotal>${fmtAmt(grossTotal)}</GrossTotal>`);
      lines.push(`      </DocumentTotals>`);
      lines.push(`    </WorkDocument>`);
    });
    lines.push(`  </WorkingDocuments>`);
  }

  lines.push(`</SourceDocuments>`);
  lines.push(`</AuditFile>`);
  return lines.join('\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// Download helper
// ─────────────────────────────────────────────────────────────────────────────
const downloadXml = (xml: string, filename: string) => {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
const SaftExportForm: React.FC<Props> = ({
  invoices = [],
  purchases = [],
  clients = [],
  products = [],
  companyData,
  onBack,
  defaultYear,
  defaultMonth,
}) => {
  const [saftType, setSaftType] = useState<SaftType>('F');
  const [startDate, setStartDate] = useState(() => {
    const y = defaultYear || String(new Date().getFullYear());
    const m = defaultMonth || String(new Date().getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const y = defaultYear || String(new Date().getFullYear());
    const m = defaultMonth || String(new Date().getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    return `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  });
  const [previewXml, setPreviewXml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generated, setGenerated] = useState(false);

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2 }).format(v);

  // ── Period filter ──────────────────────────────────────────────────────────
  const filterByPeriod = (date: string): boolean => {
    if (!startDate && !endDate) return true;
    const d = date ? date.substring(0, 10) : '';
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const filteredInv = useMemo(
    () => invoices.filter(i => filterByPeriod(i.date || i.data_emissao || '')),
    [invoices, startDate, endDate]
  );
  const filteredPur = useMemo(
    () => purchases.filter(p => filterByPeriod(p.date || p.data_emissao || '')),
    [purchases, startDate, endDate]
  );

  const totalInv = filteredInv.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPur = filteredPur.reduce((s, p) => s + Number(p.total || 0), 0);
  const uniqueClients = new Set(filteredInv.map(i => i.client_id)).size;
  const totalItems = filteredInv.reduce((s, i) => s + (i.items?.length || 0), 0);

  const byType: Record<string, { count: number; total: number }> = {};
  filteredInv.forEach(inv => {
    const tp = inv.document_type || inv.tipo_documento || 'Fatura';
    if (!byType[tp]) byType[tp] = { count: 0, total: 0 };
    byType[tp].count++;
    byType[tp].total += Number(inv.total || 0);
  });

  // Active counts/totals depending on type
  const activeCount = saftType === 'F' ? filteredInv.length : filteredPur.length;
  const activeTotal = saftType === 'F' ? totalInv : totalPur;

  const handleGenerate = () => {
    const xml = buildSaftXml(invoices, purchases, clients, products, companyData, startDate, endDate, saftType);
    setPreviewXml(xml);
    setGenerated(true);
  };

  const handleDownload = () => {
    const xml = buildSaftXml(invoices, purchases, clients, products, companyData, startDate, endDate, saftType);
    const nif = companyData?.nif || '000000000';
    const sd = startDate || new Date().toISOString().substring(0, 10);
    const ed = endDate || new Date().toISOString().substring(0, 10);
    downloadXml(xml, `SAF-T_${saftType}_AO_${nif}_${sd}_${ed}.xml`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="bg-zinc-100 min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="bg-[#003366] text-white p-5 flex items-center gap-4 shadow-xl">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded transition-colors">
            <ChevronLeft size={22} />
          </button>
        )}
        <FileCode size={28} />
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">
            Ficheiro SAF-T (Standard Audit File for Tax) — Angola
          </h1>
          <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest">
            Formato: AO_1.01_01 | urn:OECD:StandardAuditFile-Tax:AO_1.01_01
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <span className="bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            {filteredInv.length} FATURAS
          </span>
          <span className="bg-white/20 border border-white/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            {filteredPur.length} COMPRAS
          </span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left panel: controls */}
        <div className="col-span-4 space-y-4">

          {/* SAF-T Type selector — dropdown with arrow */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <FileCode size={16} className="text-[#003366]" />
              <h2 className="text-[11px] font-black uppercase text-[#003366] tracking-widest">
                Tipo de Ficheiro SAF-T
              </h2>
            </div>
            <div className="relative">
              <select
                value={saftType}
                onChange={e => {
                  setSaftType(e.target.value as SaftType);
                  setGenerated(false);
                  setShowPreview(false);
                  setPreviewXml('');
                }}
                className="w-full appearance-none border border-zinc-300 bg-zinc-50 px-4 py-3 pr-10 text-xs font-black uppercase tracking-widest text-[#003366] focus:outline-none focus:border-[#003366] cursor-pointer"
              >
                <option value="F">SAF-T F — Faturas de Venda</option>
                <option value="A">SAF-T A — Compras / Aquisições</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003366] pointer-events-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">TaxAccountingBasis:</span>
              <span className="text-sm font-black text-[#003366] font-mono">{saftType}</span>
              <span className="ml-auto text-[9px] font-bold text-zinc-500 uppercase">
                {activeCount} documentos · {fmt(activeTotal)} AOA
              </span>
            </div>
          </div>

          {/* Period */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Calendar size={16} className="text-[#003366]" />
              <h2 className="text-[11px] font-black uppercase text-[#003366] tracking-widest">
                Período de Exportação
              </h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => { setStartDate(e.target.value); setGenerated(false); }}
                  className="w-full border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest block mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => { setEndDate(e.target.value); setGenerated(false); }}
                  className="w-full border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <FileText size={16} className="text-[#003366]" />
              <h2 className="text-[11px] font-black uppercase text-[#003366] tracking-widest">
                Dados da Empresa
              </h2>
            </div>
            <div className="space-y-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Nome</span>
                <span className="font-black text-zinc-900 text-right max-w-[60%] truncate">
                  {companyData?.name || companyData?.nome_empresa || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">NIF</span>
                <span className="font-mono font-black text-[#003366]">
                  {companyData?.nif || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Morada</span>
                <span className="font-black text-zinc-900 text-right max-w-[60%] truncate">
                  {companyData?.address || companyData?.morada || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400 font-bold uppercase">Regime</span>
                <span className="font-black text-zinc-900">
                  {companyData?.regime || 'F'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h2 className="text-[11px] font-black uppercase text-[#003366] tracking-widest">
                Conteúdo a Exportar
              </h2>
            </div>
            <div className="space-y-2">
              {saftType === 'F' ? (
                <>
                  {[
                    { icon: <FileText size={14} className="text-blue-600" />, label: 'Faturas / Documentos', value: filteredInv.length },
                    { icon: <Users size={14} className="text-purple-600" />, label: 'Clientes únicos', value: uniqueClients },
                    { icon: <Package size={14} className="text-amber-600" />, label: 'Linhas de produto', value: totalItems },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <span className="font-black text-[#003366] text-sm font-mono">{stat.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400 font-bold uppercase">Total Vendas</span>
                      <span className="font-black text-blue-700 font-mono">{fmt(totalInv)} AOA</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {[
                    { icon: <ShoppingCart size={14} className="text-emerald-600" />, label: 'Compras', value: filteredPur.length },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase">
                        {stat.icon}
                        {stat.label}
                      </div>
                      <span className="font-black text-[#003366] text-sm font-mono">{stat.value}</span>
                    </div>
                  ))}
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400 font-bold uppercase">Total Compras</span>
                      <span className="font-black text-emerald-700 font-mono">{fmt(totalPur)} AOA</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleGenerate}
              className="w-full bg-[#003366] text-white py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#002244] transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <FileCode size={18} />
              Gerar XML SAF-T {saftType} AO
            </button>
            <button
              onClick={handleDownload}
              className="w-full bg-emerald-600 text-white py-4 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-xl"
            >
              <Download size={18} />
              Descarregar Ficheiro .xml
            </button>
            {generated && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="w-full border-2 border-[#003366] text-[#003366] py-3 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
              >
                {showPreview ? 'Ocultar' : 'Pré-visualizar'} XML
              </button>
            )}
          </div>

          {generated && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-3">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <p className="text-[10px] font-black uppercase text-emerald-700 tracking-wide">
                Ficheiro SAF-T {saftType} gerado com sucesso. Pronto para descarregar.
              </p>
            </div>
          )}
        </div>

        {/* Right panel: summary table + preview */}
        <div className="col-span-8 space-y-4">
          {/* SAF-T F — Summary by document type */}
          {saftType === 'F' && (
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-[#003366] text-white p-3 flex items-center gap-3">
                <FileText size={16} />
                <h2 className="text-[11px] font-black uppercase tracking-widest">
                  Resumo por Tipo de Documento — Vendas
                </h2>
              </div>
              <table className="w-full text-[10px] border-collapse font-bold uppercase">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <th className="px-4 py-3 text-left">Tipo Documento</th>
                    <th className="px-4 py-3 text-center">Nº Docs</th>
                    <th className="px-4 py-3 text-right">Total Bruto (AOA)</th>
                    <th className="px-4 py-3 text-right">IVA (14%)</th>
                    <th className="px-4 py-3 text-right">Total Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {Object.keys(byType).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-300 italic">
                        Sem documentos no período seleccionado
                      </td>
                    </tr>
                  ) : (
                    Object.entries(byType).map(([tp, stat]) => {
                      const iva = stat.total - stat.total / 1.14;
                      const net = stat.total / 1.14;
                      return (
                        <tr key={tp} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-900 font-black">{tp}</td>
                          <td className="px-4 py-3 text-center text-[#003366] font-black">{stat.count}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmt(stat.total)}</td>
                          <td className="px-4 py-3 text-right font-mono text-blue-600">{fmt(iva)}</td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-600">{fmt(net)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="bg-[#003366] text-white">
                  <tr>
                    <td className="px-4 py-3 font-black uppercase tracking-widest">TOTAL</td>
                    <td className="px-4 py-3 text-center font-black">{filteredInv.length}</td>
                    <td className="px-4 py-3 text-right font-mono font-black">{fmt(totalInv)}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-300">{fmt(totalInv - totalInv / 1.14)}</td>
                    <td className="px-4 py-3 text-right font-mono">{fmt(totalInv / 1.14)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* SAF-T F — Individual invoice list */}
          {saftType === 'F' && (
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-[#003366] text-white p-3 flex items-center gap-3">
                <FileText size={16} />
                <h2 className="text-[11px] font-black uppercase tracking-widest">
                  Lista de Faturas de Venda — {filteredInv.length} documento{filteredInv.length !== 1 ? 's' : ''}
                </h2>
              </div>
              <table className="w-full text-[10px] border-collapse font-bold uppercase">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <th className="px-3 py-3 text-left">Nº Documento</th>
                    <th className="px-3 py-3 text-left">Cliente</th>
                    <th className="px-3 py-3 text-left">NIF Cliente</th>
                    <th className="px-3 py-3 text-center">Data</th>
                    <th className="px-3 py-3 text-center">Tipo</th>
                    <th className="px-3 py-3 text-right">Total Bruto</th>
                    <th className="px-3 py-3 text-right">IVA</th>
                    <th className="px-3 py-3 text-right">Base Trib.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredInv.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-300 italic">
                        Sem faturas no período seleccionado
                      </td>
                    </tr>
                  ) : (
                    filteredInv.slice(0, 50).map((inv, i) => {
                      const gross = Number(inv.total || 0);
                      const storedTax = Number(inv.imposto || (inv as any).vat_amount || 0);
                      const iva = storedTax > 0 ? storedTax : gross - gross / 1.14;
                      const net = gross - iva;
                      const isAnulado = inv.is_anulado || inv.status === 'anulado';
                      return (
                        <tr key={i} className={`hover:bg-zinc-50 transition-colors ${isAnulado ? 'opacity-40 line-through' : ''}`}>
                          <td className="px-3 py-2 font-mono text-[#003366]">
                            {inv.invoice_number || (inv as any).numero_documento || `DOC-${inv.id}`}
                          </td>
                          <td className="px-3 py-2 text-zinc-900 truncate max-w-[160px]">
                            {(inv as any).client_name || (inv as any).cliente_nome || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono text-zinc-500">
                            {(inv as any).client_nif || (inv as any).cliente_nif || '—'}
                          </td>
                          <td className="px-3 py-2 text-center">{inv.date || (inv as any).data_emissao || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[9px] font-black">
                              {inv.document_type || (inv as any).tipo_documento || 'FT'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{fmt(gross)}</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600">{fmt(iva)}</td>
                          <td className="px-3 py-2 text-right font-mono text-zinc-600">{fmt(net)}</td>
                        </tr>
                      );
                    })
                  )}
                  {filteredInv.length > 50 && (
                    <tr>
                      <td colSpan={8} className="py-2 text-center text-zinc-400 italic text-[9px]">
                        ... e mais {filteredInv.length - 50} documentos no ficheiro XML
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#003366] text-white">
                  <tr>
                    <td colSpan={5} className="px-3 py-3 font-black uppercase tracking-widest">TOTAL FATURAS</td>
                    <td className="px-3 py-3 text-right font-mono font-black">{fmt(totalInv)}</td>
                    <td className="px-3 py-3 text-right font-mono text-yellow-200">{fmt(totalInv - totalInv / 1.14)}</td>
                    <td className="px-3 py-3 text-right font-mono">{fmt(totalInv / 1.14)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* SAF-T A — Purchases summary */}
          {saftType === 'A' && (
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-emerald-700 text-white p-3 flex items-center gap-3">
                <ShoppingCart size={16} />
                <h2 className="text-[11px] font-black uppercase tracking-widest">
                  Resumo de Compras — WorkingDocuments
                </h2>
              </div>
              <table className="w-full text-[10px] border-collapse font-bold uppercase">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                    <th className="px-4 py-3 text-left">Nº Documento</th>
                    <th className="px-4 py-3 text-left">Fornecedor</th>
                    <th className="px-4 py-3 text-center">Data</th>
                    <th className="px-4 py-3 text-right">Valor (AOA)</th>
                    <th className="px-4 py-3 text-right">IVA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPur.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-300 italic">
                        Sem compras no período seleccionado
                      </td>
                    </tr>
                  ) : (
                    filteredPur.slice(0, 20).map((p, i) => {
                      const gross = Number(p.total || 0);
                      const iva = gross - gross / 1.14;
                      return (
                        <tr key={i} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2 font-mono text-zinc-700">
                            {p.purchase_number || p.invoice_number || `PUR-${p.id}`}
                          </td>
                          <td className="px-4 py-2 text-zinc-900 truncate max-w-[180px]">{p.supplier_name}</td>
                          <td className="px-4 py-2 text-center">{p.date}</td>
                          <td className="px-4 py-2 text-right font-mono">{fmt(gross)}</td>
                          <td className="px-4 py-2 text-right font-mono text-blue-600">{fmt(iva)}</td>
                        </tr>
                      );
                    })
                  )}
                  {filteredPur.length > 20 && (
                    <tr>
                      <td colSpan={5} className="py-2 text-center text-zinc-400 italic text-[9px]">
                        ... e mais {filteredPur.length - 20} documentos no ficheiro XML
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-emerald-700 text-white">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 font-black uppercase tracking-widest">TOTAL COMPRAS</td>
                    <td className="px-4 py-3 text-right font-mono font-black">{fmt(totalPur)}</td>
                    <td className="px-4 py-3 text-right font-mono text-yellow-200">{fmt(totalPur - totalPur / 1.14)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* XML Preview */}
          {showPreview && previewXml && (
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="bg-zinc-800 text-white p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    Pré-visualização XML SAF-T
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold opacity-60">
                    {Math.round(previewXml.length / 1024)} KB
                  </span>
                  <AlertCircle size={14} className="text-yellow-400" />
                  <span className="text-[9px] text-yellow-400 font-bold">
                    Apenas para verificação
                  </span>
                </div>
              </div>
              <pre className="p-4 text-[9px] font-mono text-zinc-700 overflow-x-auto max-h-[500px] overflow-y-auto bg-zinc-950 text-green-400 leading-relaxed">
                {previewXml.substring(0, 8000)}
                {previewXml.length > 8000 && (
                  `\n\n... [${Math.round((previewXml.length - 8000) / 1024)} KB restantes — descarregue o ficheiro para ver completo]`
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaftExportForm;
