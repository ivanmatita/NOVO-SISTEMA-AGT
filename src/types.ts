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
  empresa_id?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  nome?: string;
  name?: string;
  empresa_id: string;
  company_id?: string;
  empresa_nif?: string;
  role: string;
  created_at?: string;
  company?: any;
  permission_areas?: string[];
  nome_empresa?: string;
  empresa_nome?: string;
  is_admin?: boolean;
  level?: number;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  error: string | null;
  refreshUser: () => Promise<void>;
}

export interface Caixa {
  id: string;
  name: string;
  account?: string;
  responsible?: string;
  user?: string;
  users?: number;
  initialBalance: number;
  currentBalance: number;
  obs: string;
  status: 'aberto' | 'fechado';
  empresa_id?: string;
  codigo_caixa?: string;
  moeda?: string;
  activo?: boolean;
  data_abertura?: string;
  data_fechamento?: string;
  updated_at?: string;
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
  empresa_id?: string;
}

export interface Client {
  id: string | number;
  name: string;
  email: string;
  contribuinte: string;
  nif?: string;
  morada: string;
  endereco?: string;
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
  empresa_id: string;
  created_at: string;
}

export interface Product {
  id: number | string;
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
  image_url?: string;
  image_path?: string;
}

export interface InvoiceItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_id?: number | string | null;
  tax_type?: string;
  retencao_fonte?: number;
  tipologia?: string;
  desconto?: number;
  desconto_linha?: number;
  referencia?: string;
  tipo_artigo?: string;
  comprimento?: number;
  largura?: number;
  altura?: number;
  showDimensions?: boolean;
  tax?: string;
  tax_rate?: number;
  warehouse_id?: number;
  warehouse_responsible?: string;
  data_validade?: string;
  unidade_medida?: string;
}

export interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  invoice_number: string;
  numero_documento?: string;
  documento_origem_id?: number | string;
  numero_documento_origem?: string;
  tipo_documento_origem?: string;
  is_draft?: boolean;
  documento_anulado?: boolean;
  motivo_anulacao?: string;
  anulado_at?: string;
  hash_documento?: string;
  hash_fiscal?: string;
  certified_at?: string;
  estado_certificacao?: string;
  rectified_document?: string;
  created_at?: string;
  created_by?: number | string;
  criado_por?: number | string;
  date: string;
  data_emissao?: string;
  due_date: string;
  data_vencimento?: string;
  status: 'ativo' | 'anulado' | 'pending' | 'paid' | 'RASCUNHO';
  estado_documento?: string;
  total: number;
  contravalor?: number;
  items?: InvoiceItem[];
  client_email?: string;
  client_nif?: string;
  client_address?: string;
  document_type?: string;
  tipo_documento?: string;
  country_code?: string;
  service_date?: string;
  service_location?: string;
  series_id?: number;
  serie?: string;
  currency?: string;
  hash?: string;
  signature?: string;
  is_certified?: boolean;
  payment_status?: 'pending' | 'partial' | 'paid';
  is_anulado?: boolean;
  work_site_id?: number;
  work_site_title?: string;
  local_trabalho?: string;
  cash_box?: string;
  payment_method?: string;
  operator_name?: string;
  total_in_words?: string;
  retencao_fonte_total?: number;
  global_discount?: number;
  vat_withholding?: number;
  vat_withholding_amount?: number;
  codigo_validacao?: string;
  imposto?: number;
  detalhes?: string;
  created_by_nome?: string;
  created_by_username?: string;
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
  is_blocked?: boolean;
  hired_at: string;
  dismissed_at?: string;
  readmitted_at?: string;
  dismissal_reason?: string;
  dismissal_ordered_by?: string;
  dismissal_observations?: string;

  // Additional form fields
  casa_no?: string;
  rua?: string;
  zona?: string;
  bairro?: string;
  provincia_morada?: string;
  municipio_morada?: string;
  codigo_postal?: string;
  pais?: string;
  seg_hours?: string;
  ter_hours?: string;
  qua_hours?: string;
  qui_hours?: string;
  sex_hours?: string;
  sab_hours?: string;
  dom_hours?: string;
  complemento_salarial?: number;
  local_trabalho_id?: string | number;
  naturalness?: string;
  nationality?: string;
  subsidy_food?: number;
  subsidy_transport?: number;
  solicitante_admissao?: string;
  motivo_admissao?: string;
  reparticao_fiscal?: string;
  inss_number_antigo?: string;
  provincia_trabalho?: string;
  municipio_trabalho?: string;
  grupo_irt?: string;
  agente_no?: string;
  document_type?: string;
  entidade_emissora?: string;
  data_emissao_doc?: string;
  data_validade_doc?: string;
  naturalidade?: string;
  provincia_nascimento?: string;
  nacionalidade?: string;
  nome_pai?: string;
  nome_mae?: string;
}

