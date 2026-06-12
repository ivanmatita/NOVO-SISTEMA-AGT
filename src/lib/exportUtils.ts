import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx';
import printJS from 'print-js';

/**
 * Exports an HTML element to a professional PDF.
 * Uses html2canvas for capturing and jsPDF for PDF generation.
 */
export const exportToPDF = async (elementId: string, filename: string = 'document.pdf') => {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const clone = el.cloneNode(true) as HTMLElement;

    // remover estilos modernos incompatíveis (oklch fix) e preservar design profissional
    clone.querySelectorAll<HTMLElement>("*").forEach(node => {
      if (node.style) {
        node.style.filter = "none";
        
        // Substituimos cores oklch por equivalentes standard para garantir compatibilidade
        const comp = window.getComputedStyle(node);
        if (comp.color && comp.color.includes('oklch')) {
          // Fallback para preto ou marinho corporativo dependendo de onde está
          node.style.color = "#0f172a"; 
        }
        if (comp.backgroundColor && comp.backgroundColor.includes('oklch')) {
          node.style.backgroundColor = "transparent";
        }
      }
    });
    
    // We append the clone to the document to render it properly
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // The A4 size is 210 x 297 mm
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
    
    pdf.save(filename);
    document.body.removeChild(clone);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};

/**
 * Exports data to a professional Excel spreadsheet.
 * Applies auto-width and simple styling.
 */
export const exportToExcel = (data: any[], filename: string = 'relatorio.xlsx', sheetName: string = 'Dados') => {
  if (!data || data.length === 0) return;

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // Auto-width for columns
  const maxWidths = data.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const value = row[key] ? row[key].toString() : '';
      acc[i] = Math.max(acc[i] || 0, value.length, key.length);
    });
    return acc;
  }, []);

  ws['!cols'] = maxWidths.map((w: number) => ({ wch: w + 2 }));

  // Sanitize filename
  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
};

/**
 * Professional print utility using print-js.
 * Ensures CSS is preserved during printing.
 */
export const handlePrint = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Inject current page styles into print-js
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n');

  printJS({
    printable: elementId,
    type: 'html',
    targetStyles: ['*'],
    scanStyles: true,
    maxWidth: 1200,
    style: `
      @media print {
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .no-print { display: none !important; }
        .print-area { width: 210mm; min-height: 297mm; padding: 10mm; margin: auto; background: white; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 8px; }
        img { max-width: 100%; }
      }
    ` + styles
  });
};

/**
 * Formats values to Angolan Kwanza (Kz) with professional precision.
 */
export const formatCurrencyKz = (value: number) => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
    minimumFractionDigits: 2
  }).format(value).replace('AOA', 'Kz');
};
