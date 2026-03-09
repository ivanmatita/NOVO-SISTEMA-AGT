export interface Client {
  id: number;
  name: string;
  email: string;
  nif: string;
  address: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  unit: string;
}

export interface InvoiceItem {
  id?: number;
  product_id?: number | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: number;
  client_id: number;
  client_name: string;
  invoice_number: string;
  date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'cancelled';
  total: number;
  items?: InvoiceItem[];
  client_email?: string;
  client_nif?: string;
  client_address?: string;
  document_type?: string;
  country_code?: string;
  service_date?: string;
  service_location?: string;
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
  role: string;
  profession_id?: number;
  profession_name?: string;
  salary: number;
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  hired_at: string;
  dismissed_at?: string;
}

export interface Profession {
  id: number;
  name: string;
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
  status: 'open' | 'closed';
}

export interface WorkSite {
  id: number;
  client_id: number;
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
  date: string;
  doc_no: string;
  company: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
}
