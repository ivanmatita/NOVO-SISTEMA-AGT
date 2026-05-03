export interface CompanyData {
  name: string;
  nif: string;
  address: string;
  provincia: string;
  city?: string;
  contact: string;
  email: string;
  responsavel: string;
  regime: string;
  alvara: string;
  matricula: string;
  inss: string;
  coordenadas_bancarias: string;
  tipo_empresa: string;
  logo?: string;
  logo_url?: string;
  logo_size?: number;
  marca_agua?: string;
  watermark_url?: string;
  watermark_size?: number;
  footer?: string;
  footer_image_url?: string;
  footer_size?: number;
  company_id?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  company_id: string;
  role: 'admin' | 'operador';
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

export interface Caixa {
  id: string;
  name: string;
  bankName?: string;
  account?: string;
  responsible?: string;
  user?: string;
  users?: number;
  initialBalance: number;
  currentBalance: number;
  obs: string;
  status: 'aberto' | 'fechado';
  company_id?: string;
}

export interface CaixaMovement {
  id: string;
  caixaId: string;
  type: 'entrada' | 'saida' | 'transferencia';
  amount: number;
  description: string;
  date: string;
  moeda?: string;
  targetCaixaId?: string; // For transfers
  company_id?: string;
}

export interface Client {
  id: string | number;
  name: string;
  email: string;
  contribuinte: string;
  morada: string;
  localidade?: string;
  codigo_postal?: string;
  provincia?: string;
  municipio?: string;
  pais?: string;
  telefone?: string;
  webpage?: string;
  tipo_cliente?: 'normal' | 'grupo_nacional' | 'nao_grupo' | 'subsidiarias' | 'nao_grupo_estrangeiro' | 'associados';
  estado_nif?: 'ativo' | 'suspenso' | 'inválido' | 'não encontrado';
  saldo_inicial?: number;
  company_id: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  referente?: string;
  data_registo?: string;
  armazem?: string;
  warehouse_id?: number;
  tipo_documento?: string;
  preco_compra?: number;
  cost_price?: number;
  price: number; // preco_venda
  finalidade?: string;
  tipologia?: string;
  unit: string;
  stock_quantity: number;
  min_stock?: number;
  category?: string;
  barcode?: string;
  created_at?: string;
  image?: string;
}

export interface InvoiceItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  retencao_fonte?: number;
  tipologia?: string;
  desconto?: number;
  tipo_artigo?: string;
  comprimento?: number;
  largura?: number;
  altura?: number;
  showDimensions?: boolean;
  tax?: string;
  tax_rate?: number;
  warehouse_id?: number;
  warehouse_responsible?: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'ativo' | 'anulado' | 'pending' | 'paid';
  total: number;
  items?: InvoiceItem[];
  client_email?: string;
  client_nif?: string;
  client_address?: string;
  document_type?: string;
  country_code?: string;
  service_date?: string;
  service_location?: string;
  series_id?: number;
  currency?: string;
  hash?: string;
  signature?: string;
  is_certified?: boolean;
  payment_status?: 'pending' | 'partial' | 'paid';
  is_anulado?: boolean;
  work_site_id?: number;
  cash_box?: string;
  payment_method?: string;
  operator_name?: string;
  total_in_words?: string;
  retencao_fonte_total?: number;
  global_discount?: number;
}

export interface DashboardStats {
  totalInvoiced: number;
  pendingCount: number;
  clientCount: number;
  totalExpenses: number;
  cashBalance: number;
  recentInvoices: Invoice[];
}

export interface Employee {
  id: number;
  name: string;
  nome_completo?: string;
  role: string;
  profession_id?: number;
  profession_name?: string;
  salary: number;
  email: string;
  phone: string;
  nif?: string;
  bi?: string;
  address?: string;
  iban?: string;
  bank_name?: string;
  bank_account?: string;
  inss_number?: string;
  image_url?: string;
  birth_date?: string;
  gender?: string;
  marital_status?: string;
  academic_level?: string;
  department?: string;
  contract_type?: 'efetivo' | 'temporario' | 'estagiario';
  dependents?: number;
  subject_to_irt?: boolean;
  subject_to_inss?: boolean;
  status: 'active' | 'inactive' | 'dismissed';
  hired_at: string;
  dismissed_at?: string;
  dismissal_reason?: string;
  dismissal_ordered_by?: string;
  dismissal_observations?: string;
}

export interface Profession {
  id: number;
  name: string;
  inss_profession?: string;
  base_salary?: number;
}

export interface EmployeeContract {
  id: number;
  employee_id: number;
  employee_name?: string;
  contract_type: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'inactive';
}

