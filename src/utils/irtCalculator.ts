export interface IRTBracket {
  id: number;
  min: number;
  max: number | null;
  fixedRate: number; // Parcela Fixa (Kz)
  taxRate: number;   // Taxa (%) sobre o excesso
  excessLimit: number; // Excesso de (Kz)
  description: string;
}

/**
 * Tabela Oficial de Escalões de IRT (Imposto sobre o Rendimento do Trabalho - Grupo A)
 * Legislação Vigente AGT Angola (Lei nº 28/20 de 22 de Julho / Orçamento Geral do Estado)
 */
export const IRT_BRACKETS: IRTBracket[] = [
  { id: 1, min: 0, max: 100000, fixedRate: 0, taxRate: 0, excessLimit: 0, description: 'Até 100.000,00 Kz' },
  { id: 2, min: 100001, max: 150000, fixedRate: 0, taxRate: 13, excessLimit: 100000, description: 'De 100.001,00 Kz a 150.000,00 Kz' },
  { id: 3, min: 150001, max: 200000, fixedRate: 6500, taxRate: 16, excessLimit: 150000, description: 'De 150.001,00 Kz a 200.000,00 Kz' },
  { id: 4, min: 200001, max: 300000, fixedRate: 14500, taxRate: 18, excessLimit: 200000, description: 'De 200.001,00 Kz a 300.000,00 Kz' },
  { id: 5, min: 300001, max: 500000, fixedRate: 32500, taxRate: 19, excessLimit: 300000, description: 'De 300.001,00 Kz a 500.000,00 Kz' },
  { id: 6, min: 500001, max: 1000000, fixedRate: 70500, taxRate: 20, excessLimit: 500000, description: 'De 500.001,00 Kz a 1.000.000,00 Kz' },
  { id: 7, min: 1000001, max: 1500000, fixedRate: 170500, taxRate: 21, excessLimit: 1000000, description: 'De 1.000.001,00 Kz a 1.500.000,00 Kz' },
  { id: 8, min: 1500001, max: 2000000, fixedRate: 275500, taxRate: 22, excessLimit: 1500000, description: 'De 1.500.001,00 Kz a 2.000.000,00 Kz' },
  { id: 9, min: 2000001, max: 5000000, fixedRate: 385500, taxRate: 23, excessLimit: 2000000, description: 'De 2.000.001,00 Kz a 5.000.000,00 Kz' },
  { id: 10, min: 5000001, max: 10000000, fixedRate: 1075500, taxRate: 24.5, excessLimit: 5000000, description: 'De 5.000.001,00 Kz a 10.000.000,00 Kz' },
  { id: 11, min: 10000001, max: null, fixedRate: 2300500, taxRate: 25, excessLimit: 10000000, description: 'Superior a 10.000.000,00 Kz' }
];

/**
 * Calcula o valor do IRT com base na Matéria Colectável (Salário Ilíquido - INSS 3%).
 * @param taxableSalary Valor em Kz da matéria coletável sujeita a imposto.
 * @returns Valor do IRT em Kz.
 */
export const calculateIRT = (taxableSalary: number | null | undefined): number => {
  const s = Math.max(0, taxableSalary || 0);
  if (s <= 100000) return 0;
  if (s <= 150000) return (s - 100000) * 0.13;
  if (s <= 200000) return 6500 + (s - 150000) * 0.16;
  if (s <= 300000) return 14500 + (s - 200000) * 0.18;
  if (s <= 500000) return 32500 + (s - 300000) * 0.19;
  if (s <= 1000000) return 70500 + (s - 500000) * 0.20;
  if (s <= 1500000) return 170500 + (s - 1000000) * 0.21;
  if (s <= 2000000) return 275500 + (s - 1500000) * 0.22;
  if (s <= 5000000) return 385500 + (s - 2000000) * 0.23;
  if (s <= 10000000) return 1075500 + (s - 5000000) * 0.245;
  return 2300500 + (s - 10000000) * 0.25;
};
