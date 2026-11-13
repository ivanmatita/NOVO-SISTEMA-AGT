import { useState, useEffect, useCallback } from 'react';
import { Cliente, clienteService } from '../services/clienteService';
import { LocalTrabalho, localTrabalhoService } from '../services/localTrabalhoService';
import { realtimeManager } from '../lib/realtimeManager';

export function useClientes(empresa_id?: string) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!empresa_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await clienteService.getClientes(empresa_id);
      setClientes(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [empresa_id]);

  useEffect(() => {
    if (!empresa_id) return;
    load();

    const onUpdate = () => load();
    realtimeManager.subscribe('clientes', empresa_id, onUpdate);

    return () => {
      realtimeManager.unsubscribe('clientes', empresa_id, onUpdate);
    };
  }, [empresa_id, load]);

  return { clientes, loading, error, refresh: load };
}

export function useLocaisTrabalho(empresa_id?: string) {
  const [locais, setLocais] = useState<LocalTrabalho[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!empresa_id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await localTrabalhoService.getLocaisTrabalho(empresa_id);
      setLocais(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar locais');
    } finally {
      setLoading(false);
    }
  }, [empresa_id]);

  useEffect(() => {
    if (!empresa_id) return;
    load();

    const onUpdate = () => load();
    realtimeManager.subscribe('locais_trabalho', empresa_id, onUpdate);

    return () => {
      realtimeManager.unsubscribe('locais_trabalho', empresa_id, onUpdate);
    };
  }, [empresa_id, load]);

  return { locais, loading, error, refresh: load };
}