export interface EmployeeAbsence {
  id: number;
  employee_id: number;
  employee_name?: string;
  type: 'vacation' | 'sick' | 'subsidy' | string;
  start_date: string;
  end_date: string;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface EmployeeAttendance {
  id: number;
  employee_id: number;
  employee_name?: string;
  date: string;
  status: 'present' | 'absent' | 'late';
}

export interface POSSale {
  id: number;
  total: number;
  date: string;
  items_json: string;
}

export interface AppSettings {
  fiscal_year: string;
  company_name: string;
  currency: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  employee_name: string;
  month: string;
  year: number;
  amount: number;
  status: 'pending' | 'paid';
  paid_at?: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  reference_id?: number;
}

export interface CashSession {
  id: number;
  opened_at: string;
  closed_at?: string;
  initial_balance: number;
  final_balance?: number;
  total_sales?: number;
  total_discounts?: number;
  status: 'open' | 'closed';
  pos_point_id?: number;
}

export interface FiscalSeries {
  id: number;
  name: string;
  description?: string;
  user_id: string | number;
  user_name?: string;
  type: 'normal' | 'manual' | 'manual_recovery';
  reference: string; 
  counter: number;
  year: number;
  is_active: boolean;
  data_inicio: string;
  destino: string;
  top_config?: boolean;
  down_config?: boolean;
  watermark_setup?: boolean;
  users_count?: number;
  bancos_count?: string;
  created_at: string;
}

export interface CostCenter {
  id: number;
  name: string;
  code: string;
}

export interface POSPoint {
  id: number;
  name: string;
  location: string;
  is_active: boolean;
}

export interface Workplace {
  id: number;
  name: string;
  company_id: string;
  location?: string;
  code?: string;
  created_at: string;
}

export interface WorkSite {
  id: number;
  client_id: number;
  company_id?: string;
  client_name?: string;
  start_date: string;
  end_date: string;
  title: string;
  code: string;
  staff_per_day: number;
  total_staff: number;
  location: string;
  description: string;
  contact: string;
  observations: string;
}

export interface WorkSiteMovement {
  id: number;
  work_site_id: number;
  company_id?: string;
  date: string;
  doc_no: string;
  company: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
}

export interface IssuedDocument {
  id: number;
  tipo_documento: string;
  document_type?: string;
  numero_documento: string;
  invoice_number?: string;
  reference_document?: string;
  data_emissao: string;
  date?: string;
  data_vencimento: string;
  due_date?: string;
  cliente_id: number;
  client_id?: number;
  client_name?: string;
  local_trabalho: string;
  work_site_id?: string;
  work_site_title?: string;
  moeda: string;
  currency?: string;
  cambio: number;
  exchange_rate?: number;
  contravalor: number;
  counter_value?: number;
  total?: number;
  vat_amount?: number;
  desconto_global: number;
  global_discount?: number;
  tipo_cativacao_iva: 'sem' | '50' | '100';
  utilizador_emissao: string;
  data_registo: string;
  estado_documento: 'ativo' | 'anulado';
  status?: string;
  is_certified?: boolean;
  series_id?: number;
  series_reference?: string;
  series_name?: string;
  cash_box?: string;
  payment_method?: string;
  operator_name?: string;
  total_in_words?: string;
  items?: InvoiceItem[];
  is_anulado?: boolean;
  payment_status?: 'pending' | 'partial' | 'paid';
  paid_amount?: number;
  paid_at?: string;
  void_reason?: string;
  void_at?: string;
  vat_withholding?: number;
  service_date?: string;
  service_location?: string;
  retencao_fonte_total?: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  company_id?: string;
  type: 'entry' | 'exit' | 'transfer' | 'adjustment' | 'adjustment_plus' | 'adjustment_minus';
  quantity: number;
  unit_price: number;
  previous_stock: number;
  current_stock: number;
  warehouse_id?: number;
  to_warehouse_id?: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

export type POSArea = 'vendas normal' | 'lojas' | 'restaurante' | 'bar';

export interface Warehouse {
  id: number;
  name: string;
  localidade?: string;
  provincia?: string;
  responsavel?: string;
  contacto?: string;
  observacao?: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  nif?: string;
  email?: string;
  phone?: string;
  address?: string;
  localidade?: string;
  codigo_postal?: string;
  provincia?: string;
  municipio?: string;
  pais?: string;
  webpage?: string;
  siglas_banco?: string;
  iban?: string;
  tipo_cliente?: 'nao_grupo' | 'nacionais' | 'estrangeiro' | 'associados' | 'normal';
  created_at: string;
}

export interface SystemUser {
  id: string;
  name: string;
  profession: string;
  date: string;
  permission_area: string;
  contact: string;
  morada: string;
  company_id: string;
  created_at: string;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  document_type?: string;
  purchase_number: string;
  date: string;
  due_date?: string;
  payment_method?: string;
  status: 'pending' | 'completed' | 'cancelled';
  total: number;
  items?: PurchaseItem[];
  document_url?: string;
}

export interface LaborTermination {
  id: number;
  employee_id: number;
  employee_name: string;
  dismissal_date: string;
  ordered_by: string;
  reason: string;
  observations?: string;
  calculations?: any;
  created_at: string;
}

export interface PurchaseItem {
  id: number;
  purchase_id: number;
  product_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}
