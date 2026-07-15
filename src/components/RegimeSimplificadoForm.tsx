import React, { useState } from 'react';
import { Invoice, Purchase } from '../types';
import { FileText, Printer, ChevronLeft, Calendar, Receipt, ShieldOff } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) =>
  new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const MONTHS: Record<string, string> = {
  '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL',
  '05': 'MAIO', '06': 'JUNHO', '07': 'JULHO', '08': 'AGOSTO',
  '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO',
};

/** Detect if an invoice is of receipt type (FR or RC) */
const isRecebimento = (inv: Invoice): boolean => {
  const tp = (inv.document_type || inv.tipo_documento || '').trim().toUpperCase();
  return (
    tp === 'FR' || tp === 'RC' ||
    tp.includes('FATURA RECIBO') || tp.includes('FACTURA RECIBO') ||
    tp.includes('FATURA-RECIBO') || tp.includes('FACTURA-RECIBO') ||
    tp === 'RECIBO' ||
    inv.document_type === 'Fatura Recibo' ||
    inv.document_type === 'Recibo'
  );
};

/** Detect if an invoice is exempt (tax_rate = 0 or isento flag) */
const isIsento = (inv: Invoice): boolean => {
  const items: any[] = Array.isArray(inv.items) ? inv.items : [];
  if (items.length > 0) {
    return items.every((item: any) => {
      const rate = Number(item.tax_rate ?? item.taxa ?? -1);
      return rate === 0;
    });
  }
  // Fallback: check field names
  return (
    (inv as any).isenta === true ||
    (inv as any).isento === true ||
    (inv as any).tax_rate === 0
  );
};

/** Imposto a 7% (regime simplificado) stored or calculated */
const impostoRS = (inv: Invoice): number => {
  const stored = Number((inv as any).imposto || 0);
  return stored > 0 ? stored : Number(inv.total || 0) * 0.07;
};

/** For isenção: imposto de selo at 1% */
const impostoSelo = (inv: Invoice): number => Number(inv.total || 0) * 0.01;

