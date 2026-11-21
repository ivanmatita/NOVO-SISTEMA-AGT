import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Warehouse } from '../../types';
import toast from 'react-hot-toast';

interface StockExcelImportModalProps {
  isOpen: boolean;
  empresaId: string;
  userId?: string;
  userName?: string;
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedImportRow {
  rowNum: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  unit: string;
  cost_price: number;
  price: number;
  stock_quantity: number;
  min_stock: number;
  stock_maximo: number;
  warehouse_id: string | number | null;
  data_validade: string | null;
  error?: string;
}

export const StockExcelImportModal: React.FC<StockExcelImportModalProps> = ({
  isOpen,
  empresaId,
  userId,
  userName,
  warehouses,
  onClose,
  onSuccess,
}) => {
  const [rows, setRows] = useState<ParsedImportRow[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const aoa = [
      ['Nome', 'SKU', 'Codigo_Barras', 'Categoria', 'Unidade', 'Preco_Custo', 'Preco_Venda', 'Stock_Inicial', 'Stock_Minimo', 'Stock_Maximo', 'Validade_AAAA_MM_DD'],
      ['Arroz Agulha 1Kg', 'SKU-ARZ-001', '5601234567890', 'Mercearia', 'un', 950, 1350, 100, 20, 300, '2027-12-31'],
      ['Óleo Alimentar 1L', 'SKU-OLE-002', '5601234567891', 'Mercearia', 'lt', 1400, 1950, 50, 10, 150, ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Produtos');
    XLSX.writeFile(wb, 'Modelo_Importacao_Stock_IMATEC.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        const parsed: ParsedImportRow[] = json.map((raw, idx) => {
          const name = String(raw.Nome || raw.nome || raw.Name || raw.name || raw.Produto || '').trim();
          const sku = String(raw.SKU || raw.sku || raw.Referencia || raw.referente || '').trim();
          const barcode = String(raw.Codigo_Barras || raw.barcode || raw.EAN || raw.ean || '').trim();
          const category = String(raw.Categoria || raw.category || raw.categoria || 'Geral').trim();
          const unit = String(raw.Unidade || raw.unit || raw.unidade || 'un').trim() || 'un';
          const cost_price = Number(raw.Preco_Custo || raw.cost_price || raw.preco_compra || 0);
          const price = Number(raw.Preco_Venda || raw.price || raw.preco_venda || 0);
          const stock_quantity = Number(raw.Stock_Inicial || raw.stock_quantity || raw.Stock || 0);
          const min_stock = Number(raw.Stock_Minimo || raw.min_stock || 0);
          const stock_maximo = Number(raw.Stock_Maximo || raw.stock_maximo || 0);
          const valRaw = String(raw.Validade_AAAA_MM_DD || raw.data_validade || raw.Validade || '').trim();
          const data_validade = /^\d{4}-\d{2}-\d{2}$/.test(valRaw) ? valRaw : null;

          let error: string | undefined;
          if (!name) error = 'Nome obrigatório';
          else if (isNaN(price) || price < 0) error = 'Preço de venda inválido';
          else if (isNaN(stock_quantity) || stock_quantity < 0) error = 'Stock inicial inválido';

          return {
            rowNum: idx + 2,
            name,
            sku,
            barcode,
            category,
            unit,
            cost_price: isNaN(cost_price) ? 0 : cost_price,
            price: isNaN(price) ? 0 : price,
            stock_quantity: isNaN(stock_quantity) ? 0 : stock_quantity,
            min_stock: isNaN(min_stock) ? 0 : min_stock,
            stock_maximo: isNaN(stock_maximo) ? 0 : stock_maximo,
            warehouse_id: defaultWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : null),
            data_validade,
            error,
          };
        });

        setRows(parsed);
      } catch (err: any) {
        toast.error('Falha ao ler ficheiro Excel: ' + (err?.message || 'Formato inválido'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = rows.filter((r) => !r.error);

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    let created = 0;
    let failed = 0;

    try {
      const armId = defaultWarehouseId || (warehouses[0]?.id ? String(warehouses[0].id) : null);
      const numArm = armId && !isNaN(Number(armId)) ? Number(armId) : null;

      for (const row of validRows) {
        try {
          const payload: any = {
            empresa_id: empresaId,
            name: row.name,
            nome: row.name,
            sku: row.sku || null,
            referente: row.sku || null,
            barcode: row.barcode || null,
            ean: row.barcode || null,
            category: row.category || 'Geral',
            categoria: row.category || 'Geral',
            unit: row.unit,
            unidade: row.unit,
            cost_price: row.cost_price,
            preco_compra: row.cost_price,
            preco_custo: row.cost_price,
            price: row.price,
            preco: row.price,
            preco_venda: row.price,
            stock_quantity: row.stock_quantity,
            stock: row.stock_quantity,
            stock_atual: row.stock_quantity,
            min_stock: row.min_stock,
            stock_minimo: row.min_stock,
            stock_maximo: row.stock_maximo,
            warehouse_id: numArm,
            armazem_id: armId,
            data_validade: row.data_validade,
            tipologia: 'comercio',
            tipo: 'Produto',
            ativo: true,
            is_active: true,
            data_registo: new Date().toISOString().split('T')[0],
          };

          const { data: inserted, error } = await supabase
            .from('produtos')
            .insert([payload])
            .select('id')
            .single();

          if (error) {
            failed++;
            continue;
          }

          if (inserted?.id && armId) {
            await supabase.from('stock_saldos').upsert(
              [
                {
                  empresa_id: empresaId,
                  product_id: inserted.id,
                  armazem_id: armId,
                  quantidade_disponivel: row.stock_quantity,
                  quantidade_reservada: 0,
                  custo_medio: row.cost_price,
                },
              ],
              { onConflict: 'empresa_id,product_id,armazem_id' }
            );
          }

          if (inserted?.id && row.stock_quantity > 0) {
            await supabase.from('movimentacoes_stock').insert([
              {
                empresa_id: empresaId,
                product_id: inserted.id,
                produto_id: inserted.id,
                product_name: row.name,
                type: 'entry',
                tipo: 'entrada',
                subtipo: 'importacao_excel',
                quantity: row.stock_quantity,
                quantidade: row.stock_quantity,
                unit_price: row.cost_price,
                custo_unitario: row.cost_price,
                valor_total: Math.round(row.stock_quantity * row.cost_price * 100) / 100,
                previous_stock: 0,
                current_stock: row.stock_quantity,
                warehouse_id: numArm,
                armazem_id: armId,
                documento_origem: 'Importação Excel',
                description: 'Stock inicial importado via Excel',
                ano: new Date().getFullYear(),
                created_by: userId || null,
                created_by_nome: userName || 'Operador',
              },
            ]);
          }

          created++;
        } catch {
          failed++;
        }
      }

      toast.success(`Importação concluída: ${created} produtos criados${failed > 0 ? `, ${failed} falharam` : ''}.`);
      onSuccess();
      onClose();
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[115] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col border-t-4 border-[#003366] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 bg-[#003366] text-white">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            <FileSpreadsheet size={16} />
            <span>Importação em Massa de Produtos via Excel (.xlsx / .csv)</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="bg-white border border-zinc-300 hover:bg-zinc-100 text-[#003366] px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Descarregar Modelo Excel
              </button>

              <label className="bg-[#003366] hover:bg-[#002244] text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload size={14} /> Carregar Ficheiro Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém Destino:</label>
              <select
                value={defaultWarehouseId}
                onChange={(e) => setDefaultWarehouseId(e.target.value)}
                className="bg-white border border-zinc-300 px-2.5 py-1.5 text-xs font-bold"
              >
                <option value="">-- Geral --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name || (w as any).nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="border border-zinc-200 overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-[10px] uppercase font-black text-zinc-600 border-b border-zinc-200">
                  <tr>
                    <th className="px-2.5 py-2">Linha</th>
                    <th className="px-2.5 py-2">Produto</th>
                    <th className="px-2.5 py-2">SKU / EAN</th>
                    <th className="px-2.5 py-2">Categoria</th>
                    <th className="px-2.5 py-2 text-right">Custo</th>
                    <th className="px-2.5 py-2 text-right">Venda</th>
                    <th className="px-2.5 py-2 text-right">Stock Ini.</th>
                    <th className="px-2.5 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.rowNum} className={r.error ? 'bg-red-50' : 'hover:bg-zinc-50'}>
                      <td className="px-2.5 py-2 font-mono text-zinc-400">#{r.rowNum}</td>
                      <td className="px-2.5 py-2 font-bold text-zinc-900">{r.name || '---'}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-zinc-500">{r.sku || r.barcode || '---'}</td>
                      <td className="px-2.5 py-2 text-zinc-600">{r.category}</td>
                      <td className="px-2.5 py-2 text-right">{r.cost_price.toLocaleString('pt-AO')}</td>
                      <td className="px-2.5 py-2 text-right font-bold">{r.price.toLocaleString('pt-AO')}</td>
                      <td className="px-2.5 py-2 text-right font-bold text-[#003366]">
                        {r.stock_quantity} {r.unit}
                      </td>
                      <td className="px-2.5 py-2">
                        {r.error ? (
                          <span className="text-red-700 font-bold inline-flex items-center gap-1">
                            <AlertCircle size={12} /> {r.error}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 size={12} /> Válido
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-200 p-10 text-center text-zinc-400 text-xs">
              Descarregue o modelo ou carregue uma folha Excel (.xlsx / .csv) para validar antes de importar.
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="text-xs text-zinc-500 font-medium">
            Válidos para importação: <strong className="text-[#003366]">{validRows.length}</strong> de {rows.length}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 cursor-pointer">
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importing || validRows.length === 0}
              className="bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              {importing ? 'A Importar...' : `Confirmar Importação (${validRows.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
