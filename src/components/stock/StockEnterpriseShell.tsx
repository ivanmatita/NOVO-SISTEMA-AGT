import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  FileSpreadsheet,
  FileText,
  FolderTree,
  History,
  Home,
  LayoutDashboard,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Scale,
  Settings,
  ShoppingBag,
  Tag,
  TrendingDown,
} from 'lucide-react';
import type {
  Product,
  StockMovement,
  StockSettings,
  StockSubRoute,
  Supplier,
  User,
  Warehouse,
} from '../../types';
import { getStockCapabilities } from '../../lib/stockPermissions';
import { stockEnterpriseService, type StockOverviewData } from '../../services/stockEnterpriseService';
import { supabase } from '../../lib/supabase';
import { StockDashboardModule } from './StockDashboardModule';
import { StockAtualModule } from './StockAtualModule';
import { StockCategoriesUnitsModule } from './StockCategoriesUnitsModule';
import { StockEntriesExitsModule } from './StockEntriesExitsModule';
import { StockTransfersModule, StockInventoryLotsModule } from './StockTransfersInventoryModule';
import {
  StockAlertsModule,
  StockPurchasesModule,
  StockSettingsModule,
  StockSuppliersModule,
} from './StockPurchasesAlertsSettingsModule';
import { StockDetailedReportsModule } from './StockDetailedReportsModule';
import { StockAgentsHubModule } from './StockAgentsHubModule';
import { StockProducaoModule } from './StockProducaoModule';
import { StockGestaoArtigosModule } from './StockGestaoArtigosModule';
import { StockRequisicaoMaterialModule } from './StockRequisicaoMaterialModule';
import { StockGestaoSaidasModule } from './StockGestaoSaidasModule';
import { StockValorizacaoStockModule } from './StockValorizacaoStockModule';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { StockExcelImportModal } from './StockExcelImportModal';
import { WarehouseModule } from '../WarehouseModule';
import { PriceTableModule } from '../PriceTableModule';
import toast from 'react-hot-toast';

interface StockEnterpriseShellProps {
  user: User | null;
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  metrics?: any[];
  companyData?: any;
  activeTaxes?: any[];
  fiscalYear: number;
  issuedDocuments?: any[];
  activeSubRoute: StockSubRoute;
  onSubRouteChange: (route: StockSubRoute) => void;
  onRefresh: () => void;
  onNewProduct: () => void;
  onEditProduct: (prod: Product) => void;
  onOpenAdjustment: (prod: Product) => void;
  onOpenTransfer: (prod: Product) => void;
  onViewProductDetail: (prod: Product) => void;
  onViewStockReport: (prod: Product) => void;
}

const DEFAULT_SETTINGS = (empresaId: string): StockSettings => ({
  empresa_id: empresaId,
  metodo_valorizacao: 'CMP',
  permitir_stock_negativo: false,
  bloquear_venda_sem_stock: true,
  dias_alerta_validade: 30,
  dias_sem_movimento: 60,
  aprovar_transferencias: true,
  aprovar_inventarios: true,
  agentes_frequencia_minutos: 60,
  alerta_email: false,
});

