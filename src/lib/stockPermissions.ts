import type { StockRole, StockSubRoute, User } from '../types';

export interface StockCapabilities {
  role: StockRole;
  label: string;
  canView: boolean;
  canCreateProduct: boolean;
  canEditProduct: boolean;
  canDeleteProduct: boolean;
  canRecordEntryExit: boolean;
  canAdjustStock: boolean;
  canTransfer: boolean;
  canApproveTransfer: boolean;
  canRunInventory: boolean;
  canReconcileInventory: boolean;
  canManagePurchases: boolean;
  canApprovePurchases: boolean;
  canManageSuppliers: boolean;
  canExportReports: boolean;
  canRunAgents: boolean;
  canConfirmAgentActions: boolean;
  canConfigure: boolean;
}

export function resolveStockRole(user?: User | null): StockRole {
  if (!user) return 'consulta';
  const rawRole = String(user.role || '').toLowerCase().trim();
  if (user.is_admin || rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'super_admin' || rawRole === 'administrador') {
    return 'admin';
  }
  if (rawRole === 'gestor_stock' || rawRole === 'gestor' || rawRole === 'manager' || rawRole === 'stock_manager') {
    return 'gestor_stock';
  }
  if (rawRole === 'auditor' || rawRole === 'audit') {
    return 'auditor';
  }
  if (rawRole === 'consulta' || rawRole === 'viewer' || rawRole === 'readonly') {
    return 'consulta';
  }
  // Operadores normais / utilizadores de armazém / caixa
  return 'operador';
}

export function getStockCapabilities(user?: User | null): StockCapabilities {
  const role = resolveStockRole(user);

  const labels: Record<StockRole, string> = {
    admin: 'Administrador',
    gestor_stock: 'Gestor de Stock',
    operador: 'Operador de Armazém',
    auditor: 'Auditor',
    consulta: 'Consulta',
  };

  switch (role) {
    case 'admin':
      return {
        role,
        label: labels[role],
        canView: true,
        canCreateProduct: true,
        canEditProduct: true,
        canDeleteProduct: true,
        canRecordEntryExit: true,
        canAdjustStock: true,
        canTransfer: true,
        canApproveTransfer: true,
        canRunInventory: true,
        canReconcileInventory: true,
        canManagePurchases: true,
        canApprovePurchases: true,
        canManageSuppliers: true,
        canExportReports: true,
        canRunAgents: true,
        canConfirmAgentActions: true,
        canConfigure: true,
      };
    case 'gestor_stock':
      return {
        role,
        label: labels[role],
        canView: true,
        canCreateProduct: true,
        canEditProduct: true,
        canDeleteProduct: false,
        canRecordEntryExit: true,
        canAdjustStock: true,
        canTransfer: true,
        canApproveTransfer: true,
        canRunInventory: true,
        canReconcileInventory: true,
        canManagePurchases: true,
        canApprovePurchases: true,
        canManageSuppliers: true,
        canExportReports: true,
        canRunAgents: true,
        canConfirmAgentActions: true,
        canConfigure: true,
      };
    case 'operador':
      return {
        role,
        label: labels[role],
        canView: true,
        canCreateProduct: true,
        canEditProduct: true,
        canDeleteProduct: false,
        canRecordEntryExit: true,
        canAdjustStock: true,
        canTransfer: true,
        canApproveTransfer: false,
        canRunInventory: true,
        canReconcileInventory: false,
        canManagePurchases: true,
        canApprovePurchases: false,
        canManageSuppliers: true,
        canExportReports: true,
        canRunAgents: true,
        canConfirmAgentActions: false,
        canConfigure: false,
      };
    case 'auditor':
      return {
        role,
        label: labels[role],
        canView: true,
        canCreateProduct: false,
        canEditProduct: false,
        canDeleteProduct: false,
        canRecordEntryExit: false,
        canAdjustStock: false,
        canTransfer: false,
        canApproveTransfer: false,
        canRunInventory: true,
        canReconcileInventory: false,
        canManagePurchases: false,
        canApprovePurchases: false,
        canManageSuppliers: false,
        canExportReports: true,
        canRunAgents: true,
        canConfirmAgentActions: false,
        canConfigure: false,
      };
    case 'consulta':
    default:
      return {
        role: 'consulta',
        label: labels.consulta,
        canView: true,
        canCreateProduct: false,
        canEditProduct: false,
        canDeleteProduct: false,
        canRecordEntryExit: false,
        canAdjustStock: false,
        canTransfer: false,
        canApproveTransfer: false,
        canRunInventory: false,
        canReconcileInventory: false,
        canManagePurchases: false,
        canApprovePurchases: false,
        canManageSuppliers: false,
        canExportReports: true,
        canRunAgents: false,
        canConfirmAgentActions: false,
        canConfigure: false,
      };
  }
}

export const STOCK_ROUTE_MAP: Record<StockSubRoute, string> = {
  dashboard: '/stock',
  produtos: '/stock/produtos',
  categorias: '/stock/categorias',
  entradas: '/stock/entradas',
  saidas: '/stock/saidas',
  movimentos: '/stock/movimentos',
  armazens: '/stock/armazens',
  transferencias: '/stock/transferencias',
  inventario: '/stock/inventario',
  compras: '/stock/compras',
  fornecedores: '/stock/fornecedores',
  alertas: '/stock/alertas',
  relatorios: '/stock/relatorios',
  'agentes-ia': '/stock/agentes-ia',
  configuracoes: '/stock/configuracoes',
  precos: '/stock/precos',
  producao: '/stock/producao',
};

export function parseStockSubRouteFromLocation(pathname?: string): StockSubRoute | null {
  const path = (pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')).toLowerCase().replace(/\/+$/, '');
  if (!path.startsWith('/stock')) return null;
  if (path === '/stock') return 'dashboard';
  const slug = path.slice('/stock/'.length) as StockSubRoute;
  if (slug && Object.prototype.hasOwnProperty.call(STOCK_ROUTE_MAP, slug)) {
    return slug;
  }
  return 'dashboard';
}
