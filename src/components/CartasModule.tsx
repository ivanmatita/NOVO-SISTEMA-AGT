import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  FileText,
  Download,
  Trash2,
  Edit,
  Eye,
  Filter,
  Loader2,
  ArrowLeft,
  Paperclip,
  Mail,
  Calendar,
  MapPin,
  User,
  Tag,
  Shield,
  Printer,
  Check,
  Info,
  FileCode,
  Copy,
  PenTool,
  Award,
  Users,
  ShieldCheck,
  X,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CartaForm } from './CartaForm';
import { exportToPDF } from '../lib/exportUtils';

export const CartasModule = () => {
  const { user } = useAuth();
  const empresaId =
    user?.empresa_id ||
    (user as any)?.user_metadata?.empresa_id ||
    (user as any)?.user_metadata?.company_id ||
    (user as any)?.company_id ||
    (user as any)?.id;

  // States
  const [cartas, setCartas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Todos');
  const [selectedCarta, setSelectedCarta] = useState<any | null>(null);

  // Navigation states
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingCarta, setEditingCarta] = useState<any | null>(null);

  // Media states
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal Assinatura Digital do Documento
  const [signingCarta, setSigningCarta] = useState<any | null>(null);
  const [availableSignatures, setAvailableSignatures] = useState<any[]>([]);
  const [selectedSigId, setSelectedSigId] = useState<string>('');
  const [signName, setSignName] = useState('');
  const [signRole, setSignRole] = useState('');
  const [savingSign, setSavingSign] = useState(false);

  // Modal Gestão de Assinaturas Digitais (Geral)
  const [showManageSignaturesModal, setShowManageSignaturesModal] = useState(false);
  const [newSigName, setNewSigName] = useState('');
  const [newSigRole, setNewSigRole] = useState('');
  const [newSigBase64, setNewSigBase64] = useState('');

  // Modal Utilizadores Autorizados
  const [authUsersCarta, setAuthUsersCarta] = useState<any | null>(null);
  const [systemProfiles, setSystemProfiles] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [savingAuthUsers, setSavingAuthUsers] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Carregar Cartas
  const fetchCartas = async () => {
    if (!empresaId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('cartas')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setCartas(data || []);
    } catch (err: any) {
      console.error('[CartasModule] Error loading letters:', err);
      setError(err?.message || 'Erro ao carregar as cartas da base de dados.');
    } finally {
      setLoading(false);
    }
  };

  // Carregar Assinaturas Digitais
  const fetchSignatures = async () => {
    if (!empresaId) return;
    try {
      const { data } = await supabase
        .from('assinaturas_digitais')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('ativo', true)
        .order('created_at', { ascending: false });
      setAvailableSignatures(data || []);
    } catch (err) {
      console.error('Erro ao carregar assinaturas:', err);
    }
  };

  // Carregar Perfis para Utilizadores Autorizados
  const fetchProfiles = async () => {
    if (!empresaId) return;
    try {
      const { data } = await supabase
        .from('perfis')
        .select('id, nome, email, role')
        .eq('empresa_id', empresaId);
      setSystemProfiles(data || []);
    } catch (err) {
      console.error('Erro ao carregar perfis:', err);
    }
  };

  useEffect(() => {
    if (!empresaId) return;
    fetchCartas();
    fetchSignatures();
    fetchProfiles();
  }, [empresaId]);

  // Soft delete a Carta
  const handleSoftDelete = async (id: string, refText: string) => {
    if (
      !window.confirm(
        `Tem a certeza que deseja eliminar o registo da carta ${refText}? \nEsta ação não remove dados físicos no servidor (Regra de Auditoria AGT).`
      )
    ) {
      return;
    }

    try {
      const { error: delErr } = await supabase
        .from('cartas')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (delErr) throw delErr;
      showToast('Carta marcada como removida com sucesso!');
      fetchCartas();
      if (selectedCarta?.id === id) {
        setSelectedCarta(null);
      }
    } catch (err: any) {
      console.error('[CartasModule] Soft delete failed:', err);
      showToast(err?.message || 'Erro ao eliminar carta.', 'error');
    }
  };

  // CLONAR DOCUMENTO
  const handleCloneDocumento = async (carta: any) => {
    try {
      const copySuffix = `CP-${String(Math.floor(100 + Math.random() * 900))}`;
      const newRef = `${carta.referencia || 'DOC'}-${copySuffix}`;

      const { id, created_at, updated_at, ...cleanCarta } = carta;
      const clonePayload = {
        ...cleanCarta,
        referencia: newRef,
        assunto: `${carta.assunto} (Cópia)`,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assinatura_url: null,
        assinado_por: null,
        assinado_em: null,
      };

      const { data, error: insErr } = await supabase
        .from('cartas')
        .insert([clonePayload])
        .select('*')
        .single();

      if (insErr) throw insErr;

      showToast(`Documento clonado com sucesso! Referência: ${newRef}`);
      await fetchCartas();

      // Abrir imediatamente para edição
      setEditingCarta(data);
      setCurrentView('edit');
    } catch (err: any) {
      showToast(err?.message || 'Erro ao clonar documento.', 'error');
    }
  };

  // IMPRIMIR / VISUALIZAR EM FORMA DE CARTA A4 (EM OUTRA PÁGINA)
  const handlePrintCartaA4 = (carta: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('O navegador bloqueou a abertura. Por favor permita pop-ups.', 'error');
      return;
    }

    const docDate = carta.data_documento
      ? new Date(carta.data_documento).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date(carta.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' });

    const docHtml = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>Carta Oficial A4 — ${carta.referencia}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          * { box-sizing: border-box; }
          body { font-family: "Times New Roman", Times, Georgia, serif; color: #111827; background: #f8fafc; margin: 0; padding: 25px; line-height: 1.6; }
          .sheet { max-width: 800px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; box-shadow: 0 4px 14px rgba(0,0,0,0.06); padding: 50px; min-height: 1050px; display: flex; flex-col; justify-content: space-between; }
          .no-print { display: flex; justify-content: flex-end; gap: 10px; max-width: 800px; margin: 0 auto 16px auto; }
          .btn { padding: 9px 18px; border: none; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 4px; font-family: sans-serif; }
          .btn-print { background: #003366; color: #ffffff; }
          .btn-close { background: #e2e8f0; color: #334155; }
          .header-box { border-bottom: 2px solid #003366; padding-bottom: 16px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
          .dest-box { margin: 30px 0 40px auto; max-width: 380px; text-align: left; background: #fdfdfd; border-left: 3px solid #003366; padding: 12px 18px; }
          .subject-box { margin: 24px 0; font-weight: bold; text-transform: uppercase; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #003366; }
          .body-content { font-size: 14px; text-align: justify; margin: 30px 0; min-height: 350px; }
          .sig-box { margin-top: 50px; text-align: center; width: 300px; margin-left: auto; margin-right: auto; }
          @media print {
            body { background: #ffffff; padding: 0; }
            .sheet { border: none; box-shadow: none; padding: 0; max-width: 100%; min-height: auto; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir Carta A4</button>
          <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
        </div>

        <div class="sheet">
          <div>
            <div class="header-box">
              <div>
                <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #003366; text-transform: uppercase;">IMATEC — SERVIÇOS & TECNOLOGIA</h2>
                <p style="margin: 4px 0 0; font-size: 11px; color: #64748b; font-family: sans-serif;">Gestão Oficial de Correspondência & Comunicações Corporativas</p>
              </div>
              <div style="text-align: right; font-family: monospace; font-size: 12px; color: #334155;">
                <p style="margin: 0; font-weight: bold; color: #003366;">REF: ${carta.referencia}</p>
                <p style="margin: 3px 0 0; font-size: 11px;">Luanda, ${docDate}</p>
              </div>
            </div>

            <div class="dest-box">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #64748b; font-family: sans-serif; display: block; margin-bottom: 4px;">Ao Cuidado de:</span>
              <strong style="font-size: 14px; display: block; color: #111827;">${carta.destinatario || ''} ${carta.nome_destinatario || ''}</strong>
              ${carta.morada ? `<div style="font-size: 12px; color: #374151;">${carta.morada}</div>` : ''}
              ${carta.localidade || carta.provincia ? `<div style="font-size: 12px; color: #374151;">${carta.localidade || ''}, ${carta.provincia || ''}</div>` : ''}
              ${carta.pais ? `<div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-top: 2px;">${carta.pais}</div>` : ''}
            </div>

            <div class="subject-box">
              ASSUNTO: ${carta.assunto || 'Sem assunto especificado'}
            </div>

            <div class="body-content">
              ${carta.conteudo || '<i>Sem conteúdo registado neste documento.</i>'}
            </div>
          </div>

          <div class="sig-box">
            ${
              carta.assinatura_url
                ? `<img src="${carta.assinatura_url}" alt="Assinatura Digital" style="max-height: 70px; margin-bottom: 6px;" />`
                : `<div style="border-bottom: 1px solid #111827; height: 50px; margin-bottom: 8px;"></div>`
            }
            <strong style="display: block; font-size: 13px; font-family: sans-serif; color: #111827;">
              ${carta.assinado_por || carta.area_sector || 'Direção Geral / Administração'}
            </strong>
            <span style="font-size: 11px; color: #64748b; font-family: sans-serif;">
              ${carta.assinado_em ? `Assinado digitalmente em ${new Date(carta.assinado_em).toLocaleString('pt-AO')}` : 'Assinatura Autorizada'}
            </span>
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(docHtml);
    printWin.document.close();
  };

  // IMPRIMIR / VISUALIZAR EM FORMA DE DECLARAÇÃO A4 (EM OUTRA PÁGINA)
  const handlePrintDeclaracaoA4 = (carta: any) => {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('O navegador bloqueou a abertura. Por favor permita pop-ups.', 'error');
      return;
    }

    const docDate = carta.data_documento
      ? new Date(carta.data_documento).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })
      : new Date(carta.created_at).toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' });

    const docHtml = `
      <!DOCTYPE html>
      <html lang="pt">
      <head>
        <meta charset="UTF-8">
        <title>Declaração Oficial A4 — ${carta.referencia}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif; color: #111827; background: #f8fafc; margin: 0; padding: 25px; line-height: 1.7; }
          .sheet { max-width: 820px; margin: 0 auto; background: #ffffff; border: 2px solid #003366; box-shadow: 0 4px 14px rgba(0,0,0,0.06); padding: 50px; min-height: 1050px; position: relative; }
          .no-print { display: flex; justify-content: flex-end; gap: 10px; max-width: 820px; margin: 0 auto 16px auto; }
          .btn { padding: 9px 18px; border: none; font-size: 12px; font-weight: bold; cursor: pointer; border-radius: 4px; font-family: sans-serif; }
          .btn-print { background: #003366; color: #ffffff; }
          .btn-close { background: #e2e8f0; color: #334155; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 80px; font-weight: 900; color: rgba(0, 51, 102, 0.04); text-transform: uppercase; pointer-events: none; }
          .decl-title { text-align: center; margin: 40px 0 30px; font-size: 26px; font-weight: 900; color: #003366; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #003366; display: inline-block; padding-bottom: 6px; }
          .body-content { font-size: 15px; text-align: justify; margin: 30px 0; text-indent: 40px; }
          @media print {
            body { background: #ffffff; padding: 0; }
            .sheet { border: 2px solid #003366; box-shadow: none; padding: 30px; max-width: 100%; min-height: auto; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn btn-print" onclick="window.print()">🖨️ Imprimir Declaração A4</button>
          <button class="btn btn-close" onclick="window.close()">✕ Fechar</button>
        </div>

        <div class="sheet">
          <div class="watermark">DECLARAÇÃO OFICIAL</div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 15px;">
            <div>
              <h3 style="margin: 0; font-size: 18px; font-weight: 900; color: #003366; text-transform: uppercase;">IMATEC SOFTWARE</h3>
              <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">República de Angola · Registo Geral de Declarações</p>
            </div>
            <div style="text-align: right; font-family: monospace; font-size: 11px; color: #475569;">
              <strong>DOC: ${carta.referencia}</strong><br/>
              Data: ${docDate}
            </div>
          </div>

          <div style="text-align: center;">
            <div class="decl-title">DECLARAÇÃO</div>
          </div>

          <div class="body-content">
            <p>
              Para os devidos efeitos legais e a pedido do interessado, declara-se por meio deste documento oficial que <strong>${carta.nome_destinatario || carta.destinatario || 'o requisitante'}</strong>, relativamente ao assunto <em>"${carta.assunto}"</em>:
            </p>
            <div style="text-indent: 0; margin-top: 20px;">
              ${carta.conteudo || '<p>Consta registado e conforme perante as normas institucionais vigentes.</p>'}
            </div>
            <p style="margin-top: 30px;">
              Por ser verdade e para que produza os seus efeitos legais onde for conveniente, passa-se a presente declaração que vai devidamente assinada e autenticada.
            </p>
          </div>

          <div style="margin-top: 60px; text-align: center;">
            <p style="font-size: 13px; color: #475569; margin-bottom: 30px;">Luanda, aos ${docDate}.</p>
            <div style="width: 280px; margin: 0 auto; text-align: center;">
              ${
                carta.assinatura_url
                  ? `<img src="${carta.assinatura_url}" alt="Assinatura" style="max-height: 70px; margin-bottom: 6px;" />`
                  : `<div style="border-bottom: 1px solid #111827; height: 50px; margin-bottom: 8px;"></div>`
              }
              <strong style="display: block; font-size: 13px; color: #003366;">
                ${carta.assinado_por || 'A Direção Autorizada'}
              </strong>
              <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">
                ${carta.assinado_em ? `Validado digitalmente em ${new Date(carta.assinado_em).toLocaleString('pt-AO')}` : 'Carimbo & Assinatura Oficial'}
              </span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(docHtml);
    printWin.document.close();
  };

  // ASSINAR DOCUMENTO (MODAL)
  const handleOpenSignModal = (carta: any) => {
    setSigningCarta(carta);
    setSignName(carta.assinado_por || user?.nome || '');
    setSignRole(user?.role || 'Diretor / Gestor');
    setSelectedSigId(availableSignatures[0]?.id || '');
  };

  const handleSaveSignatureOnCarta = async () => {
    if (!signingCarta) return;
    setSavingSign(true);
    try {
      const chosenSig = availableSignatures.find((s) => s.id === selectedSigId);
      const sigUrl = chosenSig?.assinatura_url || chosenSig?.assinatura_base64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="40" font-family="cursive" font-size="24" fill="%23003366">Assinado Digitalmente</text></svg>';

      const { error: updErr } = await supabase
        .from('cartas')
        .update({
          assinatura_url: sigUrl,
          assinatura_nome: chosenSig?.nome_signatario || signName,
          assinado_por: signName,
          assinado_em: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', signingCarta.id);

      if (updErr) throw updErr;

      showToast(`Documento ${signingCarta.referencia} assinado digitalmente!`);
      setSigningCarta(null);
      await fetchCartas();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao assinar documento.', 'error');
    } finally {
      setSavingSign(false);
    }
  };

  // CRIAR NOVA ASSINATURA DIGITAL
  const handleCreateNewSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSigName.trim()) {
      showToast('Nome do signatário é obrigatório.', 'error');
      return;
    }

    try {
      const base64Sig =
        newSigBase64 ||
        `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="250" height="70"><path d="M 20 50 Q 80 10, 140 40 T 230 30" fill="none" stroke="%23003366" stroke-width="3"/><text x="25" y="62" font-family="sans-serif" font-size="11" fill="%23003366">${newSigName}</text></svg>`;

      const { error: insErr } = await supabase.from('assinaturas_digitais').insert([
        {
          empresa_id: empresaId,
          nome_signatario: newSigName.trim(),
          cargo: newSigRole.trim() || 'Gestor Autorizado',
          assinatura_base64: base64Sig,
          assinatura_url: base64Sig,
          ativo: true,
        },
      ]);

      if (insErr) throw insErr;

      showToast('Assinatura digital registada com sucesso!');
      setNewSigName('');
      setNewSigRole('');
      setNewSigBase64('');
      await fetchSignatures();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao registar assinatura.', 'error');
    }
  };

  // UTILIZADORES AUTORIZADOS
  const handleOpenAuthUsersModal = (carta: any) => {
    setAuthUsersCarta(carta);
    const existing = Array.isArray(carta.utilizadores_autorizados)
      ? carta.utilizadores_autorizados
      : [];
    setSelectedUserIds(existing);
  };

  const handleSaveAuthUsers = async () => {
    if (!authUsersCarta) return;
    setSavingAuthUsers(true);
    try {
      const { error: updErr } = await supabase
        .from('cartas')
        .update({
          utilizadores_autorizados: selectedUserIds,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUsersCarta.id);

      if (updErr) throw updErr;

      showToast(`Permissões atualizadas para ${authUsersCarta.referencia}!`);
      setAuthUsersCarta(null);
      await fetchCartas();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao guardar utilizadores autorizados.', 'error');
    } finally {
      setSavingAuthUsers(false);
    }
  };

  // Filtro
  const filteredCartas = cartas.filter((carta) => {
    const matchesSearch =
      (carta.nome_destinatario || '').toLowerCase().includes(search.toLowerCase()) ||
      (carta.destinatario || '').toLowerCase().includes(search.toLowerCase()) ||
      (carta.assunto || '').toLowerCase().includes(search.toLowerCase()) ||
      (carta.referencia || '').toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'Todos' || carta.tipo_documento === filterType;
    return matchesSearch && matchesType;
  });

  const getTypesCount = (type: string) => {
    if (type === 'Todos') return cartas.length;
    return cartas.filter((c) => c.tipo_documento === type).length;
  };

  return (
    <div className="space-y-3 p-3 md:p-5 bg-zinc-50 min-h-screen text-slate-800">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[300] px-5 py-2.5 shadow-2xl font-bold uppercase tracking-wider text-xs ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-650 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {currentView === 'list' ? (
        <>
          {/* Cabeçalho Ajustado da Página (Sem os blocos gigantes) */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 border border-zinc-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Mail className="text-[#003366]" size={18} />
                <span className="text-[10px] font-black tracking-widest text-[#003366] uppercase">Comunicações Oficiais</span>
                <span className="px-2 py-0.5 bg-blue-50 text-[#003366] text-[10px] font-mono font-bold">
                  {cartas.length} registos
                </span>
              </div>
              <h2 className="text-xl font-black text-[#003366] tracking-tight uppercase mt-0.5">Gestão de Cartas & Declarações</h2>
              <p className="text-zinc-500 text-xs">
                Controlo oficial de correspondência, ofícios, assinaturas digitais e emissão com conformidade legal.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowManageSignaturesModal(true)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3.5 py-2 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-300"
                title="Criar e gerir assinaturas digitais"
              >
                <ShieldCheck size={14} className="text-[#003366]" />
                <span>Assinaturas Digitais</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCarta(null);
                  setCurrentView('create');
                }}
                className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                <span>Nova Carta</span>
              </button>
            </div>
          </header>

          {/* Barra Compacta de Filtros & Pesquisa */}
          <div className="bg-white border border-zinc-200 p-2.5 flex flex-col md:flex-row gap-2.5 justify-between items-center shadow-xs">
            <div className="w-full md:w-80 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar destinatário, assunto, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-zinc-200 text-xs text-zinc-700 outline-none focus:border-[#003366] transition-colors bg-zinc-50"
              />
            </div>

            <div className="flex bg-zinc-100 p-0.5 border border-zinc-200 overflow-x-auto max-w-full">
              {['Todos', 'Carta', 'Pedido', 'Ofício', 'Declaração'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                    filterType === type ? 'bg-white text-[#003366] shadow-xs' : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {type} ({getTypesCount(type)})
                </button>
              ))}
            </div>
          </div>

          {/* TABELA DE CORRESPONDÊNCIA (Aparece imediatamente em cima) */}
          {loading ? (
            <div className="bg-white border border-zinc-200 p-12 flex flex-col items-center justify-center gap-2">
              <Loader2 className="animate-spin text-[#003366]" size={28} />
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px]">A carregar correspondência...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 p-4 text-red-750 text-xs rounded">
              <span className="font-bold uppercase">⚠️ Erro na Base de Dados:</span> {error}
            </div>
          ) : filteredCartas.length === 0 ? (
            <div className="bg-white border border-zinc-200 p-12 text-center space-y-3">
              <FileText size={24} className="mx-auto text-zinc-300" />
              <h3 className="text-sm font-bold text-zinc-700 uppercase">Nenhuma Correspondência Encontrada</h3>
              <button
                type="button"
                onClick={() => setCurrentView('create')}
                className="bg-[#003366] text-white px-4 py-2 font-bold uppercase tracking-wider text-[10px] cursor-pointer"
              >
                Registar Primeira Carta
              </button>
            </div>
          ) : (
            <div className="bg-white border border-zinc-200 overflow-x-auto shadow-xs">
              <table className="w-full text-left text-xs align-middle">
                <thead className="bg-[#003366] text-white font-black text-[10px] uppercase tracking-wider border-b border-zinc-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Referência / Data</th>
                    <th className="px-3.5 py-2.5">Destinatário</th>
                    <th className="px-3.5 py-2.5">Assunto / Tipo</th>
                    <th className="px-3.5 py-2.5">Classificação / Sector</th>
                    <th className="px-3.5 py-2.5 text-center">Assinatura Digital</th>
                    <th className="px-3.5 py-2.5 text-center pr-4">Ações do Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 text-zinc-700">
                  {filteredCartas.map((carta) => {
                    const formattedDate = carta.data_documento
                      ? new Date(carta.data_documento).toLocaleDateString('pt-AO')
                      : new Date(carta.created_at).toLocaleDateString('pt-AO');

                    const isSigned = Boolean(carta.assinatura_url || carta.assinado_por);
                    const authCount = Array.isArray(carta.utilizadores_autorizados)
                      ? carta.utilizadores_autorizados.length
                      : 0;

                    return (
                      <tr key={carta.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-zinc-900 block">{carta.referencia}</span>
                          <span className="text-[10px] text-zinc-400 font-medium block">{formattedDate}</span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-bold text-zinc-800 block">{carta.nome_destinatario || carta.destinatario}</span>
                          {carta.email_destinatario && (
                            <span className="text-[10px] text-zinc-400 block">{carta.email_destinatario}</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-bold text-zinc-900 block truncate max-w-xs">{carta.assunto}</span>
                          <span className="inline-block px-1.5 py-0.2 bg-zinc-100 border border-zinc-200 text-zinc-600 font-mono text-[9px] uppercase tracking-wider mt-0.5">
                            {carta.tipo_documento}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <span className="text-zinc-600 block">{carta.area_sector || 'Geral'}</span>
                          {carta.confidencial && (
                            <span className="inline-flex items-center gap-1 text-[8.5px] bg-red-50 text-red-700 px-1.5 py-0.2 border border-red-200 font-black uppercase">
                              <Shield size={9} /> Confidencial
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              <CheckCircle2 size={11} /> Assinado
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-medium">Por Assinar</span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          {/* AÇÕES COM ÍCONES, DESCRIÇÕES E COMPORTAMENTO REAL */}
                          <div className="flex items-center justify-center gap-1">
                            {/* 1. Imprimir/Visualizar em forma de Carta A4 */}
                            <button
                              type="button"
                              onClick={() => handlePrintCartaA4(carta)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-600 text-[#003366] hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Imprimir / Visualizar em forma de Carta A4"
                            >
                              <FileText size={13} />
                            </button>

                            {/* 2. Imprimir/Visualizar em forma de Declaração A4 */}
                            <button
                              type="button"
                              onClick={() => handlePrintDeclaracaoA4(carta)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Imprimir / Visualizar em forma de Declaração A4"
                            >
                              <Award size={13} />
                            </button>

                            {/* 3. Clonar Documento */}
                            <button
                              type="button"
                              onClick={() => handleCloneDocumento(carta)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Clonar Documento (Duplicar para editar)"
                            >
                              <Copy size={13} />
                            </button>

                            {/* 4. Assinar Documento */}
                            <button
                              type="button"
                              onClick={() => handleOpenSignModal(carta)}
                              className="p-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Assinar Documento Digitalmente"
                            >
                              <PenTool size={13} />
                            </button>

                            {/* 5. Utilizadores Autorizados */}
                            <button
                              type="button"
                              onClick={() => handleOpenAuthUsersModal(carta)}
                              className="p-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white rounded-none cursor-pointer transition-colors relative"
                              title="Utilizadores Autorizados para Visualizar e Emitir"
                            >
                              <Users size={13} />
                              {authCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-teal-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                  {authCount}
                                </span>
                              )}
                            </button>

                            {/* Editar */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCarta(carta);
                                setCurrentView('edit');
                              }}
                              className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Editar Registo"
                            >
                              <Edit size={13} />
                            </button>

                            {/* Eliminar */}
                            <button
                              type="button"
                              onClick={() => handleSoftDelete(carta.id, carta.referencia)}
                              className="p-1.5 bg-red-50 hover:bg-red-600 text-red-700 hover:text-white rounded-none cursor-pointer transition-colors"
                              title="Eliminar Documento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Formulário de Criação/Edição */
        <div className="bg-white border border-zinc-200 flex justify-center p-6 shadow-xs">
          <CartaForm
            onBack={() => {
              setCurrentView('list');
              setEditingCarta(null);
            }}
            onSuccess={() => {
              setCurrentView('list');
              setEditingCarta(null);
              fetchCartas();
            }}
            editingCarta={editingCarta}
          />
        </div>
      )}

      {/* MODAL 1: ASSINAR DOCUMENTO */}
      {signingCarta && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-none border border-zinc-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#003366]">
                <PenTool size={16} /> Assinar Documento — {signingCarta.referencia}
              </div>
              <button type="button" onClick={() => setSigningCarta(null)} className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Selecione uma Assinatura Registada</label>
                {availableSignatures.length > 0 ? (
                  <select
                    value={selectedSigId}
                    onChange={(e) => setSelectedSigId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-semibold focus:border-[#003366] focus:outline-none"
                  >
                    {availableSignatures.map((sig) => (
                      <option key={sig.id} value={sig.id}>
                        {sig.nome_signatario} ({sig.cargo || 'Signatário'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-zinc-500 italic">
                    Nenhuma assinatura registada. Será gerada uma assinatura digital automática com o seu nome.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Nome do Signatário</label>
                <input
                  type="text"
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  placeholder="Nome completo de quem assina"
                  className="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-semibold focus:border-[#003366] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Cargo / Função</label>
                <input
                  type="text"
                  value={signRole}
                  onChange={(e) => setSignRole(e.target.value)}
                  placeholder="Ex: Diretor Geral / Gestor Financeiro"
                  className="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs font-semibold focus:border-[#003366] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setSigningCarta(null)}
                className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSignatureOnCarta}
                disabled={savingSign}
                className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {savingSign ? 'A Assinar...' : 'Confirmar e Estampar Assinatura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GESTÃO DE ASSINATURAS DIGITAIS */}
      {showManageSignaturesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-none border border-zinc-200 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#003366]">
                <ShieldCheck size={16} /> Gestão de Assinaturas Digitais Corporativas
              </div>
              <button
                type="button"
                onClick={() => setShowManageSignaturesModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulário para criar assinatura */}
            <form onSubmit={handleCreateNewSignature} className="bg-zinc-50 border border-zinc-200 p-3.5 space-y-2.5">
              <h4 className="text-[11px] font-black uppercase text-[#003366]">Registar Nova Assinatura Digital</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">Nome do Titular *</label>
                  <input
                    type="text"
                    value={newSigName}
                    onChange={(e) => setNewSigName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-white border border-zinc-300 p-1.5 text-xs focus:border-[#003366] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-600 mb-0.5">Cargo / Título</label>
                  <input
                    type="text"
                    value={newSigRole}
                    onChange={(e) => setNewSigRole(e.target.value)}
                    placeholder="Ex: Diretor de Operações"
                    className="w-full bg-white border border-zinc-300 p-1.5 text-xs focus:border-[#003366] focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                + Guardar Assinatura Digital
              </button>
            </form>

            {/* Lista de assinaturas existentes */}
            <div>
              <h4 className="text-[11px] font-black uppercase text-zinc-700 mb-2">Assinaturas Ativas ({availableSignatures.length})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableSignatures.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2 text-center">Nenhuma assinatura cadastrada.</p>
                ) : (
                  availableSignatures.map((sig) => (
                    <div key={sig.id} className="p-2.5 bg-white border border-zinc-200 flex items-center justify-between shadow-2xs">
                      <div>
                        <strong className="text-xs text-zinc-900 block">{sig.nome_signatario}</strong>
                        <span className="text-[10px] text-zinc-500">{sig.cargo || 'Signatário'}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase border border-emerald-200">
                        Ativa
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageSignaturesModal(false)}
                className="px-4 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: UTILIZADORES AUTORIZADOS */}
      {authUsersCarta && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-none border border-zinc-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-[#003366]">
                <Users size={16} /> Utilizadores Autorizados — {authUsersCarta.referencia}
              </div>
              <button
                type="button"
                onClick={() => setAuthUsersCarta(null)}
                className="p-1 text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-600">
              Selecione quais colaboradores ou utilizadores possuem autorização expressa para visualizar e emitir este documento:
            </p>

            <div className="space-y-1.5 max-h-56 overflow-y-auto border border-zinc-200 p-2 bg-zinc-50">
              {systemProfiles.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-4">A carregar utilizadores...</p>
              ) : (
                systemProfiles.map((prof) => {
                  const isChecked = selectedUserIds.includes(prof.id);
                  return (
                    <label
                      key={prof.id}
                      className="flex items-center justify-between p-2 bg-white border border-zinc-200 text-xs hover:bg-blue-50 cursor-pointer"
                    >
                      <div>
                        <strong className="text-zinc-900 block">{prof.nome || prof.email}</strong>
                        <span className="text-[10px] text-zinc-400">{prof.role || 'Utilizador'}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedUserIds((prev) => prev.filter((id) => id !== prof.id));
                          } else {
                            setSelectedUserIds((prev) => [...prev, prof.id]);
                          }
                        }}
                        className="w-4 h-4 text-[#003366] rounded cursor-pointer"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setAuthUsersCarta(null)}
                className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAuthUsers}
                disabled={savingAuthUsers}
                className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {savingAuthUsers ? 'A Guardar...' : 'Gravar Autorizações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartasModule;
