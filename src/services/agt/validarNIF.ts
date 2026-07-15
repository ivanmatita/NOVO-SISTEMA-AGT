/**
 * AGT NIF Consultation Service
 * Queries the official AGT taxpayer portal in the background and
 * scrapes the taxpayer name and activity state from the HTML response.
 *
 * In development, requests are routed through the Vite dev-proxy (/api-agt-nif)
 * which forwards to https://portaldocontribuinte.minfin.gov.ao.
 * In production, a public CORS-proxy is used as a fallback.
 */

export interface NifConsultaResult {
  /** true if the NIF was found on the AGT database */
  exists: boolean;
  /** Full taxpayer name / company name */
  nome?: string;
  /** Activity status: 'Activo' | 'Suspenso' | 'Inactivo' | etc. */
  estado?: string;
  /** Raw error message, if any */
  error?: string;
}

/**
 * Extract the text of the label element that follows a
 * <label> whose text matches the given header text.
 */
function scrapeField(html: string, headerText: string): string | undefined {
  // Build a regex that finds: <label ...> headerText </label><div ...><label ...>VALUE</label>
  const escapedHeader = headerText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    escapedHeader +
      '[^<]*<\\/label>[^<]*<div[^>]*>[^<]*<label[^>]*>([^<]+)<\\/label>',
    'i'
  );
  const match = html.match(pattern);
  return match ? match[1].trim() : undefined;
}

/**
 * Query the AGT portal for a given NIF.
 * Automatically debounced at the call-site; this function is side-effect free.
 */
export async function validarNIFAGT(nif: string): Promise<NifConsultaResult> {
  if (!nif || nif.trim().length < 6) {
    return { exists: false, error: 'NIF inválido' };
  }

  const path = `/consultar-nif-do-contribuinte?nif=${encodeURIComponent(nif.trim())}`;

  // Strategy 1: Vite proxy (works in dev)
  // Strategy 2: allorigins.win public CORS proxy (fallback for production/deployed)
  const urls = [
    `/api-agt-nif${path}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(
      'https://portaldocontribuinte.minfin.gov.ao' + path
    )}`,
  ];

  let html = '';
  let fetchError = '';

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        html = await res.text();
        if (html.includes('consultar-nif') || html.includes('panelNIF')) {
          break; // Got a valid portal response
        }
      }
    } catch (e: any) {
      fetchError = e?.message || String(e);
    }
  }

  if (!html) {
    return {
      exists: false,
      error: `Não foi possível contactar o portal AGT. ${fetchError}`,
    };
  }

  // Detect "NIF não encontrado" message in the Growl JS payload
  if (html.includes('NIF não encontrado') || html.includes('NIF nao encontrado')) {
    return { exists: false };
  }

  // Detect the result panel — only present when a NIF is found
  if (!html.includes('panelNIF_content') && !html.includes('taxPayerNidId')) {
    return { exists: false };
  }

  // Scrape Nome (Taxpayer Name)
  const nome = scrapeField(html, 'Nome:');

  // Scrape Estado (Activity State)
  const estado = scrapeField(html, 'Estado:');

  if (!nome && !estado) {
    return { exists: false };
  }

  return {
    exists: true,
    nome: nome,
    estado: estado,
  };
}
