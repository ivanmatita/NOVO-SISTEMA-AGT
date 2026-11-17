/**
 * fix-stock-atual.cjs
 * Corrige o cálculo de qtdDisponivel no StockAtualModule.tsx
 * para usar stock_quantity como base quando não há entradas via movimento.
 */

const fs = require('fs');
const path = require('path');

const FILE_PATH = path.resolve(
  __dirname,
  '../src/components/stock/StockAtualModule.tsx'
);

console.log('📂 A ler ficheiro:', FILE_PATH);
let content = fs.readFileSync(FILE_PATH, 'utf8');

// ─── PATCH 1: Substituir o bloco de cálculo de qtdDisponivel ───────────────
// Alvo: o bloco com "FÓRMULA OFICIAL EXIGIDA" + fallback quando prodMovements.length === 0
const OLD_CALC = `      // FÓRMULA OFICIAL EXIGIDA:
      // Quantidade disponível = Total de entradas - Total de saídas + Ajustamentos positivos - Ajustamentos negativos
      let qtdDisponivel = totalEntradas - totalSaidas + ajustesPositivos - ajustesNegativos;

      // Se não houver movimentos registrados ainda para este produto, utiliza o stock base cadastrado se o armazém coincidir
      const prodArmazemId = (prod as any).armazem_id || prod.warehouse_id;
      const matchesBaseWarehouse = wId === 'all' || String(prodArmazemId) === String(wId);

      if (prodMovements.length === 0) {
        if (matchesBaseWarehouse) {
          qtdDisponivel = Number(prod.stock_quantity ?? (prod as any).stock ?? (prod as any).stock_atual ?? 0);
        } else {
          qtdDisponivel = 0;
        }
      }`;

const NEW_CALC = `      // FÓRMULA OFICIAL EXIGIDA:
      // Quantidade disponível = Total de entradas - Total de saídas + Ajustamentos positivos - Ajustamentos negativos
      // stockBase: usa stock_quantity do produto quando não há entradas via movimentos
      // (produto criado via compra com stock direto no registo, sem movimento de entrada registado)
      const prodArmazemId = (prod as any).armazem_id || prod.warehouse_id;
      const matchesBaseWarehouse = wId === 'all' || String(prodArmazemId) === String(wId);

      let stockBase = 0;
      if (entradasMov === 0 && matchesBaseWarehouse) {
        stockBase = Number(
          prod.stock_quantity ??
          (prod as any).stock ??
          (prod as any).stock_atual ??
          (prod as any).estoque_atual ??
          0
        );
      }

      let qtdDisponivel = stockBase + entradasMov - totalSaidas + ajustesPositivos - ajustesNegativos;

      // Se não houver movimentos de nenhum tipo e o armazém não coincide, zera o stock
      if (prodMovements.length === 0 && !matchesBaseWarehouse) {
        qtdDisponivel = 0;
      }`;

if (!content.includes(OLD_CALC)) {
  console.error('❌ ERRO: Bloco alvo (PATCH 1) não encontrado. O ficheiro pode ter sido alterado.');
  console.log('--- Procurando trecho parcial para diagnóstico ---');
  const marker = 'FÓRMULA OFICIAL EXIGIDA';
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    console.log('Contexto encontrado:\n', content.slice(idx - 10, idx + 600));
  } else {
    console.log('Marcador não encontrado de todo.');
  }
  process.exit(1);
}

content = content.replace(OLD_CALC, NEW_CALC);
console.log('✅ PATCH 1 aplicado: cálculo de qtdDisponivel com stockBase como fallback.');

// ─── PATCH 2: Atualizar o filtro hasPresenceInWarehouse ──────────────────────
// O filtro atual usa apenas hasPresence. Vamos garantir que produtos com
// stock_quantity > 0 mas sem movimentos também aparecem quando armazém coincide.
const OLD_PRESENCE = `      // Determinar se o produto tem relevância no armazém selecionado
      const hasPresenceInWarehouse = wId === 'all' || matchesBaseWarehouse || prodMovements.length > 0;`;

const NEW_PRESENCE = `      // Determinar se o produto tem relevância no armazém selecionado
      // Inclui produtos com stock_quantity > 0 no armazém base mesmo sem movimentos
      const hasPresenceInWarehouse = wId === 'all' || matchesBaseWarehouse || prodMovements.length > 0 || qtdDisponivel > 0;`;

if (!content.includes(OLD_PRESENCE)) {
  console.error('❌ ERRO: Bloco alvo (PATCH 2) não encontrado.');
  process.exit(1);
}

content = content.replace(OLD_PRESENCE, NEW_PRESENCE);
console.log('✅ PATCH 2 aplicado: hasPresenceInWarehouse inclui qtdDisponivel > 0.');

// ─── Guardar ficheiro ─────────────────────────────────────────────────────────
fs.writeFileSync(FILE_PATH, content, 'utf8');
console.log('💾 Ficheiro guardado com sucesso:', FILE_PATH);
console.log('\n🎉 STOCKATUAL CORRIGIDO COM SUCESSO');
