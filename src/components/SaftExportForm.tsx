/**
 * SaftExportForm.tsx
 * Ficheiro SAF-T (Standard Audit File for Tax) — Angola (AO_1.01_01 / AGT)
 * Interface simplificada, leve e com busca direta e dinâmica à base de dados Supabase por ano e período.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Invoice, Purchase, Client, Product } from '../types';
import {
  Download, FileCode, CheckCircle2, AlertCircle,
  FileText, ShoppingCart, Users, Package, Calendar,
  ChevronLeft, RefreshCw, Eye, EyeOff, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  user?: any;
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
  if (tp.includes('NOTA DE CRÉDITO') || tp.includes('NOTA DE CREDITO') || tp === 'NC') return 'NC';
  if (tp.includes('NOTA DE DÉBITO') || tp.includes('NOTA DE DEBITO') || tp === 'ND') return 'ND';
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
// XML builder — SAF-T AO 1.01_01
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
  const address = esc(co.address || co.morada || 'Luanda, Angola');
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
  const filteredPurchases = purchases.filter(p => filterByPeriod(p.date || p.data_emissao || (p as any).data_compra || ''));

  // Customers / Suppliers
  const customerMap = new Map<string, any>();

  if (saftType === 'F') {
    customerMap.set('0', {
      id: '0', accountId: '31.01.02.01.0000', nif: '999999999',
      name: 'Consumidor Final', address: 'Luanda',
      city: 'Luanda', postalCode: '0000-000',
      province: 'Luanda', country: 'AO',
    });
    filteredInvoices.forEach(inv => {
      const cid = String(inv.client_id || '0');
      if (!customerMap.has(cid)) {
        const c = clients.find(cl => String(cl.id) === cid);
        customerMap.set(cid, {
          id: cid,
          accountId: `31.01.02.01.${cid.padStart(4, '0')}`,
          nif: esc(inv.client_nif || c?.contribuinte || c?.nif || '999999999'),
          name: esc(inv.client_name || c?.name || 'Consumidor Final'),
          address: esc(c?.morada || c?.endereco || 'Luanda'),
          city: esc(c?.localidade || c?.provincia || 'Luanda'),
          postalCode: esc(c?.codigo_postal || '0000-000'),
          province: esc(c?.provincia || 'Luanda'),
          country: 'AO',
        });
      }
    });
  } else {
    filteredPurchases.forEach(p => {
      const sid = String(p.supplier_id || '0');
      if (!customerMap.has(sid)) {
        customerMap.set(sid, {
          id: sid,
          accountId: `22.01.01.01.${sid.padStart(4, '0')}`,
          nif: esc((p as any).supplier_nif || (p as any).nif || '999999999'),
          name: esc(p.supplier_name || 'Fornecedor Registado'),
          address: esc((p as any).supplier_address || 'Luanda'),
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
  productMap.set('0', { code: '0', group: 'Geral', description: 'Serviço / Produto Geral', numberCode: '0', type: 'S' });

  if (saftType === 'F') {
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach((item: any) => {
        const pid = String(item.product_id || item.id || '0');
        if (!productMap.has(pid)) {
          const p = products.find(pr => String(pr.id) === pid);
          productMap.set(pid, {
            code: pid, group: esc(p?.category || 'Geral'),
            description: esc(item.description || p?.name || 'Serviço/Produto'),
            numberCode: pid, type: p?.tipo === 'servico' ? 'S' : 'P',
          });
        }
      });
    });
  } else {
    filteredPurchases.forEach(p => {
      (p.items || []).forEach((item: any) => {
        const pid = String(item.product_id || item.product_code || item.id || '0');
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            code: pid, group: 'Geral',
            description: esc(item.description || 'Aquisição/Serviço'),
            numberCode: pid, type: 'P',
          });
        }
      });
    });
  }

  // Tax rates
  const taxRates = new Set<number>();
  taxRates.add(14);
  taxRates.add(0);
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
  lines.push(`  <CompanyID>${esc(co.matricula || co.alvara || nif)}</CompanyID>`);
  lines.push(`  <TaxRegistrationNumber>${nif}</TaxRegistrationNumber>`);
  lines.push(`  <TaxAccountingBasis>${saftType}</TaxAccountingBasis>`);
  lines.push(`  <CompanyName>${companyName}</CompanyName>`);
  lines.push(`  <CompanyAddress>`);
  lines.push(`    <BuildingNumber>NA</BuildingNumber>`);
  lines.push(`    <StreetName>NA</StreetName>`);
  lines.push(`    <AddressDetail>${address}</AddressDetail>`);
  lines.push(`    <City>${city}</City>`);
  lines.push(`    <PostalCode>${esc(co.codigo_postal || '0000-000')}</PostalCode>`);
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
  lines.push(`  <ProductID>IMATEC-ERP/${companyName}</ProductID>`);
  lines.push(`  <ProductVersion>2.0</ProductVersion>`);
  if (phone) lines.push(`  <Telephone>${phone}</Telephone>`);
  if (email) lines.push(`  <Email>${email}</Email>`);
  lines.push(`</Header>`);

  // MasterFiles
  lines.push(`<MasterFiles>`);
  
  customerMap.forEach(c => {
    lines.push(`  <Customer>`);
    lines.push(`    <CustomerID>${esc(c.id)}</CustomerID>`);
    lines.push(`    <AccountID>${esc(c.accountId)}</AccountID>`);
    lines.push(`    <CustomerTaxID>${esc(c.nif)}</CustomerTaxID>`);
    lines.push(`    <CompanyName>${esc(c.name)}</CompanyName>`);
    lines.push(`    <BillingAddress>`);
    lines.push(`      <AddressDetail>${esc(c.address)}</AddressDetail>`);
    lines.push(`      <City>${esc(c.city)}</City>`);
    lines.push(`      <PostalCode>${esc(c.postalCode)}</PostalCode>`);
    lines.push(`      <Province>${esc(c.province)}</Province>`);
    lines.push(`      <Country>${esc(c.country)}</Country>`);
    lines.push(`    </BillingAddress>`);
    lines.push(`    <SelfBillingIndicator>0</SelfBillingIndicator>`);
    lines.push(`  </Customer>`);
  });

  if (saftType === 'A') {
    customerMap.forEach(s => {
      if (s.id === '0') return;
      lines.push(`  <Supplier>`);
      lines.push(`    <SupplierID>${esc(s.id)}</SupplierID>`);
      lines.push(`    <AccountID>${esc(s.accountId)}</AccountID>`);
      lines.push(`    <SupplierTaxID>${esc(s.nif)}</SupplierTaxID>`);
      lines.push(`    <CompanyName>${esc(s.name)}</CompanyName>`);
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
    const code = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : rate === 7 ? 'RED' : 'NOR';
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
      lines.push(`      <MovementStartTime>${entryDate}</MovementStartTime>`);
      
      if (items.length > 0) {
        items.forEach((item, idx) => {
          const pid = String(item.product_id || item.id || '0');
          const rate = Number(item.tax_rate ?? 14);
          const taxCode = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : rate === 7 ? 'RED' : 'NOR';
          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || (item.total ? item.total / qty : 0));
          const lineTotal = Number(item.total || qty * unitPrice);
          const isCredit = invType !== 'NC';

          lines.push(`      <Line>`);
          lines.push(`        <LineNumber>${idx + 1}</LineNumber>`);
          lines.push(`        <ProductCode>${esc(pid)}</ProductCode>`);
          lines.push(`        <ProductDescription>${esc(item.description || 'Produto/Serviço')}</ProductDescription>`);
          lines.push(`        <Quantity>${n8(qty)}</Quantity>`);
          lines.push(`        <UnitOfMeasure>${esc(item.unit || item.unidade || 'UN')}</UnitOfMeasure>`);
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
        lines.push(`        <UnitOfMeasure>UN</UnitOfMeasure>`);
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
      lines.push(`    </Invoice>`);
    });
    lines.push(`  </SalesInvoices>`);
  } else {
    // WorkingDocuments (SAF-T A)
    const workDocs = filteredPurchases;
    lines.push(`  <WorkingDocuments>`);
    lines.push(`    <NumberOfEntries>${workDocs.length}</NumberOfEntries>`);
    lines.push(`    <TotalDebit>0.00</TotalDebit>`);
    lines.push(`    <TotalCredit>${n2(totalPurchasesCredit)}</TotalCredit>`);
    workDocs.forEach((p) => {
      const items: any[] = Array.isArray(p.items) ? p.items : [];
      const pDate = (p.date || p.data_emissao || (p as any).data_compra || '').substring(0, 10);
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
      lines.push(`      <CustomerID>${esc(supplierId)}</CustomerID>`);
      if (items.length > 0) {
        items.forEach((item, idx) => {
          const pid = String(item.product_id || item.product_code || item.id || '0');
          const rate = Number(item.tax_rate ?? 14);
          const taxCode = rate === 0 ? 'ISE' : rate === 5 ? 'RED' : 'NOR';
          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || (item.total ? item.total / qty : 0));
          const lineTotal = Number(item.total || qty * unitPrice);
          lines.push(`      <Line>`);
          lines.push(`        <LineNumber>${idx + 1}</LineNumber>`);
          lines.push(`        <ProductCode>${esc(pid)}</ProductCode>`);
          lines.push(`        <ProductDescription>${esc(item.description || 'Produto')}</ProductDescription>`);
          lines.push(`        <Quantity>${n8(qty)}</Quantity>`);
          lines.push(`        <UnitOfMeasure>${esc(item.unit || 'UN')}</UnitOfMeasure>`);
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
        lines.push(`        <UnitOfMeasure>UN</UnitOfMeasure>`);
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
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export const SaftExportForm: React.FC<Props> = ({
  invoices: initialInvoices = [],
  purchases: initialPurchases = [],
  clients: initialClients = [],
  products: initialProducts = [],
  companyData,
  user,
  onBack,
  defaultYear,
  defaultMonth,
}) => {
  const empresaId = companyData?.empresa_id || companyData?.id || user?.empresa_id;
  const currentFiscalYear = defaultYear || String(new Date().getFullYear());

  const [selectedYear, setSelectedYear] = useState<string>(currentFiscalYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth || 'all');
  const [saftType, setSaftType] = useState<SaftType>('F');

  const [startDate, setStartDate] = useState(`${selectedYear}-01-01`);
  const [endDate, setEndDate] = useState(`${selectedYear}-12-31`);

  // Documentos carregados diretamente da base de dados Supabase
  const [dbInvoices, setDbInvoices] = useState<Invoice[]>(initialInvoices);
  const [dbPurchases, setDbPurchases] = useState<Purchase[]>(initialPurchases);
  const [dbClients, setDbClients] = useState<Client[]>(initialClients);
  const [dbProducts, setDbProducts] = useState<Product[]>(initialProducts);
  const [loadingDb, setLoadingDb] = useState(false);

  const [previewXml, setPreviewXml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronizar datas quando o Ano ou Mês mudam
  useEffect(() => {
    if (selectedMonth === 'all') {
      setStartDate(`${selectedYear}-01-01`);
      setEndDate(`${selectedYear}-12-31`);
    } else {
      const m = selectedMonth.padStart(2, '0');
      const lastDay = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
      setStartDate(`${selectedYear}-${m}-01`);
      setEndDate(`${selectedYear}-${m}-${String(lastDay).padStart(2, '0')}`);
    }
    setPreviewXml('');
  }, [selectedYear, selectedMonth]);

  // Consulta REAL e DIRECTA à base de dados para o ano e período seleccionados
  const fetchDbData = useCallback(async () => {
    if (!empresaId) return;
    setLoadingDb(true);
    try {
      // 1. Carrega faturas do período da tabela documentos_emitidos
      const [invRes, purRes, clientRes, prodRes] = await Promise.all([
        supabase
          .from('documentos_emitidos')
          .select('*')
          .eq('empresa_id', empresaId)
          .gte('data_emissao', `${startDate}T00:00:00`)
          .lte('data_emissao', `${endDate}T23:59:59`)
          .order('data_emissao', { ascending: true }),
        supabase
          .from('compras')
          .select('*')
          .eq('empresa_id', empresaId)
          .gte('date', startDate)
          .lte('date', `${endDate}T23:59:59`)
          .order('date', { ascending: true }),
        supabase
          .from('clientes')
          .select('*')
          .eq('empresa_id', empresaId),
        supabase
          .from('produtos')
          .select('*')
          .eq('empresa_id', empresaId),
      ]);

      if (Array.isArray(invRes.data) && invRes.data.length > 0) {
        const mapped: Invoice[] = invRes.data.map((d: any) => ({
          id: d.id,
          client_id: d.cliente_id || d.client_id || 0,
          client_name: d.cliente_nome || d.client_name || 'Consumidor Final',
          invoice_number: (d.numero_documento || d.invoice_number || `FT-${d.id}`).split('-')[0].trim(),
          date: d.data_emissao || d.date || new Date().toISOString(),
          due_date: d.data_vencimento || d.due_date || new Date().toISOString(),
          status: (d.estado || d.status || 'ativo').toLowerCase() as any,
          total: Number(d.total || d.valor_total || 0),
          items: d.detalhes?.items || d.items || [],
          client_nif: d.cliente_nif || d.client_nif,
          client_address: d.cliente_morada || d.client_address,
          document_type: d.tipo_documento || d.document_type || 'FT',
          hash: d.hash || d.hash_documento || d.hash_fiscal || '',
          created_at: d.created_at || d.data_emissao
        }));
        setDbInvoices(mapped);
      } else if (initialInvoices.length > 0) {
        setDbInvoices(initialInvoices);
      } else {
        setDbInvoices([]);
      }

      if (Array.isArray(purRes.data) && purRes.data.length > 0) {
        setDbPurchases(purRes.data);
      } else if (initialPurchases.length > 0) {
        setDbPurchases(initialPurchases);
      } else {
        setDbPurchases([]);
      }

      if (Array.isArray(clientRes.data) && clientRes.data.length > 0) {
        setDbClients(clientRes.data);
      }
      if (Array.isArray(prodRes.data) && prodRes.data.length > 0) {
        setDbProducts(prodRes.data);
      }
    } catch (err) {
      console.warn('[SaftExportForm] Erro ao carregar dados do Supabase:', err);
    } finally {
      setLoadingDb(false);
    }
  }, [empresaId, startDate, endDate, initialInvoices, initialPurchases]);

  useEffect(() => {
    fetchDbData();
  }, [fetchDbData]);

  // Documentos filtrados pelo período actual
  const filterByPeriod = (date: string): boolean => {
    if (!startDate && !endDate) return true;
    const d = date ? date.substring(0, 10) : '';
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const activeInvoices = useMemo(
    () => dbInvoices.filter(i => filterByPeriod(i.date || i.data_emissao || '')),
    [dbInvoices, startDate, endDate]
  );

  const activePurchases = useMemo(
    () => dbPurchases.filter(p => filterByPeriod(p.date || p.data_emissao || (p as any).data_compra || '')),
    [dbPurchases, startDate, endDate]
  );

  const totalInv = activeInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPur = activePurchases.reduce((s, p) => s + Number(p.total || 0), 0);
  const ivaEstimadoInv = totalInv - totalInv / 1.14;
  const ivaEstimadoPur = totalPur - totalPur / 1.14;

  const currentCount = saftType === 'F' ? activeInvoices.length : activePurchases.length;
  const currentTotal = saftType === 'F' ? totalInv : totalPur;
  const currentIva = saftType === 'F' ? ivaEstimadoInv : ivaEstimadoPur;

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

  const handleGenerate = () => {
    const xml = buildSaftXml(
      activeInvoices,
      activePurchases,
      dbClients,
      dbProducts,
      companyData,
      startDate,
      endDate,
      saftType
    );
    setPreviewXml(xml);
    setShowPreview(true);
  };

  const handleDownload = () => {
    const xml = buildSaftXml(
      activeInvoices,
      activePurchases,
      dbClients,
      dbProducts,
      companyData,
      startDate,
      endDate,
      saftType
    );
    const nif = companyData?.nif || '000000000';
    downloadXml(xml, `SAF-T_${saftType}_AO_${nif}_${startDate}_${endDate}.xml`);
  };

  const anosDisponiveis = [
    String(new Date().getFullYear()),
    String(new Date().getFullYear() - 1),
    String(new Date().getFullYear() - 2),
    String(new Date().getFullYear() - 3)
  ];

  const meses = [
    { num: 'all', nome: 'Ano Completo' },
    { num: '1', nome: 'Jan' },
    { num: '2', nome: 'Fev' },
    { num: '3', nome: 'Mar' },
    { num: '4', nome: 'Abr' },
    { num: '5', nome: 'Mai' },
    { num: '6', nome: 'Jun' },
    { num: '7', nome: 'Jul' },
    { num: '8', nome: 'Ago' },
    { num: '9', nome: 'Set' },
    { num: '10', nome: 'Out' },
    { num: '11', nome: 'Nov' },
    { num: '12', nome: 'Dez' },
  ];

  return (
    <div className="bg-zinc-50 min-h-screen p-4 md:p-6 space-y-5 text-slate-800">
      {/* Cabeçalho Compacto e Oficial */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded text-slate-600 transition-colors" title="Voltar">
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="w-12 h-12 rounded-lg bg-[#003366] text-white flex items-center justify-center shadow-xs">
            <FileCode size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Ficheiro SAF-T AO (Standard Audit File for Tax)</h1>
              <span className="bg-blue-100 text-[#003366] text-[10px] font-black px-2 py-0.5 rounded uppercase">
                Versão 1.01_01 / AGT
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Contribuinte: <strong className="text-slate-700">{companyData?.name || companyData?.nome_empresa || 'Empresa'}</strong> | NIF: <span className="font-mono text-slate-700 font-bold">{companyData?.nif || '—'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDbData}
            disabled={loadingDb}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-zinc-200 transition-colors disabled:opacity-60"
            title="Recarregar dados do banco de dados"
          >
            <RefreshCw size={14} className={loadingDb ? 'animate-spin' : ''} />
            {loadingDb ? 'A sincronizar BD...' : 'Actualizar'}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-xs transition-colors"
          >
            <Download size={15} /> Descarregar XML
          </button>
        </div>
      </div>

      {/* Seletores Rápidos de Período e Tipo */}
      <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs space-y-4">
        {/* Linha 1: Seleção de Tipo e Ano */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          {/* Tipo de SAF-T (Vendas vs Compras) */}
          <div className="flex items-center bg-zinc-100 p-1 rounded border border-zinc-200">
            <button
              onClick={() => { setSaftType('F'); setPreviewXml(''); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded transition-all ${
                saftType === 'F' ? 'bg-[#003366] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText size={14} /> SAF-T F (Faturação de Vendas)
            </button>
            <button
              onClick={() => { setSaftType('A'); setPreviewXml(''); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded transition-all ${
                saftType === 'A' ? 'bg-[#003366] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart size={14} /> SAF-T A (Compras & Aquisições)
            </button>
          </div>

          {/* Anos Fiscais */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exercício Fiscal:</span>
            {anosDisponiveis.map(ano => (
              <button
                key={ano}
                onClick={() => setSelectedYear(ano)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                  selectedYear === ano ? 'bg-[#003366] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ano}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: Meses rápidos e Datas personalizadas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Período:</span>
            {meses.map(m => (
              <button
                key={m.num}
                onClick={() => setSelectedMonth(m.num)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  selectedMonth === m.num ? 'bg-teal-700 text-white font-bold' : 'bg-zinc-100 text-slate-600 hover:bg-zinc-200'
                }`}
              >
                {m.nome}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="border border-zinc-300 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#003366]"
            />
            <span className="text-slate-400 font-semibold">até</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="border border-zinc-300 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-[#003366]"
            />
          </div>
        </div>
      </div>

      {/* Cartões de Indicadores do Período */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            {saftType === 'F' ? 'Faturas Emitidas' : 'Documentos de Compra'}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">{currentCount}</span>
            <span className="text-xs text-slate-500 font-medium">{startDate} a {endDate}</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Volume Total Ilíquido</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-[#003366] font-mono">{fmt(currentTotal)}</span>
            <span className="text-xs text-slate-500 font-bold">AKZ</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">IVA Total Apurado</span>
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-black text-blue-700 font-mono">{fmt(currentIva)}</span>
            <span className="text-xs text-slate-500 font-bold">AKZ</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Base de Dados</span>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-emerald-700">✓ Sincronizado</span>
            <span className="text-[11px] text-slate-400 font-mono">AO_1.01_01</span>
          </div>
        </div>
      </div>

      {/* Ações e Alternador de Pré-visualização */}
      <div className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-zinc-200 hover:bg-zinc-100 transition-colors text-slate-700"
          >
            {showTable ? <EyeOff size={14} /> : <Eye size={14} />}
            {showTable ? 'Ocultar Documentos' : `Ver Documentos Elegíveis (${currentCount})`}
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-[#003366] text-[#003366] hover:bg-blue-50 transition-colors"
          >
            <FileCode size={14} /> {showPreview && previewXml ? 'Actualizar Pré-visualização' : 'Pré-visualizar XML'}
          </button>
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-xs transition-colors"
        >
          <Download size={16} /> Descarregar SAF-T {saftType} AO (.xml)
        </button>
      </div>

      {/* Tabela de Documentos Incluídos (quando ativada) */}
      {showTable && (
        <div className="bg-white border border-zinc-200 rounded-lg shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-100 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Documentos Selecionados para o SAF-T {saftType} ({currentCount})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Total: {fmt(currentTotal)} AKZ
            </span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-zinc-200 sticky top-0">
                  <th className="py-2 px-3">Nº Documento</th>
                  <th className="py-2 px-3">{saftType === 'F' ? 'Cliente' : 'Fornecedor'}</th>
                  <th className="py-2 px-3">NIF</th>
                  <th className="py-2 px-3 text-center">Data</th>
                  <th className="py-2 px-3 text-center">Tipo</th>
                  <th className="py-2 px-3 text-right">Valor Total (AKZ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {currentCount === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Nenhum documento encontrado para o período seleccionado na base de dados.
                    </td>
                  </tr>
                ) : saftType === 'F' ? (
                  activeInvoices.slice(0, 100).map((inv, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[#003366]">
                        {inv.invoice_number || (inv as any).numero_documento || `DOC-${inv.id}`}
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-medium truncate max-w-xs">
                        {inv.client_name || (inv as any).cliente_nome || 'Consumidor Final'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {inv.client_nif || (inv as any).cliente_nif || '999999999'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {(inv.date || inv.data_emissao || '').substring(0, 10)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {inv.document_type || 'FT'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {fmt(Number(inv.total || 0))}
                      </td>
                    </tr>
                  ))
                ) : (
                  activePurchases.slice(0, 100).map((pur, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-[#003366]">
                        {pur.purchase_number || pur.invoice_number || `PUR-${pur.id}`}
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-medium truncate max-w-xs">
                        {pur.supplier_name || 'Fornecedor Registado'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {(pur as any).supplier_nif || '—'}
                      </td>
                      <td className="py-2 px-3 text-center font-mono">
                        {(pur.date || pur.data_emissao || (pur as any).data_compra || '').substring(0, 10)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          COMPRA
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {fmt(Number(pur.total || 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pré-visualização do XML */}
      {showPreview && previewXml && (
        <div className="bg-slate-900 text-green-400 rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
          <div className="flex justify-between items-center pb-2 border-b border-slate-700 mb-2 text-slate-400 text-[11px]">
            <span>Estrutura XML SAF-T AO (primeiros 10.000 caracteres)</span>
            <button onClick={() => setShowPreview(false)} className="text-slate-300 hover:text-white">
              ✕ Fechar Pré-visualização
            </button>
          </div>
          <pre>{previewXml.substring(0, 10000)}</pre>
        </div>
      )}
    </div>
  );
};

export default SaftExportForm;
