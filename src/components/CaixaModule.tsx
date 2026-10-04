/**
 * CaixaModule.tsx
 * Módulo Principal de Gestão Financeira de Caixa do ERP.
 * Integração 100% real com banco de dados Supabase, RLS e multi-tenant.
 * Permissões por Caixa, transferências atómicas, conciliação e relatórios.
 * SEM BOTÃO ELIMINAR CAIXA (regra estrita).
 */

import React, { useState } from 'react';
import { Caixa, CaixaMovement } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCaixas } from '../hooks/useCaixas';
import { CaixaListPage } from './caixa/CaixaListPage';
import { TransferenciaCaixasPage } from './caixa/TransferenciaCaixasPage';
import { ConciliacaoBancariaPage } from './caixa/ConciliacaoBancariaPage';
import { AssociarMovimentosPage } from './caixa/AssociarMovimentosPage';
import { RelatorioFinanceiroCaixaPage } from './caixa/RelatorioFinanceiroCaixaPage';
import { MovimentosCaixaPage } from './caixa/MovimentosCaixaPage';
import { EditarCaixaModal } from './caixa/EditarCaixaModal';
import { NovoCaixaModal } from './caixa/NovoCaixaModal';
import { NovaOperacaoModal } from './caixa/NovaOperacaoModal';
import { toast } from 'react-hot-toast';

interface CaixaModuleProps {
  fiscalYear?: string;
  companyData?: any;
  onNavigateToSalary?: () => void;
  onNavigateToTax?: () => void;
}