// ──────────────────────────────────────────────────────────────────────────────
// Sub-component: Mapa Fornecedor (Compras)
// ──────────────────────────────────────────────────────────────────────────────
const MapaFornecedor = ({ purchases, onBack }: { purchases: Purchase[]; onBack: () => void }) => {
  const [mes, setMes] = useState('05');
  const [ano, setAno] = useState('2025');

  const filtered = purchases.filter(
    p =>
      (p.date || '').split('-')[1] === mes &&
      (p.date || '').split('-')[0] === ano &&
      (p as any).status !== 'anulado'
  );

  return (
    <div className="space-y-6 max-w-[1550px] w-full mx-auto">
      <div className="bg-[#003366] p-4 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tighter">
              03- OPERAÇÕES EFECTUADAS COM FORNECEDORES SUJEITAS A IVA
            </h2>
            <p className="text-[10px] font-bold opacity-70 uppercase tracking-[0.2em]">
              Mapa de Fornecedores e Deduções
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 border border-white/20">
            <Calendar size={14} />
            <select
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none"
            >
              {Object.entries(MONTHS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select
              value={ano}
              onChange={e => setAno(e.target.value)}
              className="bg-transparent text-xs font-bold focus:outline-none"
            >
              {['2023', '2024', '2025', '2026'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button className="bg-white text-[#003366] p-2 rounded-full shadow-xl hover:scale-110 transition-transform">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className="border border-zinc-300 overflow-x-auto shadow-2xl bg-white">
        <table className="w-full text-left text-[11.5px] border-collapse font-bold uppercase">
          <thead>
            <tr className="bg-zinc-50 text-[#003366] border-b-2 border-zinc-200">
              <th className="p-2 border-r border-zinc-200 text-center">Nº</th>
              <th className="p-2 border-r border-zinc-200 text-center">NIF em Angola?</th>
              <th className="p-2 border-r border-zinc-200">NIF</th>
              <th className="p-2 border-r border-zinc-200">NOME/FIRMA</th>
              <th className="p-2 border-r border-zinc-200 text-center">TIPO DOC</th>
              <th className="p-2 border-r border-zinc-200 text-center">DATA</th>
              <th className="p-2 border-r border-zinc-200">Nº DOC</th>
              <th className="p-2 border-r border-zinc-200 text-right">VALOR FACTURA</th>
              <th className="p-2 border-r border-zinc-200 text-right">VALOR TRIBUTÁVEL</th>
              <th className="p-2 border-r border-zinc-200 text-right">IVA SUPORTADO</th>
              <th colSpan={2} className="p-2 border-r border-zinc-200 text-center bg-blue-50/50">IVA DEDUTÍVEL</th>
              <th className="p-2 border-r border-zinc-200 text-right">IVA CATIVO</th>
              <th className="p-2 border-r border-zinc-200 text-center">TIPOLOGIA</th>
              <th className="p-2 border-r border-zinc-200 text-center">CAMPO DESTINO</th>
              <th className="p-2 text-center">MovID</th>
            </tr>
            <tr className="bg-zinc-100 text-[#003366] border-b-2 border-zinc-200 uppercase">
              <th colSpan={10} className="border-r border-zinc-200"></th>
              <th className="p-1 border-r border-zinc-200 text-center">%</th>
              <th className="p-1 border-r border-zinc-200 text-center">VALOR</th>
              <th colSpan={3} className="border-r border-zinc-200"></th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filtered.map((p, i) => {
              const valorTributavel = p.total / 1.14;
              const ivaSuportado = p.total - valorTributavel;
              const items: any[] = Array.isArray(p.items) ? p.items : [];
              const ivaDedutivel =
                items.length > 0
                  ? items.reduce((s: number, item: any) => {
                      const rate = Number(item.tax_rate ?? item.taxa ?? 14);
                      return s + (Number(item.total || 0) * rate) / 100;
                    }, 0)
                  : p.total * 0.07;
              return (
                <tr key={i} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-2 border-r border-zinc-100 text-center">{i + 1}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">S</td>
                  <td className="p-2 border-r border-zinc-100 font-mono">
                    {(p as any).supplier_nif || (p as any).nif || '—'}
                  </td>
                  <td className="p-2 border-r border-zinc-100 text-zinc-900">{p.supplier_name}</td>
                  <td className="p-2 border-r border-zinc-100 text-center">
                    {p.document_type === 'Fatura' ? 'FT' : 'FR'}
                  </td>
                  <td className="p-2 border-r border-zinc-100 text-center">{p.date}</td>
                  <td className="p-2 border-r border-zinc-100 font-mono">
                    {p.purchase_number || p.invoice_number}
                  </td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono">{fmt(p.total)}</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono">{fmt(valorTributavel)}</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono text-zinc-600">
                    {fmt(ivaSuportado)}
                  </td>
                  <td className="p-2 border-r border-zinc-100 text-center">100,00</td>
                  <td className="p-2 border-r border-zinc-100 text-right font-mono text-blue-600">
                    {fmt(ivaDedutivel)}
                  </td>
                  <td className="p-2 border-r border-zinc-100 text-right">0,00</td>
                  <td className="p-2 border-r border-zinc-100 text-center text-zinc-500">OBC</td>
                  <td className="p-2 border-r border-zinc-100 text-center">20</td>
                  <td className="p-2 text-center text-zinc-400">{30 + i}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="py-16 text-center text-zinc-300 italic uppercase text-xs">
                  Sem compras para {MONTHS[mes]} {ano}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-zinc-100 font-black text-zinc-900 border-t-2 border-zinc-300">
            <tr>
              <td colSpan={7} className="p-2 text-right uppercase tracking-[0.2em] font-black text-[#003366]">
                Total
              </td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">
                {fmt(filtered.reduce((s, p) => s + Number(p.total || 0), 0))}
              </td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">
                {fmt(filtered.reduce((s, p) => s + Number(p.total || 0) / 1.14, 0))}
              </td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono">
                {fmt(
                  filtered.reduce(
                    (s, p) => s + (Number(p.total || 0) - Number(p.total || 0) / 1.14),
                    0
                  )
                )}
              </td>
              <td className="p-2 border-l border-zinc-200"></td>
              <td className="p-2 text-right border-l border-zinc-200 font-mono text-blue-700">
                {fmt(
                  filtered.reduce((s, p) => {
                    const items: any[] = Array.isArray(p.items) ? p.items : [];
                    if (items.length > 0) {
                      return (
                        s +
                        items.reduce((si: number, item: any) => {
                          const rate = Number(item.tax_rate ?? item.taxa ?? 14);
                          return si + (Number(item.total || 0) * rate) / 100;
                        }, 0)
                      );
                    }
                    return s + Number(p.total || 0) * 0.07;
                  }, 0)
                )}
              </td>
              <td colSpan={4} className="border-l border-zinc-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-component: Tabela de Recebimentos (Fatura Recibo + Recibo)
// ──────────────────────────────────────────────────────────────────────────────
const TabelaRecebimentos = ({
  recebimentos,
}: {
  recebimentos: Invoice[];
}) => {
  const totalValor = recebimentos.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalImposto = recebimentos.reduce((s, r) => s + impostoRS(r), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] border-collapse font-bold uppercase">
        <thead>
          <tr className="bg-zinc-50 text-[#003366] border-b border-zinc-200">
            <th className="p-2 border-r border-zinc-200 text-center w-8">Nº</th>
            <th className="p-2 border-r border-zinc-200">NIF CLIENTE</th>
            <th className="p-2 border-r border-zinc-200">NOME / FIRMA</th>
            <th className="p-2 border-r border-zinc-200 text-center">TIPO DOC</th>
            <th className="p-2 border-r border-zinc-200 text-center">DATA</th>
            <th className="p-2 border-r border-zinc-200">Nº DOCUMENTO</th>
            <th className="p-2 border-r border-zinc-200 text-right">VALOR RECEBIDO</th>
            <th className="p-2 border-r border-zinc-200 text-right">TAXA</th>
            <th className="p-2 text-right">IMPOSTO DEVIDO (7%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {recebimentos.map((r, i) => {
            const tax = impostoRS(r);
            const tp = (r.document_type || r.tipo_documento || '').trim().toUpperCase();
            const tipoLabel =
              tp.includes('FATURA RECIBO') || tp.includes('FACTURA RECIBO') || tp === 'FR'
                ? 'FR'
                : 'RC';
            return (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                <td className="p-2 border-r border-zinc-100 text-center text-zinc-500">{i + 1}</td>
                <td className="p-2 border-r border-zinc-100 font-mono text-zinc-600">
                  {r.client_nif || '—'}
                </td>
                <td className="p-2 border-r border-zinc-100 text-zinc-900 max-w-[180px] truncate">
                  {r.client_name}
                </td>
                <td className="p-2 border-r border-zinc-100 text-center">
                  <span
                    className={`px-2 py-0.5 text-[8px] font-black rounded-sm ${
                      tipoLabel === 'FR'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tipoLabel}
                  </span>
                </td>
                <td className="p-2 border-r border-zinc-100 text-center">{r.date}</td>
                <td className="p-2 border-r border-zinc-100 font-mono text-zinc-700">
                  {r.invoice_number || r.numero_documento}
                </td>
                <td className="p-2 border-r border-zinc-100 text-right font-mono text-zinc-900">
                  {fmt(Number(r.total || 0))}
                </td>
                <td className="p-2 border-r border-zinc-100 text-center text-blue-600 font-black">
                  7%
                </td>
                <td className="p-2 text-right font-mono text-[#003366] font-black">{fmt(tax)}</td>
              </tr>
            );
          })}
          {recebimentos.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="py-10 text-center text-zinc-300 italic normal-case text-[10px]"
              >
                Sem documentos de recebimento (Fatura Recibo / Recibo) para este período
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-[#003366] text-white font-black border-t-2 border-[#003366]">
          <tr>
            <td colSpan={6} className="p-2 text-right uppercase tracking-widest pr-4">
              TOTAL RECEBIMENTOS
            </td>
            <td className="p-2 text-right font-mono border-l border-white/20">
              {fmt(totalValor)}
            </td>
            <td className="p-2 border-l border-white/20 text-center">7%</td>
            <td className="p-2 text-right font-mono border-l border-white/20 text-yellow-300">
              {fmt(totalImposto)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Sub-component: Tabela de Isenções
// ──────────────────────────────────────────────────────────────────────────────
const TabelaIsencoes = ({ isentos }: { isentos: Invoice[] }) => {
  const totalValor = isentos.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalSelo = isentos.reduce((s, r) => s + impostoSelo(r), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] border-collapse font-bold uppercase">
        <thead>
          <tr className="bg-zinc-50 text-[#003366] border-b border-zinc-200">
            <th className="p-2 border-r border-zinc-200 text-center w-8">Nº</th>
            <th className="p-2 border-r border-zinc-200">NIF CLIENTE</th>
            <th className="p-2 border-r border-zinc-200">NOME / FIRMA</th>
            <th className="p-2 border-r border-zinc-200 text-center">TIPO DOC</th>
            <th className="p-2 border-r border-zinc-200 text-center">DATA</th>
            <th className="p-2 border-r border-zinc-200">Nº DOCUMENTO</th>
            <th className="p-2 border-r border-zinc-200 text-right">VALOR ISENTO</th>
            <th className="p-2 border-r border-zinc-200 text-center">TAXA IS</th>
            <th className="p-2 text-right">IMPOSTO SELO (1%)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {isentos.map((r, i) => {
            const tp = (r.document_type || r.tipo_documento || '').trim().toUpperCase();
            const tipoLabel =
              tp === 'FT' || tp.includes('FATURA') ? 'FT' :
              tp === 'FR' || tp.includes('FATURA RECIBO') ? 'FR' :
              tp === 'RC' || tp.includes('RECIBO') ? 'RC' : tp || 'FT';
            const selo = impostoSelo(r);
            return (
              <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                <td className="p-2 border-r border-zinc-100 text-center text-zinc-500">{i + 1}</td>
                <td className="p-2 border-r border-zinc-100 font-mono text-zinc-600">
                  {r.client_nif || '—'}
                </td>
                <td className="p-2 border-r border-zinc-100 text-zinc-900 max-w-[180px] truncate">
                  {r.client_name}
                </td>
                <td className="p-2 border-r border-zinc-100 text-center">
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-sm bg-amber-100 text-amber-700">
                    {tipoLabel}
                  </span>
                </td>
                <td className="p-2 border-r border-zinc-100 text-center">{r.date}</td>
                <td className="p-2 border-r border-zinc-100 font-mono text-zinc-700">
                  {r.invoice_number || r.numero_documento}
                </td>
                <td className="p-2 border-r border-zinc-100 text-right font-mono text-zinc-900">
                  {fmt(Number(r.total || 0))}
                </td>
                <td className="p-2 border-r border-zinc-100 text-center text-amber-600 font-black">
                  1%
                </td>
                <td className="p-2 text-right font-mono text-amber-800 font-black">{fmt(selo)}</td>
              </tr>
            );
          })}
          {isentos.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="py-10 text-center text-zinc-300 italic normal-case text-[10px]"
              >
                Sem documentos isentos de IVA para este período
              </td>
            </tr>
          )}
        </tbody>
        <tfoot className="bg-amber-700 text-white font-black border-t-2 border-amber-800">
          <tr>
            <td colSpan={6} className="p-2 text-right uppercase tracking-widest pr-4">
              TOTAL ISENÇÕES
            </td>
            <td className="p-2 text-right font-mono border-l border-white/20">{fmt(totalValor)}</td>
            <td className="p-2 border-l border-white/20 text-center">1%</td>
            <td className="p-2 text-right font-mono border-l border-white/20 text-yellow-200">
              {fmt(totalSelo)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────
const RegimeSimplificadoForm = ({
  invoices,
  purchases,
  companyData,
}: {
  invoices: Invoice[];
  purchases: Purchase[];
  companyData?: any;
}) => {
  const [showMapaFornecedor, setShowMapaFornecedor] = useState(false);
  const [ano, setAno] = useState('2025');
  const [mes, setMes] = useState('05');

  // ── Filter active invoices for selected period ──────────────────────────────
  const activeInvoices = (invoices || []).filter(
    inv =>
      (inv.date || '').split('-')[1] === mes &&
      (inv.date || '').split('-')[0] === ano &&
      inv.status !== 'anulado' &&
      !inv.is_anulado
  );

  // ── Separate by type ────────────────────────────────────────────────────────
  const recebimentos = activeInvoices.filter(isRecebimento);
  const isentos = activeInvoices.filter(inv => !isRecebimento(inv) && isIsento(inv));
  const normais = activeInvoices.filter(inv => !isRecebimento(inv) && !isIsento(inv));

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalVendasNormais = normais.reduce((s, inv) => s + Number(inv.total || 0), 0);
  const totalImpostoNormais = normais.reduce((s, inv) => s + impostoRS(inv), 0);

  const totalRecebimentos = recebimentos.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalImpostoRecebimentos = recebimentos.reduce((s, r) => s + impostoRS(r), 0);

  const totalIsentos = isentos.reduce((s, r) => s + Number(r.total || 0), 0);
  const totalImpostoSelo = isentos.reduce((s, r) => s + impostoSelo(r), 0);

  // Total for section 06 row "PRESTAÇÃO DE SERVIÇOS" = normais + recebimentos
  const totalSales = totalVendasNormais + totalRecebimentos;
  const totalTax = totalImpostoNormais + totalImpostoRecebimentos;

  const formatCurrencyValue = (value: number) =>
    new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2 }).format(value);

  const nifStr = String(companyData?.nif || '5000922200').trim();
  const digits = Array(19).fill(' ');
  for (let i = 0; i < nifStr.length; i++) {
    digits[19 - nifStr.length + i] = nifStr[i];
  }

  if (showMapaFornecedor) {
    return <MapaFornecedor purchases={purchases} onBack={() => setShowMapaFornecedor(false)} />;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-zinc-100 p-8 space-y-4">
      {/* ── Period / Regime selector ────────────────────────────────────────── */}
      <div className="flex justify-between items-center bg-white border border-zinc-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-[#003366]" />
          <span className="text-[10px] font-black uppercase text-[#003366] tracking-widest">
            PERÍODO:
          </span>
          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="text-xs font-bold border border-zinc-200 bg-zinc-50 px-2 py-1 focus:outline-none"
          >
            {Object.entries(MONTHS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={e => setAno(e.target.value)}
            className="text-xs font-bold border border-zinc-200 bg-zinc-50 px-2 py-1 focus:outline-none"
          >
            {['2023', '2024', '2025', '2026'].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold">
          <span className="px-2 py-1 bg-blue-600 text-white tracking-widest">
            {activeInvoices.length} DOCUMENTOS
          </span>
          <span className="px-2 py-1 bg-[#003366] text-white tracking-widest">
            TOTAL: {formatCurrencyValue(activeInvoices.reduce((s, i) => s + Number(i.total || 0), 0))} AOA
          </span>
        </div>
      </div>

      <div className="bg-white border border-zinc-300 shadow-sm overflow-hidden">
        {/* Section 01 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-b border-white">
          <div className="bg-white text-[#003366] px-2 py-0.5">01-</div>
          <span>REGIME DO IVA E PERIODO DE DECLARAÇÃO</span>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-3 border-r border-zinc-200 p-4 space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer grayscale opacity-50">
                <input type="checkbox" className="rounded-none border-zinc-300" readOnly />
                <span>REGIME GERAL</span>
              </label>
              <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer grayscale opacity-50">
                <input type="checkbox" className="rounded-none border-zinc-300" readOnly />
                <span>REGIME DE CAIXA</span>
              </label>
              <label className="flex items-center gap-3 text-[10px] font-bold group cursor-pointer">
                <input
                  type="checkbox"
                  checked
                  readOnly
                  className="rounded-none border-zinc-300 accent-blue-600"
                />
                <span className="text-blue-600">REGIME SIMPLIFICADO</span>
              </label>
            </div>
          </div>

          <div className="col-span-4 border-r border-zinc-200 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">
              02- PERIODO DA DECLARAÇÃO
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-zinc-50 border border-zinc-200 p-2 text-sm font-mono font-bold flex-1 text-center">
                DE: 01-{mes}-{ano}
              </div>
              <div className="bg-zinc-50 border border-zinc-200 p-2 text-sm font-mono font-bold flex-1 text-center">
                ATÉ: 31-{mes}-{ano}
              </div>
            </div>
          </div>

          <div className="col-span-5 p-4">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-2">
              03- NÚMERO DE IDENTIFICAÇÃO FISCAL
            </p>
            <div className="flex border border-zinc-200 bg-zinc-50 divide-x divide-zinc-200">
              {digits.map((digit, i) => (
                <div
                  key={i}
                  className="w-full h-8 flex items-center justify-center font-mono font-bold text-zinc-700"
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 04 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
          <div className="bg-white text-[#003366] px-2 py-0.5">04-</div>
          <span>IDENTIFICAÇÃO DO CONTRIBUINTE</span>
        </div>
        <div className="p-4 bg-zinc-50/50">
          <p className="text-[9px] font-bold text-zinc-400 uppercase mb-1">
            1 - NOME OU DESIGNAÇÃO SOCIAL:
          </p>
          <p className="text-sm font-black text-[#003366] uppercase tracking-tighter">
            {companyData?.name ||
              companyData?.nome_empresa ||
              'ROYAL CARS - COMERCIO E PRESTAÇÃO DE SERVIÇOS, LDA'}
          </p>
        </div>

        {/* Section 06 */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
          <div className="bg-white text-[#003366] px-2 py-0.5">06-</div>
          <span>SECTOR DE ACTIVIDADE E APURAMENTO DO IMPOSTO DEVIDO</span>
        </div>

        <div className="overflow-hidden">
          <table className="w-full text-left text-[10px] border-collapse font-bold uppercase tracking-tight">
            <thead>
              <tr className="text-zinc-500 border-b border-zinc-200 text-[9px]">
                <th className="px-6 py-2"></th>
                <th className="px-6 py-2 text-right">OPERAÇÕES SUJEITAS</th>
                <th className="px-6 py-2 text-right">TAXA</th>
                <th className="px-6 py-2 text-right">IMPOSTO DEVIDO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[
                { label: '1º INDÚSTRIA', value: 0, taxDue: 0 },
                { label: '2º COMÉRCIO', value: 0, taxDue: 0 },
                {
                  label: '3º PRESTAÇÃO DE SERVIÇOS',
                  value: totalSales,
                  taxDue: totalTax,
                },
                {
                  label: '4º SERVIÇOS CONTRATADOS A PRESTADORES NÃO RESIDENTES',
                  value: 0,
                  taxDue: 0,
                },
                { label: '5º OUTROS', value: 0, taxDue: 0 },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50">
                  <td className="px-6 py-3 font-black text-[#003366]">{row.label}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-block min-w-[200px] bg-zinc-50 border-b border-zinc-300 pb-1 font-mono">
                      {row.value > 0 ? formatCurrencyValue(row.value) : '—'}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right text-blue-600">7%</td>
                  <td className="px-6 py-3 text-right">
                    <div className="inline-block min-w-[200px] bg-zinc-100 border-b border-zinc-400 pb-1 text-zinc-900 font-mono">
                      {row.taxDue > 0 ? formatCurrencyValue(row.taxDue) : '—'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-[#003366]">
              <tr className="bg-[#003366]/5">
                <td className="px-6 py-3 font-black text-[#003366] uppercase tracking-widest">
                  TOTAL GERAL
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="inline-block min-w-[200px] bg-blue-50 border-b-2 border-[#003366] pb-1 font-mono font-black text-[#003366]">
                    {formatCurrencyValue(totalSales)}
                  </div>
                </td>
                <td className="px-6 py-3 text-right text-blue-600 font-black">7%</td>
                <td className="px-6 py-3 text-right">
                  <div className="inline-block min-w-[200px] bg-blue-100 border-b-2 border-[#003366] pb-1 font-black font-mono text-[#003366]">
                    {formatCurrencyValue(totalTax)}
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section 07.1 — Recebimentos (Fatura Recibo + Recibo) */}
        <div className="bg-[#003366] text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
          <div className="bg-white text-[#003366] px-2 py-0.5">07-</div>
          <Receipt size={14} />
          <span>
            RECEBIMENTOS — FATURA RECIBO E RECIBO ({MONTHS[mes]} {ano})
          </span>
          <span className="ml-auto bg-white/20 px-2 py-0.5">
            {recebimentos.length} documentos
          </span>
        </div>

        <div className="p-0">
          <TabelaRecebimentos recebimentos={recebimentos} />
        </div>

        {/* Summary bar for 07.1 */}
        <div className="bg-blue-50 border-t border-blue-200 px-6 py-3 flex justify-between items-center text-[10px] font-black uppercase">
          <div className="text-[#003366]">
            TOTAL RECEBIMENTOS DO PERÍODO (7%):
          </div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-zinc-500 font-bold text-[8px] mb-0.5">VALOR TRIBUTÁVEL</p>
              <p className="font-mono text-[#003366] text-sm">{formatCurrencyValue(totalRecebimentos)}</p>
            </div>
            <div className="w-px h-8 bg-zinc-300"></div>
            <div className="text-right">
              <p className="text-zinc-500 font-bold text-[8px] mb-0.5">IMPOSTO DEVIDO</p>
              <p className="font-mono text-blue-700 text-sm font-black">
                {formatCurrencyValue(totalImpostoRecebimentos)}
              </p>
            </div>
          </div>
        </div>

        {/* Section 07.2 — Isenções */}
        <div className="bg-amber-700 text-white p-1 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest border-t border-b border-white">
          <div className="bg-white text-amber-700 px-2 py-0.5">07-</div>
          <ShieldOff size={14} />
          <span>
            OPERAÇÕES ISENTAS DE IVA — IMPOSTO SELO DEVIDO ({MONTHS[mes]} {ano})
          </span>
          <span className="ml-auto bg-white/20 px-2 py-0.5">
            {isentos.length} documentos
          </span>
        </div>

        <div className="p-0">
          <TabelaIsencoes isentos={isentos} />
        </div>

        {/* Summary bar for 07.2 */}
        <div className="bg-amber-50 border-t border-amber-200 px-6 py-3 flex justify-between items-center text-[10px] font-black uppercase">
          <div className="text-amber-800">TOTAL OPERAÇÕES ISENTAS — IMPOSTO SELO (1%):</div>
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-zinc-500 font-bold text-[8px] mb-0.5">VALOR ISENTO</p>
              <p className="font-mono text-amber-800 text-sm">{formatCurrencyValue(totalIsentos)}</p>
            </div>
            <div className="w-px h-8 bg-zinc-300"></div>
            <div className="text-right">
              <p className="text-zinc-500 font-bold text-[8px] mb-0.5">IMPOSTO SELO DEVIDO</p>
              <p className="font-mono text-amber-700 text-sm font-black">
                {formatCurrencyValue(totalImpostoSelo)}
              </p>
            </div>
          </div>
        </div>

        {/* Grand totals summary */}
        <div className="bg-[#003366] text-white p-4 border-t-2 border-white">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[8px] font-bold uppercase opacity-70 mb-1">
                IMPOSTO REGIME SIMPLIFICADO (7%)
              </p>
              <p className="font-mono font-black text-xl text-yellow-300">
                {formatCurrencyValue(totalTax)}
              </p>
            </div>
            <div className="border-l border-r border-white/20">
              <p className="text-[8px] font-bold uppercase opacity-70 mb-1">
                IMPOSTO SELO ISENÇÕES (1%)
              </p>
              <p className="font-mono font-black text-xl text-amber-300">
                {formatCurrencyValue(totalImpostoSelo)}
              </p>
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase opacity-70 mb-1">TOTAL A PAGAR</p>
              <p className="font-mono font-black text-2xl text-white">
                {formatCurrencyValue(totalTax + totalImpostoSelo)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={() => setShowMapaFornecedor(true)}
          className="bg-[#003366] text-white px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all flex items-center gap-3 animate-pulse"
        >
          <FileText size={18} /> Aceder ao Mapa Fornecedor
        </button>
      </div>
    </div>
  );
};

export default RegimeSimplificadoForm;