export const StockEnterpriseShell: React.FC<StockEnterpriseShellProps> = ({
  user,
  products,
  stockMovements,
  warehouses,
  metrics = [],
  companyData,
  activeTaxes = [],
  fiscalYear,
  activeSubRoute,
  onSubRouteChange,
  onRefresh,
  onNewProduct,
  onEditProduct,
  onOpenAdjustment,
  onOpenTransfer,
  onViewProductDetail,
  onViewStockReport,
}) => {
  const empresaId = String(user?.empresa_id || (user as any)?.company_id || '');
  const caps = getStockCapabilities(user);

  const [overview, setOverview] = useState<StockOverviewData | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [comprasExistentes, setComprasExistentes] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [excelImportOpen, setExcelImportOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const loadEnterpriseData = useCallback(async () => {
    if (!empresaId) return;
    setLoadingOverview(true);
    try {
      const [ov, fornRes, compRes] = await Promise.all([
        stockEnterpriseService.getOverview().catch((err) => {
          console.warn('[StockShell] Overview warning:', err?.message || err);
          return null;
        }),
        supabase.from('fornecedores').select('*').eq('empresa_id', empresaId).order('name', { ascending: true }),
        supabase
          .from('compras')
          .select('id, purchase_number, numero_documento, fornecedor_id, fornecedor_nome, supplier_name, data_emissao, date, valor_total, total, status, estado')
          .eq('empresa_id', empresaId)
          .order('created_at', { ascending: false })
          .limit(150),
      ]);
      if (ov) setOverview(ov);
      if (fornRes.data) setSuppliers(fornRes.data as Supplier[]);
      if (compRes.data) setComprasExistentes(compRes.data);
    } finally {
      setLoadingOverview(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  useEffect(() => {
    const onGlobalRefresh = () => {
      loadEnterpriseData();
    };
    window.addEventListener('refresh_stock', onGlobalRefresh);
    return () => window.removeEventListener('refresh_stock', onGlobalRefresh);
  }, [loadEnterpriseData]);

  const handleFullRefresh = useCallback(() => {
    onRefresh();
    loadEnterpriseData();
  }, [onRefresh, loadEnterpriseData]);

  const handleScanAlerts = useCallback(async () => {
    try {
      const res = await stockEnterpriseService.scanAlerts();
      toast.success(`Varredura concluída: ${res.alerts_created || 0} novos alertas gerados.`);
      await loadEnterpriseData();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao analisar alertas de stock');
    }
  }, [loadEnterpriseData]);

  const activeAlertsCount = (overview?.alertas || []).filter((a) => a.estado === 'ativo').length;
  const pendingAgentCount = (overview?.agentes_atividades || []).filter(
    (a) => a.requer_confirmacao && a.estado_confirmacao === 'pendente'
  ).length;

  const navItems: Array<{ id: StockSubRoute; label: string; icon: React.ComponentType<any>; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'produtos', label: 'Produtos & Stock', icon: Package },
    { id: 'categorias', label: 'Categorias & Unid.', icon: FolderTree },
    { id: 'entradas', label: 'Entradas', icon: ArrowDownLeft },
    { id: 'saidas', label: 'Saídas', icon: ArrowUpRight },
    { id: 'movimentos', label: 'Movimentos', icon: History },
    { id: 'armazens', label: 'Armazéns', icon: Home },
    { id: 'transferencias', label: 'Transferências', icon: ArrowRightLeft },
    { id: 'inventario', label: 'Inventário & Lotes', icon: ClipboardCheck },
    { id: 'compras', label: 'Compras & Req.', icon: ShoppingBag },
    { id: 'fornecedores', label: 'Fornecedores', icon: Building2 },
    { id: 'alertas', label: 'Alertas', icon: Bell, badge: activeAlertsCount },
    { id: 'relatorios', label: 'Relatórios', icon: FileText },
    { id: 'agentes-ia', label: 'Agentes IA (9)', icon: Cpu, badge: pendingAgentCount },
    { id: 'producao', label: 'Produção', icon: Cpu },
    { id: 'gestao-artigos', label: 'Gestão de Artigos', icon: BookOpen },
    { id: 'requisicao-material', label: 'Requisição Material', icon: ClipboardList },
    { id: 'gestao-saidas', label: 'Gestão de Saídas', icon: TrendingDown },
    { id: 'valorizacao-stock', label: 'Valorização Stock', icon: Scale },
    { id: 'precos', label: 'Tabela Serviços', icon: Tag },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleBarcodeLookup = (code: string) => {
    const clean = code.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        String(p.barcode || '').toLowerCase() === clean ||
        String(p.ean || '').toLowerCase() === clean ||
        String(p.sku || '').toLowerCase() === clean ||
        String(p.referente || '').toLowerCase() === clean ||
        String(p.id) === code.trim()
    );
    if (matched) {
      toast.success(`Produto localizado: ${matched.name} (${matched.stock_quantity} ${matched.unit || 'un'})`);
      onViewProductDetail(matched);
    } else {
      toast.error(`Nenhum produto cadastrado encontrado para o código "${code}".`);
    }
  };

  const saldos = overview?.saldos || [];
  const categorias = overview?.categorias || [];
  const unidades = overview?.unidades || [];
  const lotes = overview?.lotes || [];
  const transferencias = overview?.transferencias || [];
  const inventarios = overview?.inventarios || [];
  const inventarioItens = overview?.inventario_itens || [];
  const ordensCompra = overview?.ordens_compra || [];
  const alertas = overview?.alertas || [];
  const configuracoes = overview?.configuracoes || DEFAULT_SETTINGS(empresaId);
  const agentesAtividades = overview?.agentes_atividades || [];

  return (
    <div className="space-y-4">
      {/* Cabeçalho Unificado Enterprise */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#003366] text-white flex items-center justify-center shrink-0">
              <BarChart3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-[#003366] uppercase tracking-tight leading-none">
                  Gestão Avançada de Stock & Inventário
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-[#003366] text-[9px] font-black uppercase">
                  Perfil: {caps.label}
                </span>
              </div>
              <p className="text-zinc-400 text-[10px] sm:text-[11px] font-medium mt-0.5">
                Multi-armazém, movimentos com cálculo automático, lotes/validades, inventário físico e equipa IA multiagente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
              title="Ler código de barras ou QR Code por câmara"
            >
              <QrCode size={14} /> Scanner
            </button>

            {caps.canCreateProduct && (
              <>
                <button
                  type="button"
                  onClick={() => setExcelImportOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer"
                >
                  <FileSpreadsheet size={14} /> Importar Excel
                </button>
                <button
                  type="button"
                  onClick={onNewProduct}
                  className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer shadow-2xs"
                >
                  <Plus size={14} /> Novo Produto
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleFullRefresh}
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg cursor-pointer"
              title="Atualizar Stock"
            >
              <RefreshCw size={14} className={loadingOverview ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>
        </div>

        {/* Navegação de Submódulos (/stock/*) */}
        <div className="flex items-center gap-1 px-4 py-2 bg-zinc-50/70 overflow-x-auto">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeSubRoute === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSubRouteChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#003366] text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                      active ? 'bg-white text-[#003366]' : 'bg-red-600 text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderização do Submódulo Ativo */}
      {activeSubRoute === 'dashboard' && (
        <StockDashboardModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          saldos={saldos}
          lotes={lotes}
          transferencias={transferencias}
          ordensCompra={ordensCompra}
          alertas={alertas}
          categorias={categorias}
          settings={configuracoes}
          purchases={comprasExistentes}
          onNavigate={onSubRouteChange}
          onScanAlerts={handleScanAlerts}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'produtos' && (
        <StockAtualModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          onRefresh={handleFullRefresh}
          onEditProduct={caps.canEditProduct ? onEditProduct : undefined}
          onNewProduct={caps.canCreateProduct ? onNewProduct : undefined}
          onNavigateToPurchases={() => onSubRouteChange('compras')}
          onManageWarehouses={() => onSubRouteChange('armazens')}
          onOpenAdjustment={caps.canAdjustStock ? onOpenAdjustment : undefined}
          onOpenTransfer={caps.canTransfer ? onOpenTransfer : undefined}
          onViewProductDetail={onViewProductDetail}
          onViewStockReport={onViewStockReport}
        />
      )}

      {activeSubRoute === 'categorias' && (
        <StockCategoriesUnitsModule
          empresaId={empresaId}
          categorias={categorias}
          unidades={unidades}
          canEdit={caps.canEditProduct}
          onRefresh={handleFullRefresh}
        />
      )}

      {(activeSubRoute === 'entradas' || activeSubRoute === 'saidas' || activeSubRoute === 'movimentos') && (
        <StockEntriesExitsModule
          mode={activeSubRoute}
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          saldos={saldos}
          canOperate={caps.canRecordEntryExit}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'armazens' && <WarehouseModule onRefresh={handleFullRefresh} />}

      {activeSubRoute === 'transferencias' && (
        <StockTransfersModule
          products={products}
          warehouses={warehouses}
          saldos={saldos}
          transferencias={transferencias}
          canTransfer={caps.canTransfer}
          canApprove={caps.canApproveTransfer}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'inventario' && (
        <StockInventoryLotsModule
          empresaId={empresaId}
          products={products}
          warehouses={warehouses}
          inventarios={inventarios}
          inventarioItens={inventarioItens}
          lotes={lotes}
          canCount={caps.canRunInventory}
          canReconcile={caps.canReconcileInventory}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'compras' && (
        <StockPurchasesModule
          empresaId={empresaId}
          userId={user?.id}
          userName={user?.nome || user?.name || user?.username}
          products={products}
          warehouses={warehouses}
          suppliers={suppliers}
          ordensCompra={ordensCompra}
          comprasExistentes={comprasExistentes}
          canManage={caps.canManagePurchases}
          canApprove={caps.canApprovePurchases}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'fornecedores' && (
        <StockSuppliersModule
          suppliers={suppliers}
          comprasExistentes={comprasExistentes}
          ordensCompra={ordensCompra}
          onGoToOrders={() => onSubRouteChange('compras')}
        />
      )}

      {activeSubRoute === 'alertas' && (
        <StockAlertsModule
          empresaId={empresaId}
          userId={user?.id}
          alertas={alertas}
          onScanAlerts={handleScanAlerts}
          onRefresh={handleFullRefresh}
          onCreateOrderFromAlert={() => onSubRouteChange('compras')}
        />
      )}

      {activeSubRoute === 'relatorios' && (
        <StockDetailedReportsModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          saldos={saldos}
          companyData={companyData}
          fiscalYear={fiscalYear}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'agentes-ia' && (
        <StockAgentsHubModule
          atividades={agentesAtividades}
          canRun={caps.canRunAgents}
          canConfirm={caps.canConfirmAgentActions}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'configuracoes' && (
        <StockSettingsModule
          settings={configuracoes}
          canConfigure={caps.canConfigure}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'producao' && (
        <StockProducaoModule
          user={user}
          companyData={companyData}
          warehouses={warehouses}
          metrics={metrics}
          activeTaxes={activeTaxes}
          onRefresh={handleFullRefresh}
          onNavigateToStock={() => onSubRouteChange('produtos')}
        />
      )}

      {activeSubRoute === 'gestao-artigos' && (
        <StockGestaoArtigosModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          companyData={companyData}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'requisicao-material' && (
        <StockRequisicaoMaterialModule
          empresaId={empresaId}
          warehouses={warehouses}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'gestao-saidas' && (
        <StockGestaoSaidasModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          companyData={companyData}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'valorizacao-stock' && (
        <StockValorizacaoStockModule
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          saldos={saldos}
          onRefresh={handleFullRefresh}
        />
      )}

      {activeSubRoute === 'precos' && (
        <PriceTableModule
          user={user}
          companyData={companyData}
          products={products}
          activeTaxes={activeTaxes}
          onProductUpdated={handleFullRefresh}
        />
      )}

      {/* Modais globais do Stock */}
      <StockExcelImportModal
        isOpen={excelImportOpen}
        empresaId={empresaId}
        userId={user?.id}
        userName={user?.nome || user?.name || user?.username}
        warehouses={warehouses}
        onClose={() => setExcelImportOpen(false)}
        onSuccess={handleFullRefresh}
      />

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeLookup}
      />
    </div>
  );
};
