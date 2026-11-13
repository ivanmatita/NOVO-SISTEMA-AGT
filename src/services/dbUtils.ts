import { supabase } from '../lib/supabase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get'
}

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string;
  authInfo: any;
}

export const handleSupabaseError = async (error: any, operationType: OperationType, table: string) => {
  const errorMessage = error?.message || String(error);
  
  // Get session info for debugging
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id || 'unauthenticated';
  
  const errInfo: SupabaseErrorInfo = {
    error: errorMessage,
    operationType,
    table,
    authInfo: {
      userId,
      email: session?.user?.email,
      timestamp: new Date().toISOString()
    }
  };
  
  console.error(`[Supabase Critical Error] ${table} during ${operationType}:`, errInfo);
  
  // Custom user-friendly messages for RLS
  if (errorMessage.includes('row-level security policy')) {
    throw new Error(`Permissão Negada: Você não tem permissão para ${operationType} nesta tabela (${table}). Verifique se a sua conta está vinculada a uma empresa ativa.`);
  }
  
  throw new Error(errorMessage);
};