export const CaixaModule: React.FC<CaixaModuleProps> = ({
  fiscalYear = '2026',
  companyData,
  onNavigateToSalary,
  onNavigateToTax
}) => {
  const { user } = useAuth();
  const {
    caixas,
    movements,
    profiles,
    loading,
    refresh,
    createCaixa,
    updateCaixa,
    addMovement,
    canUserOperateCaixa,
    saveCaixaPermissions,
    transferirCaixas
  } = useCaixas();

  // Active section view
  const [currentSection, setCurrentSection] = useState<
    'list' | 'transferencia' | 'conciliacao' | 'associar' | 'relatorios' | 'movimentos'
  >('list');

  const [selectedCaixaId, setSelectedCaixaId] = useState<string | null>(null);

  // Modals state
  const [showNovoCaixaModal, setShowNovoCaixaModal] = useState(false);
  const [editingCaixa, setEditingCaixa] = useState<Caixa | null>(null);
  const [showNovaOperacaoModal, setShowNovaOperacaoModal] = useState(false);
  const [novaOperacaoType, setNovaOperacaoType] = useState<'entrada' | 'saida'>('entrada');

  // Handle Edit Save
  const handleSaveEditCaixa = async (
    caixaId: string,
    updates: Partial<Caixa>,
    permittedUserIds: string[]
  ) => {
    // 1. Update basic caixa fields
    await updateCaixa(caixaId, updates);
    // 2. Persist permissions in caixas_utilizadores table
    await saveCaixaPermissions(caixaId, permittedUserIds);
  };

  // Handle Create Save
  const handleSaveNovoCaixa = async (
    caixaData: any,
    permittedUserIds: string[]
  ) => {
    const created = await createCaixa(caixaData);
    if (created?.id && permittedUserIds.length > 0) {
      await saveCaixaPermissions(created.id, permittedUserIds);
    }
  };

  // Handle Navigation
  const handleNavigateSection = (
    section: 'conciliacao' | 'transferencia' | 'associar' | 'relatorios' | 'movimentos' | 'salarios' | 'impostos'
  ) => {
    if (section === 'salarios') {
      if (onNavigateToSalary) {
        onNavigateToSalary();
      } else {
        toast('Redirecionando para Liquidação de Salários Processados...', { icon: '💰' });
        window.dispatchEvent(new CustomEvent('navigate_tab', { detail: 'salarios' }));
      }
      return;
    }

    if (section === 'impostos') {
      if (onNavigateToTax) {
        onNavigateToTax();
      } else {
        toast('Redirecionando para Pagamento de Impostos...', { icon: '🧾' });
        window.dispatchEvent(new CustomEvent('navigate_tab', { detail: 'impostos' }));
      }
      return;
    }

    setCurrentSection(section);
  };

  return (
    <div className="space-y-4">
      {/* 1. Main Overview & Ledger List */}
      {currentSection === 'list' && (
        <CaixaListPage
          caixas={caixas}
          movements={movements}
          fiscalYear={fiscalYear}
          selectedCaixaId={selectedCaixaId}
          onSelectCaixa={id => setSelectedCaixaId(id)}
          onRefresh={refresh}
          onOpenNovoCaixa={() => setShowNovoCaixaModal(true)}
          onOpenEditarCaixa={cx => setEditingCaixa(cx)}
          onOpenNovaOperacao={(type = 'entrada') => {
            setNovaOperacaoType(type);
            setShowNovaOperacaoModal(true);
          }}
          onNavigateSection={handleNavigateSection}
          canOperateCaixa={canUserOperateCaixa}
        />
      )}

      {/* 2. Transferência Entre Caixas */}
      {currentSection === 'transferencia' && (
        <TransferenciaCaixasPage
          caixas={caixas}
          selectedCaixaId={selectedCaixaId}
          onBack={() => setCurrentSection('list')}
          onTransferSuccess={refresh}
          canOperateCaixa={canUserOperateCaixa}
          transferirCaixas={transferirCaixas}
        />
      )}

      {/* 3. Conciliação Bancária */}
      {currentSection === 'conciliacao' && (
        <ConciliacaoBancariaPage
          caixas={caixas}
          selectedCaixaId={selectedCaixaId}
          fiscalYear={fiscalYear}
          onBack={() => setCurrentSection('list')}
          canOperateCaixa={canUserOperateCaixa}
        />
      )}

      {/* 4. Associar Movimentos */}
      {currentSection === 'associar' && (
        <AssociarMovimentosPage
          caixas={caixas}
          selectedCaixaId={selectedCaixaId}
          onBack={() => setCurrentSection('list')}
          canOperateCaixa={canUserOperateCaixa}
        />
      )}

      {/* 5. Relatório Financeiro do Caixa */}
      {currentSection === 'relatorios' && (
        <RelatorioFinanceiroCaixaPage
          caixas={caixas}
          selectedCaixaId={selectedCaixaId}
          fiscalYear={fiscalYear}
          onBack={() => setCurrentSection('list')}
          companyData={companyData}
        />
      )}

      {/* 6. Movimentos Detalhados */}
      {currentSection === 'movimentos' && (
        <MovimentosCaixaPage
          caixas={caixas}
          selectedCaixaId={selectedCaixaId}
          fiscalYear={fiscalYear}
          onBack={() => setCurrentSection('list')}
        />
      )}

      {/* Modals */}
      {editingCaixa && (
        <EditarCaixaModal
          caixa={editingCaixa}
          profiles={profiles}
          onClose={() => setEditingCaixa(null)}
          onSave={handleSaveEditCaixa}
        />
      )}

      {showNovoCaixaModal && (
        <NovoCaixaModal
          profiles={profiles}
          onClose={() => setShowNovoCaixaModal(false)}
          onCreate={handleSaveNovoCaixa}
        />
      )}

      {showNovaOperacaoModal && (
        <NovaOperacaoModal
          caixas={caixas}
          defaultCaixaId={selectedCaixaId || undefined}
          defaultType={novaOperacaoType}
          onClose={() => setShowNovaOperacaoModal(false)}
          onSave={async (opData) => {
            await addMovement({
              caixaId: opData.caixaId,
              caixa_id: opData.caixaId,
              type: opData.type,
              tipo: opData.type,
              amount: opData.amount,
              valor: opData.amount,
              description: opData.description,
              descricao: opData.description,
              moeda: opData.moeda,
              referencia: `MANUAL-${Date.now()}`
            });
            await refresh();
          }}
          canOperateCaixa={canUserOperateCaixa}
        />
      )}
    </div>
  );
};

export default CaixaModule;
