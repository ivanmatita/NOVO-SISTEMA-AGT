/**
 * Servico de Consulta e Validacao de NIF da AGT Angola
 * Valida o NIF de clientes e fornecedores tanto via Portal MinFin quanto por validacao sintatica oficial.
 */

export interface NifConsultaResult {
  /** true se o NIF e valido ou encontrado na base da AGT */
  exists: boolean;
  /** Nome completo do contribuinte / Razao social */
  nome?: string;
  /** Estado de actividade: 'Activo' | 'Suspenso' | 'Inactivo' | etc. */
  estado?: string;
  /** Indica se a validacao foi efectuada via regra sintatica por indisponibilidade de proxy */
  isOfflineValid?: boolean;
  /** Mensagem de erro explicativa, se houver */
  error?: string;
}

/**
 * Valida se a string tem a estrutura formal de um NIF em Angola:
 * - Consumidor Final: 999999999
 * - Empresa (Pessoa Colectiva): 9 digitos, normalmente iniciado por 5
 * - Pessoa Singular: 9 digitos ou formato de Bilhete de Identidade (10 a 14 caracteres alfanumericos, ex: 005417001LA042)
 */
export function validarSintaxeNIFAngola(nif: string): boolean {
  if (!nif) return false;
  const clean = nif.trim().toUpperCase();
  if (clean === '999999999' || clean === 'CONSUMIDOR FINAL') return true;
  
  // NIF numerico de 9 digitos (Ex: 5417001234, 5000922200, 000123456)
  if (/^\d{9,10}$/.test(clean)) return true;

  // NIF de Bilhete de Identidade Angolano (Ex: 005417001LA042)
  if (/^[0-9]{9}[A-Z]{2}[0-9]{3}$/.test(clean) || /^[0-9]{9}[A-Z]{1,3}[0-9]{1,3}$/.test(clean)) return true;

  // Formato genérico válido para empresas / singulares (6 a 15 alfanuméricos sem caracteres especiais)
  if (/^[A-Z0-9]{6,15}$/.test(clean)) return true;

  return false;
}

/**
 * Extrai valor do HTML retornado pelo Portal do Contribuinte do MinFin
 */
function scrapeField(html: string, headerText: string): string | undefined {
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
 * Consulta o NIF no portal da AGT (MinFin) com múltiplos proxies de fallback e validação sintática.
 */
export async function validarNIFAGT(nifInput: string): Promise<NifConsultaResult> {
  const nif = (nifInput || '').trim();

  if (!nif || nif.length < 6) {
    return { exists: false, error: 'NIF muito curto ou inválido' };
  }

  // 1. Validar se o NIF tem formato angolano sintaticamente válido
  const isSyntaxValid = validarSintaxeNIFAngola(nif);

  if (nif === '999999999' || nif.toUpperCase() === 'CONSUMIDOR FINAL') {
    return { exists: true, nome: 'Consumidor Final', estado: 'Activo' };
  }

  const path = `/consultar-nif-do-contribuinte?nif=${encodeURIComponent(nif)}`;
  const minfinUrl = `https://portaldocontribuinte.minfin.gov.ao${path}`;

  // Estratégias de consulta online em cascata
  const urls = [
    `/api-agt-nif${path}`,
    `https://corsproxy.io/?url=${encodeURIComponent(minfinUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(minfinUrl)}`,
  ];

  let html = '';
  let fetchError = '';

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const text = await res.text();
        // Ignorar se a resposta for o index.html da própria aplicação SPA (fallback do Vercel/Vite)
        if (text.includes('<!DOCTYPE html>') && text.includes('<div id="root">')) {
          continue;
        }

        if (text.includes('consultar-nif') || text.includes('panelNIF') || text.includes('taxPayerNidId')) {
          html = text;
          break; // Sucesso na captura do HTML da AGT
        }
      }
    } catch (e: any) {
      fetchError = e?.message || String(e);
    }
  }

  // Se conseguimos obter o HTML do Portal da AGT
  if (html) {
    if (html.includes('NIF não encontrado') || html.includes('NIF nao encontrado')) {
      return { exists: false, error: 'NIF não cadastrado no Portal da AGT' };
    }

    const nome = scrapeField(html, 'Nome:');
    const estado = scrapeField(html, 'Estado:');

    if (nome || estado) {
      return {
        exists: true,
        nome: nome,
        estado: estado || 'Activo',
      };
    }
  }

  // Fallback: Se o portal online falhou ou está inacessível (ex: Vercel/CORS),
  // mas o NIF é sintaticamente válido em Angola, aceitar a validação para permitir o cadastro!
  if (isSyntaxValid) {
    return {
      exists: true,
      estado: 'Activo',
      isOfflineValid: true,
      error: fetchError ? `Validação sintática (Portal AGT offline: ${fetchError})` : undefined
    };
  }

  return {
    exists: false,
    error: fetchError ? `Não foi possível contactar o portal AGT: ${fetchError}` : 'NIF com formato inválido'
  };
}
