import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import * as XLSX from 'xlsx';
import printJS from 'print-js';

/**
 * Exports an HTML element to a professional PDF.
 * Uses html2canvas for capturing and jsPDF for PDF generation.
 */
export const exportToPDF = async (elementId: string, filename: string = 'document.pdf') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Show a loading indicator if possible (can be handled by caller)
    
    const canvas = await html2canvas(element, {
      scale: 3, // Higher scale for professional resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          // Force visibility of print-specific elements if needed
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG with 95% quality for better size/quality balance
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgProps = pdf.getImageProperties(imgData);
    const imgWidth = pdfWidth;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

    // Handle multi-page if content is too long
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
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