export interface Profession {
  id: any;
  name: string;
  nome?: string;
  inss_profession?: string;
  base_salary?: number;
  salario_base?: number;
  acerto_salarial?: number;
  descricao?: string;
  empresa_id?: string;
  created_at?: string;
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
  opened_at?: string;
  opening_date?: string;
  closed_at?: string;
  closing_date?: string;
  initial_balance: number;
  final_balance?: number;
  total_sales?: number;
  total_discounts?: number;
  status: 'open' | 'closed';
  pos_point_id?: number | string;
  pos_point_name?: string;
  empresa_id?: string;
  user_id?: string;
}

export interface FiscalSeries {
  id: string | number;
  name: string;
  tipo?: string;
  description?: string;
  serie?: string;
  user_id?: string | number; // Legacy
  users?: Array<{id: string, name: string}>;
  user_ids?: string[];
  user_name?: string;
  type: 'normal' | 'manual' | 'manual_recovery';
  reference: string; 
  counter: number;
  is_active: boolean;
  year?: number;
  data_inicio?: string;
  destino?: string;
  top_config?: boolean;
  down_config?: boolean;
  watermark_setup?: boolean;
  users_count?: number;
  bancos_count?: string;
  created_at?: string;
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
  empresa_id: string;
  location?: string;
  code?: string;
  created_at: string;
}

export interface WorkSite {
  id: number;
  client_id: number | string;
  empresa_id?: string;
  client_name?: string;
  start_date: string;
  end_date: string;
  title: string;
  name?: string; // Compatibility
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
  empresa_id?: string;
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
  associated_document?: string;
  documento_origem_id?: number | string;
  numero_documento_origem?: string;
  tipo_documento_origem?: string;
  is_draft?: boolean;
  documento_anulado?: boolean;
  estado?: string;
  pdf_gerado?: boolean;
  ultima_exportacao_pdf_em?: string;
  data_emissao: string;
  date?: string;
  data_vencimento: string;
  due_date?: string;
  cliente_id: number;
  client_id?: number | string;
  client_nif?: string | null;
  imposto?: number;
  created_at?: string;
  client_name?: string;
  cliente_nome?: string;
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
  series_id?: number;
  series_reference?: string;
  series_name?: string;
  cash_box?: string;
  payment_method?: string;
  operator_name?: string;
  total_in_words?: string;
  items?: InvoiceItem[];
  is_anulado?: boolean;
  is_certified?: boolean;
  payment_status?: 'pending' | 'partial' | 'paid';
  paid_amount?: number;
  paid_at?: string;
  void_reason?: string;
  void_at?: string;
  vat_withholding?: number;
  service_date?: string;
  service_location?: string;
  retencao_fonte_total?: number;
  hash_documento?: string;
  hash?: string;
  hash_anterior?: string;
  codigo_validacao?: string;
  assinatura_digital?: string;
  numero_sequencial?: number;
  serie?: string;
  ano?: number;
  estado_certificacao?: string;
  created_by?: string;
  created_by_nome?: string;
  created_by_username?: string;
}

