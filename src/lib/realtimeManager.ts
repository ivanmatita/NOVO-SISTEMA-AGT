import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

type TableName = 
  | 'clientes' 
  | 'locais_trabalho' 
  | 'documentos_emitidos' 
  | 'caixas' 
  | 'caixa_movimentacoes' 
  | 'fornecedores' 
  | 'compras'
  | 'alertas_tarefas'
  | 'perfis'
  | 'professions'
  | 'produtos'
  | 'products'
  | 'impostos_changes'
  | 'hr_contratos'
  | 'armazens'
  | 'movimentacoes_stock'
  | string; // Allow flexible table names

type Callback = (payload: any) => void;

class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<Callback>> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private timeouts: Map<string, any> = new Map();
  private subscribing: Set<string> = new Set();
  private MAX_RETRIES = 3;

  private constructor() {}

  public static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  public async subscribe(
    table: TableName, 
    empresaId: string, 
    onUpdate: Callback
  ): Promise<RealtimeChannel | null> {
    const channelName = `realtime:${table}:${empresaId}`;

    // Add listener to the set
    if (!this.listeners.has(channelName)) {
      this.listeners.set(channelName, new Set());
    }
    this.listeners.get(channelName)!.add(onUpdate);

    // If already subscribed or subscribing, stop here
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!;
    }
    
    if (this.subscribing.has(channelName)) {
      console.log(`[RealtimeManager] Already in process of subscribing to ${channelName}.`);
      return null;
    }

    this.subscribing.add(channelName);
    console.log(`[RealtimeManager] Initiating subscription for ${channelName}`);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table as any,
          filter: `empresa_id=eq.${empresaId}`
        },
        (payload) => {
          console.log(`[RealtimeManager] Broadcast for ${channelName}:`, payload.eventType);
          const callbacks = this.listeners.get(channelName);
          if (callbacks) {
            callbacks.forEach(cb => {
              try {
                const result: any = cb(payload);
                if (result && typeof result.catch === 'function') {
                  result.catch(err => {
                    console.error(`[RealtimeManager] Async Callback error on ${channelName}:`, err);
                  });
                }
              } catch (err) {
                console.error(`[RealtimeManager] Callback error on ${channelName}:`, err);
              }
            });
          }
        }
      );

    return new Promise((resolve) => {
      // Small delay to prevent "WebSocket closed without opened" if called during rapid re-renders
      const subTimeout = setTimeout(() => {
        this.timeouts.delete(channelName);
        channel.subscribe(async (status) => {
          this.subscribing.delete(channelName);
          
          if (status === 'SUBSCRIBED') {
            console.log(`[RealtimeManager] Subscribed successfully to ${channelName}`);
            this.channels.set(channelName, channel);
            this.retryCounts.set(channelName, 0);
            resolve(channel);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn(`[RealtimeManager] Status ${status} para ${channelName}. Certifique-se que a tabela está na publicação 'supabase_realtime'.`);
            
            // Supabase Safe Proxy in src/lib/supabase.ts already handles reconnection logic. 
            // We just resolve(null) to avoid infinite loops and unhandled promise rejections.
            this.channels.delete(channelName);
            this.subscribing.delete(channelName);
            resolve(null);
          }
        });
      }, 200); // Slightly longer delay
      this.timeouts.set(channelName, subTimeout);
    });
  }

  public async unsubscribe(table: TableName, empresaId: string, callbackToRemove?: Callback) {
    const channelName = `realtime:${table}:${empresaId}`;
    
    // Clear pending subscription timeout if unsubscribing early
    const pendingTimeout = this.timeouts.get(channelName);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.timeouts.delete(channelName);
    }

    if (callbackToRemove) {
      const callbacks = this.listeners.get(channelName);
      if (callbacks) {
        callbacks.delete(callbackToRemove);
        // If there are still other listeners, don't remove the channel yet
        if (callbacks.size > 0) return;
      }
    } else {
      // If no callback specified, we clear all listeners for this specific channel name
      this.listeners.delete(channelName);
    }

    this.subscribing.delete(channelName);

    const channel = this.channels.get(channelName);
    if (channel) {
      console.log(`[RealtimeManager] Removing channel ${channelName} as no listeners remain.`);
      try {
        await supabase.removeChannel(channel);
        this.channels.delete(channelName);
        this.listeners.delete(channelName);
        this.retryCounts.delete(channelName);
        this.subscribing.delete(channelName);
      } catch (err) {
        console.error(`[RealtimeManager] Error removing ${channelName}:`, err);
      }
    }
  }

  public async unsubscribeAll() {
    console.log('[RealtimeManager] Unsubscribing from everything');
    for (const [name, timeout] of this.timeouts.entries()) {
      clearTimeout(timeout);
    }
    this.timeouts.clear();

    for (const [name, channel] of this.channels.entries()) {
      try {
        await supabase.removeChannel(channel);
      } catch (err) {}
    }
    this.channels.clear();
    this.listeners.clear();
    this.retryCounts.clear();
    this.subscribing.clear();
  }
}

export const realtimeManager = RealtimeManager.getInstance();
