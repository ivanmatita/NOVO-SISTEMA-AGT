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

/**
 * Specialized P80 Thermal Receipt PDF Generator.
 * Generates an 80mm continuous roll PDF matching real POS thermal receipt proportions.
 */
export const exportThermalReceiptPDF = async (elementId: string, filename: string = 'recibo_p80.pdf') => {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.width = '300px';
    clone.style.maxWidth = '300px';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.background = '#ffffff';
    clone.style.padding = '12px';
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    document.body.removeChild(clone);

    const imgData = canvas.toDataURL('image/png');
    // 80mm roll width: 76mm printable width
    const pdfWidth = 76;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, Math.max(80, pdfHeight + 4)],
      compress: true
    });

    pdf.addImage(imgData, 'PNG', 1, 2, pdfWidth - 2, pdfHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating thermal PDF:', error);
    exportToPDF(elementId, filename);
  }
};

/**
 * Specialized P80 Thermal Receipt Printer.
 * Injects strict 80mm continuous roll CSS via an isolated hidden iframe.
 */
export const printThermalReceiptP80 = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Recibo P80 Térmico</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 2mm 1mm;
            width: 76mm;
            max-width: 76mm;
            background: #fff;
            color: #000;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
          }
          img, svg {
            max-width: 100%;
          }
          .break-words {
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            white-space: normal !important;
          }
          #${elementId} {
            width: 100% !important;
            max-width: 76mm !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
      </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn('Iframe print error fallback:', e);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (_) {}
      }, 1500);
    }
  }, 400);
};