export interface StockMovement {
  id: number | string;
  product_id: number | string;
  product_name?: string;
  empresa_id?: string;
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
  id: number | string;
  empresa_id: string;
  name: string;
  nome?: string; // Compatibility
  nif: string;
  email?: string;
  phone?: string;
  telefone?: string; // Compatibility
  address?: string;
  morada?: string; // Compatibility
  localidade?: string;
  codigo_postal?: string;
  provincia?: string;
  municipio?: string;
  pais?: string;
  webpage?: string;
  sigla_banco?: string;
  siglas_banco?: string; // Compatibility
  iban?: string;
  tipo_fornecedor?: string;
  tipo_cliente?: string; // Compatibility
  created_at?: string;
  updated_at?: string;
  activo?: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  profession: string;
  date: string;
  permission_areas: string[];
  contact: string;
  morada: string;
  empresa_id: string;
  created_at: string;
  username?: string;
  level?: number;
  is_admin?: boolean;
  validade?: string;
  is_active?: boolean;
  role?: string;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier_name?: string;
  fornecedor_nome?: string;
  client_name?: string;
  document_type?: string;
  purchase_number: string;
  numero_documento?: string;
  invoice_number?: string;
  numero_fatura?: string;
  date: string;
  data_emissao?: string;
  due_date?: string;
  payment_method?: string;
  status: string;
  estado?: string;
  empresa_id?: string;
  company_id?: string;
  total: number;
  desconto_global?: number | string;
  global_discount?: number | string;
  items?: PurchaseItem[];
  document_url?: string;
  document_path?: string;
  hash?: string;
  codigo?: string;
  work_site?: string;
  work_site_id?: number | string;
  work_site_name?: string;
  caixa?: string;
  cash_box?: string;
  data_valor?: string;
  series_id?: number;
  currency?: string;
  reference_purchase_number?: string;
  reference_document?: string;
  observations?: string;
  created_by?: string;
  created_by_nome?: string;
  created_by_username?: string;
  valor_pago?: number;
  valor_total?: number;
  recibo_emitido?: boolean;
  saldo_pendente?: number;
  tipo_documento?: string;
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

export interface EmployeeDocument {
  id: string | number;
  employee_id: number | string;
  type: string;
  description: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  status: 'active' | 'archived';
  created_at: string;
}

export interface EmployeePenalty {
  id: string | number;
  employee_id: number | string;
  type: 'multa' | 'penalizacao';
  date: string;
  reason: string;
  observation?: string;
  ordered_by: string;
  amount: number;
  month: string; // MM/YYYY
  created_at: string;
}

export interface PurchaseItem {
  id: number | string;
  purchase_id: number;
  product_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  total: number;
  referencia?: string;
  desconto_linha?: number;
}

// ==========================================
// STAND AUTOMÓVEL INTERFACES
// ==========================================

export interface StandVeiculo {
  id: string;
  empresa_id: string;
  marca: string;
  modelo: string;
  versao?: string;
  ano?: number;
  cor?: string;
  tipo_combustivel?: string;
  tipo_viatura?: string;
  numero_chassis?: string;
  numero_motor?: string;
  capacidade_lugares?: number;
  quilometragem: number;
  estado_stand: string; // 'Em importação' | 'Na alfândega' | 'Em trânsito' | 'No stand' | 'Disponível' | 'Vendido' | 'Alugado' | 'Em manutenção' | 'Reservado' | 'Sucata'
  tipo_uso: string; // 'Venda' | 'Renda' | 'Empresa' | 'Misto'
  pais_origem?: string;
  fornecedor_id?: string;
  data_compra?: string;
  processo_importacao_id?: string;
  custo_compra: number;
  custo_total_importacao: number;
  preco_venda: number;
  preco_renda_diaria: number;
  preco_renda_semanal: number;
  preco_renda_mensal: number;
  margem_lucro?: number;
  data_matricula?: string;
  matricula?: string;
  data_inspecao?: string;
  data_seguro_validade?: string;
  numero_apolice?: string;
  seguradora?: string;
  valor_seguro_anual?: number;
  documento_venda_id?: string;
  cliente_comprador_id?: string;
  data_venda?: string;
  localizacao?: string;
  observacoes?: string;
  imagens: string[];
  documentos: Array<{ nome: string; url: string; tipo?: string }>;
  frota_veiculo_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StandProcessoImportacao {
  id: string;
  empresa_id: string;
  referencia?: string;
  fornecedor_id?: string;
  pais_origem?: string;
  status: string; // 'Em negociação' | 'Encomendado' | 'Pago ao fornecedor' | 'Em transporte' | 'Na alfândega' | 'Desalfandegado' | 'Entregue no stand' | 'Concluído'
  data_encomenda?: string;
  data_pagamento_fornecedor?: string;
  data_embarque?: string;
  data_chegada_porto?: string;
  data_entrada_alfandega?: string;
  data_saida_alfandega?: string;
  data_chegada_stand?: string;
  custo_compra: number;
  custo_frete: number;
  custo_seguro_transporte: number;
  custo_alfandega: number;
  custo_ivm: number;
  custo_inspecao: number;
  custo_matricula: number;
  outros_custos: number;
  custo_total: number;
  numero_bill_lading?: string;
  numero_declaracao_importacao?: string;
  numero_dua?: string;
  porto_entrada?: string;
  agente_aduaneiro?: string;
  observacoes?: string;
  documentos: Array<{ nome: string; url: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface StandCustoVeiculo {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  processo_id?: string;
  tipo_custo: string;
  descricao?: string;
  valor: number;
  data_custo: string;
  fornecedor_id?: string;
  caixa_id?: string;
  documento_ref?: string;
  observacoes?: string;
  created_at?: string;
}

export interface StandOficinaOrdem {
  id: string;
  empresa_id: string;
  numero_ordem?: string;
  veiculo_stand_id?: string;
  veiculo_cliente_marca?: string;
  veiculo_cliente_modelo?: string;
  veiculo_cliente_matricula?: string;
  veiculo_cliente_chassis?: string;
  veiculo_cliente_ano?: number;
  cliente_id?: string;
  solicitante?: string;
  contacto_solicitante?: string;
  tipo_servico?: string;
  descricao_trabalho?: string;
  diagnostico?: string;
  tecnico_responsavel?: string;
  data_entrada: string;
  data_prevista_conclusao?: string;
  data_conclusao?: string;
  custo_pecas: number;
  custo_mao_obra: number;
  custo_total: number;
  status: string; // 'Aberta' | 'Em diagnóstico' | 'Em execução' | 'Aguarda peças' | 'Concluída' | 'Entregue' | 'Cancelada'
  faturado: boolean;
  documento_fatura_id?: string;
  observacoes?: string;
  fotos: string[];
  created_at?: string;
  updated_at?: string;
}

export interface StandOficinaItem {
  id: string;
  empresa_id: string;
  ordem_id: string;
  tipo: 'Peça' | 'Serviço' | 'Mão de obra';
  produto_id?: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  desconto: number;
  subtotal: number;
  created_at?: string;
}

export interface StandRentACarReserva {
  id: string;
  empresa_id: string;
  numero_reserva?: string;
  veiculo_id: string;
  cliente_id?: string;
  nome_condutor?: string;
  nif_condutor?: string;
  contacto_condutor?: string;
  numero_carta_conducao?: string;
  validade_carta_conducao?: string;
  data_inicio: string;
  hora_inicio?: string;
  data_fim: string;
  hora_fim?: string;
  total_dias: number;
  preco_diario: number;
  desconto: number;
  valor_caucao: number;
  valor_total: number;
  status: string; // 'Reservado' | 'Confirmado' | 'Em curso' | 'Concluído' | 'Cancelado'
  km_entrega?: number;
  km_devolucao?: number;
  combustivel_entrega?: string;
  combustivel_devolucao?: string;
  observacoes_entrega?: string;
  observacoes_devolucao?: string;
  extras: any[];
  danos_entrega: any[];
  danos_devolucao: any[];
  faturado: boolean;
  documento_fatura_id?: string;
  data_confirmacao?: string;
  data_entrega_real?: string;
  data_devolucao_real?: string;
  observacoes?: string;
  fotos_entrega: string[];
  fotos_devolucao: string[];
  created_at?: string;
}

export interface StandSeguro {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  seguradora?: string;
  numero_apolice?: string;
  tipo_cobertura?: string;
  data_inicio?: string;
  data_fim?: string;
  valor_premio?: number;
  valor_franquia?: number;
  status: string; // 'Ativo' | 'Expirado' | 'Cancelado' | 'Renovando'
  renovacao_automatica: boolean;
  documentos: Array<{ nome: string; url: string }>;
  observacoes?: string;
  created_at?: string;
}

export interface StandOcorrencia {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  tipo: string; // 'Acidente' | 'Sinistro' | 'Infração' | 'Avaria' | 'Roubo' | 'Outro'
  descricao?: string;
  data_ocorrencia: string;
  local_ocorrencia?: string;
  valor_dano: number;
  valor_reparacao: number;
  valor_seguro_coberto: number;
  culpa?: string;
  nome_terceiro?: string;
  contacto_terceiro?: string;
  numero_participacao?: string;
  entidade_participacao?: string;
  status: string; // 'Registada' | 'Em análise' | 'Em resolução' | 'Resolvida' | 'Fechada'
  observacoes?: string;
  fotos: string[];
  documentos: Array<{ nome: string; url: string }>;
  created_at?: string;
}

export interface StandManutencao {
  id: string;
  empresa_id: string;
  veiculo_id: string;
  tipo?: string;
  descricao?: string;
  data_manutencao: string;
  quilometragem_entrada?: number;
  quilometragem_saida?: number;
  proxima_manutencao_km?: number;
  proxima_manutencao_data?: string;
  custo_total: number;
  custo_pecas: number;
  custo_mao_obra: number;
  ordem_id?: string;
  status: string;
  observacoes?: string;
  created_at?: string;
}

// ==========================================
// GESTÃO DE FARMÁCIA INTERFACES
// ==========================================

export interface FarmaciaMedicamento {
  id: string;
  empresa_id: string;
  produto_id: string;
  principio_ativo?: string;
  nome_generico?: string;
  dosagem?: string;
  forma_farmaceutica?: string;
  via_administracao?: string;
  apresentacao?: string;
  embalagem?: string;
  laboratorio_fabricante?: string;
  pais_origem?: string;
  requer_receita: boolean;
  medicamento_controlado: boolean;
  tipo_receita?: string;
  temperatura_conservacao?: string;
  descricao_terapeutica?: string;
  contraindicacoes?: string;
  posologia_geral?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmaciaLote {
  id: string;
  empresa_id: string;
  produto_id: string;
  numero_lote: string;
  fabricante?: string;
  fornecedor_id?: string;
  data_fabricacao?: string;
  data_validade: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  custo_unitario: number;
  preco_venda: number;
  localizacao_prateleira?: string;
  estado: string; // 'Disponível' | 'Próximo da validade' | 'Expirado' | 'Bloqueado' | 'Devolvido' | 'Esgotado'
  motivo_bloqueio?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmaciaReceita {
  id: string;
  empresa_id: string;
  numero_receita: string;
  data_emissao: string;
  data_validade?: string;
  cliente_id?: string;
  paciente_nome: string;
  paciente_identificacao?: string;
  paciente_contacto?: string;
  prescritor_nome?: string;
  prescritor_ordem_medicos?: string;
  prescritor_especialidade?: string;
  instituicao_saude?: string;
  estado: string; // 'Recebida' | 'Em análise' | 'Dispensada' | 'Parcialmente dispensada' | 'Cancelada' | 'Pendente'
  documento_url?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmaciaDispensacao {
  id: string;
  empresa_id: string;
  receita_id?: string;
  cliente_id?: string;
  produto_id: string;
  lote_id?: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  documento_venda_id?: string;
  data_dispensa?: string;
  dispensado_por?: string;
  posologia_instrucoes?: string;
  observacoes?: string;
  created_at?: string;
}

export interface FarmaciaDevolucao {
  id: string;
  empresa_id: string;
  tipo: string; // 'cliente' | 'fornecedor' | 'danificado' | 'expirado' | 'erro_dispensacao'
  produto_id: string;
  lote_id?: string;
  quantidade: number;
  motivo: string;
  cliente_id?: string;
  fornecedor_id?: string;
  documento_ref?: string;
  recolocar_stock: boolean;
  estado: string;
  data_devolucao: string;
  responsavel?: string;
  observacoes?: string;
  created_at?: string;
}

export interface FarmaciaTransferencia {
  id: string;
  empresa_id: string;
  produto_id: string;
  lote_id?: string;
  quantidade: number;
  armazem_origem_id?: string;
  armazem_destino_id?: string;
  estado: string; // 'Solicitada' | 'Aprovada' | 'Enviada' | 'Recebida' | 'Cancelada'
  motivo?: string;
  solicitante?: string;
  aprovador?: string;
  data_solicitacao?: string;
  data_conclusao?: string;
  created_at?: string;
}

export interface FarmaciaInventario {
  id: string;
  empresa_id: string;
  numero_inventario: string;
  tipo: string; // 'Geral' | 'Armazém' | 'Categoria' | 'Lote'
  armazem_id?: string;
  data_inventario: string;
  estado: string; // 'Em Aberto' | 'Concluído' | 'Cancelado'
  responsavel?: string;
  observacoes?: string;
  created_at?: string;
}

export interface FarmaciaInventarioItem {
  id: string;
  empresa_id: string;
  inventario_id: string;
  produto_id: string;
  lote_id?: string;
  stock_sistema: number;
  stock_contado: number;
  diferenca: number;
  motivo_diferenca?: string;
  custo_unitario: number;
  ajustado: boolean;
  created_at?: string;
}

export interface FarmaciaConfiguracao {
  id?: string;
  empresa_id: string;
  fefo_ativo: boolean;
  bloquear_expirados: boolean;
  dias_alerta_validade: number;
  stock_minimo_padrao: number;
  exigir_receita_controlados: boolean;
  permitir_dispensa_parcial: boolean;
  responsavel_tecnico?: string;
  numero_carteira_farmaceutico?: string;
  updated_at?: string;
}

export interface StandPeca {
  id: string;
  empresa_id: string;
  codigo_oem?: string;
  nome: string;
  categoria?: string;
  marca_compativel?: string;
  modelo_compativel?: string;
  ano_compativel?: string;
  stock_atual: number;
  stock_minimo: number;
  preco_custo: number;
  preco_venda: number;
  localizacao?: string;
  fornecedor_id?: string;
  fornecedor_nome?: string;
  imagem_url?: string;
  documento_url?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}


