import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

/**
 * ==============================
 * REALTIME MANAGER GLOBAL
 * ==============================
 */
const activeChannels = new Map();

/**
 * ==============================
 * 1. HOOK PRINCIPAL REALTIME
 * ==============================
 */
export function useRealtime(table: string, onChange: (payload: any) => void) {
  const onChangeRef = useRef(onChange);

  // Keep callback reference updated without triggering useEffect rebuilds
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    // Evitar duplicação de canais
    if (activeChannels.has(table)) {
      console.log(`Channel já ativo: ${table}`);
      return;
    }

    /**
     * ==============================
     * 2. CRIAÇÃO DO CHANNEL
     * ==============================
     */
    const channel = supabase
      .channel(`${table}-channel`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: table,
        },
        (payload) => {
          try {
            if (onChangeRef.current) {
              // Permitir callbacks assíncronos e capturar erros
              const result: any = onChangeRef.current(payload);
              if (result && typeof result.catch === 'function') {
                result.catch((err: any) => console.error("Erro assíncrono no callback Realtime:", err));
              }
            }
          } catch (err) {
            console.error("Erro no callback Realtime:", err);
          }
        }
      )
      .subscribe((status, err) => {
        const errMsg = err?.message || String(err || '');
        const isTransportError = errMsg.includes('transport failure') || errMsg.includes('WebSocket');

        if (status === 'SUBSCRIBED') {
          console.log(`Realtime [${table}] ativo.`);
        } else if (err && !isTransportError) {
          console.warn(`Aviso no subscribe [${table}]:`, err);
        }

        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !isTransportError) {
          console.warn(`Realtime temporariamente indisponível para tabela: ${table}`);
        }
      });

    /**
     * ==============================
     * 3. GUARDAR CHANNEL ATIVO
     * ==============================
     */
    activeChannels.set(table, channel);

    /**
     * ==============================
     * 4. CLEANUP (IMPORTANTE)
     * ==============================
     */
    return () => {
      supabase.removeChannel(channel);
      activeChannels.delete(table);
      console.log(`Channel removido: ${table}`);
    };
  }, [table]);
}

/**
 * ==============================
 * 5. PROTEÇÃO GLOBAL DE ERROS
 * ==============================
 */
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = event.reason ? String(event.reason?.message || event.reason) : "";
    const lower = reasonStr.toLowerCase();
    if (
      lower.includes("websocket") ||
      lower.includes("hmr") ||
      lower.includes("hot update") ||
      lower.includes("connection") ||
      lower.includes("back-forward cache") ||
      lower.includes("aborterror")
    ) {
      event.preventDefault();
      return;
    }
    console.warn("[Realtime] Unhandled Promise Rejection:", event.reason);
  });
}

/**
 * ==============================
 * 6. FUNÇÃO OPCIONAL DE RESET TOTAL
 * ==============================
 */
export function resetRealtime() {
  activeChannels.forEach((channel, table) => {
    supabase.removeChannel(channel);
    console.log(`Reset channel: ${table}`);
  });

  activeChannels.clear();
}
