import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  FileText,
  QrCode,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ArrowRight,
} from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { supabase } from '../../lib/supabase';
import { Supplier, Product, Caixa } from '../../types';
import {
  ScannedPurchaseItem,
  parseAgtQrCode,
  parseInvoiceOcrText,
  validateDocumentDiscrepancy,
  checkDuplicatePurchase,
  uploadPurchaseOriginalFile,
} from '../../services/purchaseDocumentScannerService';

interface PurchaseDocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedPurchase?: any) => void;
  onTransferToManualForm?: (prefilledData: any) => void;
  user: any;
  companyData: any;
  suppliers: Supplier[];
  products: Product[];
  activeTaxes: any[];
  caixas: Caixa[];
  addMovement?: (m: any) => Promise<void>;
  fiscalYear?: string | number;
}

type ScanMode = 'select' | 'camera_scan' | 'camera_qr' | 'analyzing' | 'review';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render the first page of a PDF Blob to an ImageData using pdf.js (CDN) */
async function renderPdfPageToImageData(pdfBlob: Blob): Promise<ImageData | null> {
  try {
    // Dynamically load pdf.js from CDN if not already loaded
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('pdf.js load failed'));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return null;

    // Point worker to CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // Scale to ~1600px wide for good OCR quality
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (err: any) {
    console.warn('[renderPdfPageToImageData] Falha ao renderizar PDF:', err.message);
    return null;
  }
}

/** Extract embedded text from a PDF (works for text-based PDFs) */
async function extractPdfText(pdfBlob: Blob): Promise<string> {
  try {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('pdf.js load failed'));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    if (!pdfjsLib) return '';

    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const arrayBuffer = await pdfBlob.arrayBuffer();
    const pdf = await (pdfjsLib.getDocument({ data: arrayBuffer })).promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= Math.min(numPages, 3); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (err: any) {
    console.warn('[extractPdfText] Falha ao extrair texto de PDF:', err.message);
    return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PurchaseDocumentScannerModal: React.FC<PurchaseDocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onTransferToManualForm,
  user,
  companyData,
  suppliers = [],
  products = [],
  activeTaxes = [],
  caixas = [],
  addMovement,
  fiscalYear,
}) => {
  if (!isOpen) return null;

  // Empresa ID comes ONLY from authenticated session — never hardcoded
  const currentEmpresaId: string =
    (user?.empresa_id as string) ||
    (user?.company_id as string) ||
    (companyData?.empresa_id as string) ||
    '';

  // Navigation state
  const [mode, setMode] = useState<ScanMode>('select');
  const [analyzingStep, setAnalyzingStep] = useState<number>(1);
  const [analyzingLabel, setAnalyzingLabel] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Captured file
  const [capturedFile, setCapturedFile] = useState<File | Blob | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Extracted & editable fields
  const [docType, setDocType] = useState<string>('Fatura de Compra');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [serie, setSerie] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [hashCode, setHashCode] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('AO');

  // Supplier
  const [supplierId, setSupplierId] = useState<string | number | ''>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierNif, setSupplierNif] = useState<string>('');
  const [isExistingSupplier, setIsExistingSupplier] = useState<boolean>(false);
  const [createNewSupplier, setCreateNewSupplier] = useState<boolean>(false);

  // Items
  const [items, setItems] = useState<ScannedPurchaseItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Totals
  const [identifiedTotal, setIdentifiedTotal] = useState<number>(0);
  const [cashBox, setCashBox] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferência');

  // Alerts
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Media refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // *** FIX: use a ref for mode to avoid stale closure in requestAnimationFrame ***
  const modeRef = useRef<ScanMode>('select');
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Default tax rate from activeTaxes (IVA general = 14%, fallback)
  const defaultTaxRate = (() => {
    const ivaGeral = activeTaxes.find(
      (t) => t.tipo_imposto === 'IVA' && (t.taxa === 14 || t.codigo_imposto === 'IVA14')
    );
    return ivaGeral ? Number(ivaGeral.taxa) : 14;
  })();

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // -------------------------------------------------------------------------
  // Camera — scan document photo
  // -------------------------------------------------------------------------
  const startCameraScan = async () => {
    setAnalysisError(null);
    setMode('camera_scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Erro ao aceder à câmara:', err);
      setAnalysisError('Não foi possível aceder à câmara. Verifique as permissões do dispositivo.');
      setMode('select');
    }
  };

  // -------------------------------------------------------------------------
  // Camera — real-time QR scanner (fixed stale closure)
  // -------------------------------------------------------------------------
  const startCameraQr = async () => {
    setAnalysisError(null);
    setMode('camera_qr');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        // Start QR scan loop after video plays
        videoRef.current.onplaying = () => {
          requestAnimationFrame(scanQrFrame);
        };
      }
    } catch (err: any) {
      console.error('Erro ao aceder à câmara QR:', err);
      setAnalysisError('Não foi possível aceder à câmara para ler o QR Code.');
      setMode('select');
    }
  };

  // QR frame loop — uses modeRef to avoid stale closure
  const scanQrFrame = useCallback(() => {
    if (modeRef.current !== 'camera_qr') return;
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        handleProcessQrData(code.data);
        return;
      }
    }

    requestAnimationFrame(scanQrFrame);
  }, [stopCamera]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Capture photo from camera
  // -------------------------------------------------------------------------
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            stopCamera();
            const fileName = `captura_cam_${Date.now()}.jpg`;
            setCapturedFile(blob);
            setCapturedFileName(fileName);
            setPreviewUrl(URL.createObjectURL(blob));
            processCapturedDocument(blob, fileName);
          }
        },
        'image/jpeg',
        0.92
      );
    }
  };

  // -------------------------------------------------------------------------
  // File upload handler
  // -------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      alert('Formato não suportado. Envie um documento PDF, JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('O ficheiro ultrapassa o limite de 25 MB.');
      return;
    }

    setCapturedFile(file);
    setCapturedFileName(file.name);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    processCapturedDocument(file, file.name);
  };

  // -------------------------------------------------------------------------
  // Process QR Code data (AGT format or JSON)
  // -------------------------------------------------------------------------
  const handleProcessQrData = async (qrText: string) => {
    setMode('analyzing');
    setAnalyzingStep(1);
    setAnalyzingLabel('QR Code recebido');

    const parsed = parseAgtQrCode(qrText);
    if (!parsed) {
      setAnalysisError('Código QR não identificado ou formato não reconhecido pelo sistema.');
      setMode('select');
      return;
    }

    setAnalyzingStep(3);
    setAnalyzingLabel('A identificar fornecedor...');
    let matchedSup: Supplier | undefined;
    if (parsed.supplier_nif) {
      matchedSup = suppliers.find(
        (s) => s.nif && String(s.nif).trim() === String(parsed.supplier_nif).trim()
      );
    }

    setAnalyzingStep(4);
    setAnalyzingLabel('A preencher dados do documento...');
    if (parsed.document_type) setDocType(parsed.document_type);
    if (parsed.invoice_number) setInvoiceNumber(parsed.invoice_number);
    if (parsed.serie) setSerie(parsed.serie);
    if (parsed.date) setDate(parsed.date);
    if (parsed.hash_code) setHashCode(parsed.hash_code);
    if (parsed.country_code) setCountryCode(parsed.country_code);

    if (matchedSup) {
      setSupplierId(matchedSup.id);
      setSupplierName(matchedSup.name);
      setSupplierNif(matchedSup.nif || '');
      setIsExistingSupplier(true);
      setCreateNewSupplier(false);
    } else {
      setSupplierId('');
      setSupplierName(parsed.supplier_name || '');
      setSupplierNif(parsed.supplier_nif || '');
      setIsExistingSupplier(false);
      setCreateNewSupplier(Boolean(parsed.supplier_nif || parsed.supplier_name));
    }

    setAnalyzingStep(5);
    setAnalyzingLabel('A processar artigos...');
    const initialItems: ScannedPurchaseItem[] = [];
    if (parsed.subtotal && parsed.subtotal > 0) {
      initialItems.push({
        description: `Aquisição conf. ${parsed.invoice_number || 'Documento'}`,
        quantity: 1,
        unit_price: parsed.subtotal,
        tax_rate: defaultTaxRate,
        tax_type: 'IVA',
        tipo_imposto: 'IVA',
        desconto: 0,
        total: parsed.subtotal, // net value; IVA calculated on display
        confidence: 'high',
      });
    }
    setItems(initialItems);
    setIdentifiedTotal(parsed.total || 0);

    setAnalyzingStep(6);
    setAnalyzingLabel('A verificar duplicados...');
    if (parsed.invoice_number && currentEmpresaId) {
      const dup = await checkDuplicatePurchase(
        currentEmpresaId,
        matchedSup?.id,
        parsed.supplier_nif,
        parsed.invoice_number
      );
      if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
    }

    setAnalyzingStep(8);
    setAnalyzingLabel('Pronto para conferência');
    setMode('review');
  };

  // -------------------------------------------------------------------------
  // Main document processing (OCR + QR combined)
  // -------------------------------------------------------------------------
  const processCapturedDocument = async (fileOrBlob: File | Blob, fileName: string) => {
    setMode('analyzing');
    setAnalysisError(null);
    setAnalyzingStep(1);
    setAnalyzingLabel('Documento recebido');

    try {
      // --- Step 2: Try QR on image first ---
      if (fileOrBlob.type.startsWith('image/')) {
        setAnalyzingStep(2);
        setAnalyzingLabel('A procurar QR Code na imagem...');
        try {
          const imageBitmap = await createImageBitmap(fileOrBlob);
          const tmpCanvas = document.createElement('canvas');
          tmpCanvas.width = imageBitmap.width;
          tmpCanvas.height = imageBitmap.height;
          const tmpCtx = tmpCanvas.getContext('2d');
          if (tmpCtx) {
            tmpCtx.drawImage(imageBitmap, 0, 0);
            const imgData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
            const qr = jsQR(imgData.data, imgData.width, imgData.height);
            if (qr && qr.data) {
              handleProcessQrData(qr.data);
              return;
            }
          }
        } catch (qrErr) {
          console.warn('[QR image scan] Falha, a continuar com OCR:', qrErr);
        }
      }

      // --- Step 2: OCR ---
      setAnalyzingStep(2);
      setAnalyzingLabel('A executar leitura OCR...');
      let extractedText = '';

      if (fileOrBlob.type === 'application/pdf') {
        // 1. Try embedded text extraction (fast, for text-based PDFs)
        setAnalyzingLabel('A extrair texto do PDF...');
        extractedText = await extractPdfText(fileOrBlob);

        // 2. If little or no text found, render page and run Tesseract OCR
        if (!extractedText || extractedText.length < 50) {
          setAnalyzingLabel('A renderizar PDF para OCR...');
          const imgData = await renderPdfPageToImageData(fileOrBlob);
          if (imgData) {
            setAnalyzingLabel('A executar OCR na imagem do PDF...');
            try {
              const worker = await createWorker('por');
              const ret = await worker.recognize(
                // Convert ImageData to a canvas blob for Tesseract
                await (async () => {
                  const c = document.createElement('canvas');
                  c.width = imgData.width;
                  c.height = imgData.height;
                  c.getContext('2d')!.putImageData(imgData, 0, 0);
                  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/png'));
                })()
              );
              extractedText = ret.data.text;
              await worker.terminate();
            } catch (ocrErr: any) {
              console.warn('[OCR PDF worker]:', ocrErr.message);
            }
          }
        }
      } else {
        // Image: run Tesseract OCR directly
        setAnalyzingLabel('A reconhecer texto na imagem...');
        try {
          const worker = await createWorker('por');
          const ret = await worker.recognize(fileOrBlob);
          extractedText = ret.data.text;
          await worker.terminate();
        } catch (ocrErr: any) {
          console.warn('[OCR image worker]:', ocrErr.message);
        }
      }

      // --- Step 3: Supplier identification ---
      setAnalyzingStep(3);
      setAnalyzingLabel('A identificar fornecedor...');
      const parsedOcr = parseInvoiceOcrText(extractedText);

      let matchedSupplier: Supplier | undefined;
      if (parsedOcr.supplier_nif) {
        matchedSupplier = suppliers.find(
          (s) =>
            s.nif &&
            String(s.nif).trim().toLowerCase() === String(parsedOcr.supplier_nif).trim().toLowerCase()
        );
      }
      if (!matchedSupplier && parsedOcr.supplier_name) {
        matchedSupplier = suppliers.find(
          (s) =>
            s.name &&
            s.name.trim().toLowerCase().includes(parsedOcr.supplier_name!.trim().toLowerCase())
        );
      }

      // --- Step 4: Document fields ---
      setAnalyzingStep(4);
      setAnalyzingLabel('A preencher dados do documento...');
      if (parsedOcr.document_type) setDocType(parsedOcr.document_type);
      if (parsedOcr.invoice_number) setInvoiceNumber(parsedOcr.invoice_number);
      if (parsedOcr.serie) setSerie(parsedOcr.serie);
      if (parsedOcr.date) setDate(parsedOcr.date);
      if (parsedOcr.due_date) setDueDate(parsedOcr.due_date);

      if (matchedSupplier) {
        setSupplierId(matchedSupplier.id);
        setSupplierName(matchedSupplier.name);
        setSupplierNif(matchedSupplier.nif || '');
        setIsExistingSupplier(true);
        setCreateNewSupplier(false);
      } else {
        setSupplierId('');
        setSupplierName(parsedOcr.supplier_name || '');
        setSupplierNif(parsedOcr.supplier_nif || '');
        setIsExistingSupplier(false);
        setCreateNewSupplier(Boolean(parsedOcr.supplier_nif || parsedOcr.supplier_name));
      }

      // --- Step 5: Items ---
      setAnalyzingStep(5);
      setAnalyzingLabel('A identificar artigos...');
      let finalItems = (parsedOcr.items || []).map((item) => ({
        ...item,
        tax_rate: item.tax_rate ?? defaultTaxRate,
        total: item.total ?? Number(item.quantity) * Number(item.unit_price), // net
      }));

      // If no line items found, create a single line from the totals
      if (finalItems.length === 0 && parsedOcr.subtotal && parsedOcr.subtotal > 0) {
        finalItems = [
          {
            description: `Mercadoria / Serviço conf. ${parsedOcr.invoice_number || 'Documento'}`,
            quantity: 1,
            unit_price: parsedOcr.subtotal,
            tax_rate: defaultTaxRate,
            tax_type: 'IVA',
            tipo_imposto: 'IVA',
            desconto: 0,
            total: parsedOcr.subtotal, // net
            confidence: 'medium' as const,
          },
        ];
      }

      // Try matching items to existing products (by name/barcode)
      const mappedItems = finalItems.map((item) => {
        const descLower = item.description.toLowerCase();
        const matchedProd = products.find(
          (p) =>
            (p.barcode && p.barcode.toLowerCase() === descLower) ||
            (p.referente && p.referente.toLowerCase() === descLower) ||
            p.name.toLowerCase().includes(descLower.slice(0, 8)) ||
            descLower.includes(p.name.toLowerCase().slice(0, 8))
        );
        if (matchedProd) {
          return {
            ...item,
            matched_product_id: matchedProd.id,
            matched_product_name: matchedProd.name,
            product_id: matchedProd.id,
          };
        }
        return item;
      });

      setItems(mappedItems);
      setIdentifiedTotal(parsedOcr.total || 0);

      // --- Step 6: Duplicate check ---
      setAnalyzingStep(6);
      setAnalyzingLabel('A verificar duplicados...');
      if (parsedOcr.invoice_number && currentEmpresaId) {
        const dup = await checkDuplicatePurchase(
          currentEmpresaId,
          matchedSupplier?.id,
          parsedOcr.supplier_nif,
          parsedOcr.invoice_number
        );
        if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
      }

      setAnalyzingStep(7);
      setAnalyzingLabel('A preparar formulário...');
      setAnalyzingStep(8);
      setAnalyzingLabel('Conferência');
      setMode('review');
    } catch (err: any) {
      console.error('[processCapturedDocument] Erro:', err);
      setAnalysisError(
        'Não foi possível identificar automaticamente todas as informações. Preencha os dados manualmente.'
      );
      setMode('review');
    }
  };

  // -------------------------------------------------------------------------
  // Discrepancy check (calculated from items)
  // -------------------------------------------------------------------------
  const discrepancyCheck = validateDocumentDiscrepancy(items, identifiedTotal, globalDiscount);

  // -------------------------------------------------------------------------
  // Item management
  // -------------------------------------------------------------------------
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        quantity: 1,
        unit_price: 0,
        tax_rate: defaultTaxRate,
        tax_type: 'IVA',
        tipo_imposto: 'IVA',
        desconto: 0,
        total: 0,
        unidade_medida: 'QUANTIDADE (Qtd)',
        confidence: 'high' as const,
      },
    ]);
  };

  const handleUpdateItemRow = (index: number, field: keyof ScannedPurchaseItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Recalculate net total when qty, price or discount changes
      if (field === 'quantity' || field === 'unit_price' || field === 'desconto') {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const desc = Number(item.desconto) || 0;
        item.total = Math.round(qty * price * (1 - desc / 100) * 100) / 100;
      }

      // Link to existing product
      if (field === 'matched_product_id') {
        const prod = products.find((p) => String(p.id) === String(value));
        if (prod) {
          item.matched_product_name = prod.name;
          item.product_id = prod.id;
          if (!item.description) item.description = prod.name;
        } else {
          item.matched_product_id = null;
          item.matched_product_name = null;
          item.product_id = null;
        }
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // -------------------------------------------------------------------------
  // Save purchase to Supabase
  // -------------------------------------------------------------------------
  const handleConfirmAndRegisterPurchase = async () => {
    if (!currentEmpresaId) {
      alert('Erro: empresa não identificada. Faça login novamente.');
      return;
    }
    if (!invoiceNumber.trim()) {
      alert('Por favor, informe o Número do Documento antes de registar.');
      return;
    }
    if (!supplierName.trim()) {
      alert('Por favor, informe o Nome do Fornecedor antes de registar.');
      return;
    }
    if (items.length === 0) {
      alert('Por favor, adicione pelo menos um artigo/serviço.');
      return;
    }

    setSubmitting(true);
    try {
      let finalSupplierId = supplierId;

      // Create new supplier if not found and user opted in
      if (!finalSupplierId && createNewSupplier && supplierName) {
        const newSupPayload: any = {
          company_id: currentEmpresaId,
          empresa_id: currentEmpresaId,
          nome: supplierName,
          name: supplierName,
          nif: supplierNif || null,
          pais: countryCode === 'AO' ? 'Angola' : countryCode,
          tipo_fornecedor: 'Normal',
          created_at: new Date().toISOString(),
        };

        const { data: createdSup, error: supErr } = await supabase
          .from('fornecedores')
          .insert([newSupPayload])
          .select()
          .single();

        if (!supErr && createdSup) {
          finalSupplierId = createdSup.id;
        }
      }

      const purchaseAno = Number(date ? new Date(date).getFullYear() : new Date().getFullYear());
      const purchaseNum = invoiceNumber || `PUR-${Date.now()}`;
      const finalTotalAmount = discrepancyCheck.calculatedTotal;
      const subtotalAmount = discrepancyCheck.calculatedSubtotal;
      const vatTotalAmount = discrepancyCheck.calculatedVat;

      const formattedItems = items.map((it) => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total: Number(it.total) || 0,
        desconto: Number(it.desconto) || 0,
        tax_rate: Number(it.tax_rate) ?? defaultTaxRate,
        tax_type: it.tax_type || 'IVA',
        unidade_medida: it.unidade_medida || 'QUANTIDADE (Qtd)',
        product_id: it.product_id || it.matched_product_id || null,
      }));

      const purchaseData: any = {
        empresa_id: currentEmpresaId,
        supplier_id: finalSupplierId || null,
        fornecedor_id: finalSupplierId || null,
        supplier_name: supplierName,
        fornecedor_nome: supplierName,
        supplier_nif: supplierNif,
        nif: supplierNif,
        document_type: docType,
        tipo_documento: docType,
        invoice_number: invoiceNumber,
        numero_documento: purchaseNum,
        numero_compra: purchaseNum,
        purchase_number: purchaseNum,
        numero_fatura: invoiceNumber,
        numero: purchaseNum,
        date: date,
        data_compra: date,
        data: date,
        due_date: dueDate || null,
        data_vencimento: dueDate || null,
        country_code: countryCode || 'AO',
        items: formattedItems,
        itens: formattedItems,
        detalhes: {
          items: formattedItems,
          total: finalTotalAmount,
          document_type: docType,
          supplier_name: supplierName,
          hash_code: hashCode || null,
          scanner_source: 'ocr_scanner_qr',
        },
        subtotal: subtotalAmount,
        total: finalTotalAmount,
        valor_total: finalTotalAmount,
        vat_amount: vatTotalAmount,
        valor_iva: vatTotalAmount,
        desconto: Number(globalDiscount) || 0,
        global_discount: Number(globalDiscount) || 0,
        desconto_global: Number(globalDiscount) || 0,
        payment_method: paymentMethod || null,
        metodo_pagamento: paymentMethod || null,
        caixa: cashBox || null,
        caixa_id: cashBox || null,
        ano: purchaseAno,
        status: 'pendente',
        estado: 'pendente',
        saldo_pendente: finalTotalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: savedPurchase, error: saveErr } = await supabase
        .from('compras')
        .insert([purchaseData])
        .select()
        .single();

      if (saveErr) throw saveErr;

      // Upload original file to Storage
      if (capturedFile && savedPurchase?.id) {
        try {
          const uploadRes = await uploadPurchaseOriginalFile(
            capturedFile,
            capturedFileName || 'documento_compra.jpg',
            currentEmpresaId,
            user?.id,
            savedPurchase.id,
            purchaseNum
          );
          if (uploadRes) {
            await supabase
              .from('compras')
              .update({ document_url: uploadRes.publicUrl, document_path: uploadRes.storagePath })
              .eq('id', savedPurchase.id);
          }
        } catch (uploadErr) {
          console.warn('[Storage upload]:', uploadErr);
        }
      }

      // Cash movement for immediate-payment document types
      const isCashDoc = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Fatura Recibo'].some(
        (t) => t.toLowerCase() === docType.trim().toLowerCase()
      );
      if (isCashDoc && cashBox && addMovement) {
        try {
          await addMovement({
            caixa_id: cashBox,
            caixaId: cashBox,
            tipo: 'saida',
            type: 'saida',
            valor: finalTotalAmount,
            amount: finalTotalAmount,
            descricao: `${docType} - ${supplierName}`,
            description: `${docType} - ${supplierName}`,
            referencia: invoiceNumber,
            documento_id: savedPurchase?.id,
            moeda: 'AOA',
            date: new Date().toISOString(),
          });
        } catch (movErr) {
          console.warn('[Movimento Caixa]:', movErr);
        }
      }

      onSuccess(savedPurchase);
      onClose();
    } catch (err: any) {
      console.error('[handleConfirmAndRegisterPurchase] Erro:', err);
      alert('Erro ao registar documento de compra: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Transfer data to manual form
  const handleTransferToManual = () => {
    if (onTransferToManualForm) {
      onTransferToManualForm({
        supplier_id: supplierId,
        supplier_name: supplierName,
        supplier_nif: supplierNif,
        document_type: docType,
        tipo_documento: docType,
        invoice_number: invoiceNumber,
        numero_documento: invoiceNumber,
        date: date,
        data_compra: date,
        due_date: dueDate,
        items: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
          tax_rate: it.tax_rate,
          tax_type: it.tax_type,
          unidade_medida: it.unidade_medida,
          desconto: it.desconto,
        })),
        global_discount: globalDiscount,
        caixa: cashBox,
        payment_method: paymentMethod,
      });
    }
    onClose();
  };

  // -------------------------------------------------------------------------
  // Tax rate options (from activeTaxes + fallbacks)
  // -------------------------------------------------------------------------
  const taxRateOptions = (() => {
    const fromDb = activeTaxes
      .filter((t) => t.tipo_imposto === 'IVA' || t.codigo_imposto?.startsWith('IVA'))
      .map((t) => ({ rate: Number(t.taxa), label: `${t.taxa}% — ${t.nome || t.codigo_imposto}` }));
    if (fromDb.length > 0) return fromDb;
    // Angola IVA fallback rates
    return [
      { rate: 14, label: '14% (Taxa Geral)' },
      { rate: 7, label: '7% (Taxa Reduzida)' },
      { rate: 5, label: '5% (Taxa Intermédia)' },
      { rate: 2, label: '2% (Construção Civil)' },
      { rate: 0, label: '0% (Isento / Não Sujeito)' },
    ];
  })();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 bg-zinc-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-zinc-200 shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#003366] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Registar Documento por Scanner / Imagem / QR Code
              </h2>
              <p className="text-xs text-blue-200">
                Digitalização de faturas com OCR e validação fiscal — dados da empresa autenticada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ---------------------------------------------------------------- */}
          {/* MODE: select                                                      */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'select' && (
            <div className="space-y-6 py-4">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">
                  Como deseja registar o documento de compra?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Selecione uma opção para ler automaticamente os dados do fornecedor, artigos, valores e
                  impostos.
                </p>
              </div>

              {analysisError && (
                <div className="bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2 max-w-xl mx-auto">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {/* Option A: Camera scan */}
                <button
                  type="button"
                  onClick={startCameraScan}
                  className="group p-5 border-2 border-zinc-200 hover:border-[#003366] bg-zinc-50/50 hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between h-48 shadow-sm"
                >
                  <div className="w-12 h-12 bg-[#003366]/10 text-[#003366] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={26} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-[#003366]">
                      📷 Digitalizar documento
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Fotografe a fatura com a câmara do dispositivo em tempo real.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1">
                    Abrir Câmara <ArrowRight size={12} />
                  </span>
                </button>

                {/* Option B: Upload PDF */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group p-5 border-2 border-zinc-200 hover:border-[#003366] bg-zinc-50/50 hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between h-48 shadow-sm"
                >
                  <div className="w-12 h-12 bg-blue-600/10 text-blue-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText size={26} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-[#003366]">
                      📄 Carregar documento
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Carregue o ficheiro PDF digital da fatura fornecida pelo emissor.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    Procurar PDF <ArrowRight size={12} />
                  </span>
                </button>

                {/* Option C: Upload image */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="group p-5 border-2 border-zinc-200 hover:border-[#003366] bg-zinc-50/50 hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between h-48 shadow-sm"
                >
                  <div className="w-12 h-12 bg-amber-600/10 text-amber-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={26} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-[#003366]">
                      🖼️ Carregar imagem
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Envie uma fotografia ou scan em formato JPG, PNG ou WEBP.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    Selecionar Foto <ArrowRight size={12} />
                  </span>
                </button>

                {/* Option D: QR Code camera */}
                <button
                  type="button"
                  onClick={startCameraQr}
                  className="group p-5 border-2 border-zinc-200 hover:border-[#003366] bg-zinc-50/50 hover:bg-blue-50/30 transition-all text-left flex flex-col justify-between h-48 shadow-sm"
                >
                  <div className="w-12 h-12 bg-emerald-600/10 text-emerald-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <QrCode size={26} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 group-hover:text-[#003366]">
                      ▣ Ler código QR
                    </h4>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">
                      Aponte a câmara para o QR Code impresso na fatura certificada pela AGT.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    Ler QR Code <ArrowRight size={12} />
                  </span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,image/jpg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: camera_scan                                                 */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'camera_scan' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-xl aspect-[4/3] bg-black border-2 border-zinc-300 overflow-hidden shadow-inner">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-6 border-2 border-dashed border-white/80 pointer-events-none flex flex-col justify-between p-2">
                  <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 self-start">
                    Alinhe a fatura na área indicada
                  </span>
                  <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 self-end">
                    Certifique-se de boa iluminação
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { stopCamera(); setMode('select'); }}
                  className="px-5 py-2 border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-[#002244] shadow-md"
                >
                  <Camera size={16} /> Capturar Foto
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: camera_qr                                                   */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'camera_qr' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-md aspect-square bg-black border-2 border-emerald-500 overflow-hidden shadow-inner">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-12 border-2 border-emerald-400 pointer-events-none animate-pulse flex items-center justify-center">
                  <div className="w-16 h-16 border-t-4 border-l-4 border-emerald-300 absolute top-0 left-0" />
                  <div className="w-16 h-16 border-t-4 border-r-4 border-emerald-300 absolute top-0 right-0" />
                  <div className="w-16 h-16 border-b-4 border-l-4 border-emerald-300 absolute bottom-0 left-0" />
                  <div className="w-16 h-16 border-b-4 border-r-4 border-emerald-300 absolute bottom-0 right-0" />
                  <span className="text-[11px] bg-black/75 text-emerald-300 px-3 py-1 font-mono">
                    Aponte para o QR Code
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { stopCamera(); setMode('select'); }}
                className="px-5 py-2 border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100"
              >
                Voltar à Seleção
              </button>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: analyzing                                                   */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'analyzing' && (
            <div className="py-12 flex flex-col items-center max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-[#003366]/10 text-[#003366] flex items-center justify-center animate-spin">
                <RefreshCw size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-black text-zinc-800 tracking-tight">
                  A analisar documento...
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Processamento de dados fiscais com validação</p>
              </div>

              <div className="w-full bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-xs">
                {[
                  { step: 1, label: 'Documento recebido' },
                  { step: 2, label: 'Leitura OCR / QR Code' },
                  { step: 3, label: 'Identificação do fornecedor' },
                  { step: 4, label: 'Identificação do documento' },
                  { step: 5, label: 'Identificação dos artigos' },
                  { step: 6, label: 'Validação e verificação de duplicados' },
                  { step: 7, label: 'Preparação do formulário' },
                  { step: 8, label: 'Conferência final' },
                ].map(({ step, label }) => {
                  const isDone = analyzingStep > step;
                  const isCurrent = analyzingStep === step;
                  return (
                    <div key={step} className="flex items-center gap-2.5">
                      {isDone ? (
                        <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#003366] border-t-transparent animate-spin shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-300 shrink-0" />
                      )}
                      <span
                        className={`${isDone ? 'text-zinc-800 font-semibold' : isCurrent ? 'text-[#003366] font-bold' : 'text-zinc-400'}`}
                      >
                        {label}
                        {isCurrent && analyzingLabel ? ` — ${analyzingLabel}` : ''}
                        {isDone ? ' ✓' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* MODE: review                                                      */}
          {/* ---------------------------------------------------------------- */}
          {mode === 'review' && (
            <div className="space-y-4">
              {/* Duplicate alert */}
              {duplicateAlert && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Aviso de Duplicação Potencial:</strong>
                    <p className="mt-0.5">
                      Este documento pode já estar registado (Nº{' '}
                      {duplicateAlert.numero_documento || duplicateAlert.invoice_number}, data{' '}
                      {duplicateAlert.data_compra || duplicateAlert.date}, valor{' '}
                      {Number(duplicateAlert.valor_total || duplicateAlert.total || 0).toLocaleString(
                        'pt-PT',
                        { minimumFractionDigits: 2 }
                      )}{' '}
                      Kz). Verifique antes de continuar.
                    </p>
                  </div>
                </div>
              )}

              {/* Discrepancy alert */}
              {discrepancyCheck.hasDiscrepancy && (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-3 text-xs text-blue-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Discrepância entre Itens e Total do Documento:</strong>
                    <p className="mt-0.5">{discrepancyCheck.message}</p>
                  </div>
                </div>
              )}

              {/* Analysis error info */}
              {analysisError && (
                <div className="bg-zinc-50 border border-zinc-300 p-3 text-xs text-zinc-700 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-zinc-500 shrink-0" />
                  <span>{analysisError} Pode preencher os campos manualmente abaixo.</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: document preview */}
                <div className="lg:col-span-1 bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Documento Original</span>
                    <span className="text-[10px] text-zinc-400">{capturedFileName || 'Digitalização'}</span>
                  </h4>
                  <div className="border border-zinc-200 bg-white min-h-[220px] max-h-[360px] overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Documento" className="w-full h-full object-contain" />
                    ) : (
                      <div className="p-6 text-center text-zinc-400">
                        <FileText size={48} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-xs font-medium">Ficheiro PDF ou digital</span>
                        <p className="text-[10px] text-zinc-400 mt-1">{capturedFileName}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('select')}
                    className="w-full text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-300 py-1.5 font-bold hover:bg-zinc-100 transition-colors"
                  >
                    ↺ Digitalizar Outro Ficheiro
                  </button>
                </div>

                {/* Right: form */}
                <div className="lg:col-span-2 space-y-3">
                  {/* Block 1: Document identification */}
                  <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                    <h4 className="text-[10px] font-black text-[#0f2a4a] border-b border-zinc-100 pb-1 uppercase tracking-widest flex items-center justify-between">
                      <span>1. Identificação do Documento</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">
                        Conferência Obrigatória
                      </span>
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Tipo Documento *
                        </label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        >
                          <option value="Fatura de Compra">Fatura de Compra</option>
                          <option value="Fatura Recibo de Compra">Fatura Recibo de Compra</option>
                          <option value="Nota de Crédito de Fornecedor">Nota de Crédito</option>
                          <option value="Nota de Débito de Fornecedor">Nota de Débito</option>
                          <option value="Guia de Entrada">Guia de Entrada</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Nº Documento *
                        </label>
                        <input
                          type="text"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          placeholder="FT 2026/001"
                          required
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Data de Emissão *
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Data Vencimento
                        </label>
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Block 2: Supplier */}
                  <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                    <h4 className="text-[10px] font-black text-[#0f2a4a] border-b border-zinc-100 pb-1 uppercase tracking-widest flex items-center justify-between">
                      <span>2. Dados do Fornecedor</span>
                      {isExistingSupplier ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold flex items-center gap-1">
                          <Check size={10} /> Fornecedor Existente
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 font-bold flex items-center gap-1">
                          <AlertTriangle size={10} /> Novo Fornecedor Detectado
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">NIF *</label>
                        <input
                          type="text"
                          value={supplierNif}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSupplierNif(val);
                            const found = suppliers.find(
                              (s) => s.nif && String(s.nif).trim() === val.trim()
                            );
                            if (found) {
                              setSupplierId(found.id);
                              setSupplierName(found.name);
                              setIsExistingSupplier(true);
                              setCreateNewSupplier(false);
                            } else {
                              setIsExistingSupplier(false);
                            }
                          }}
                          placeholder="5000000001"
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Nome / Razão Social *
                        </label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="Designação do Fornecedor"
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          Selecionar Cadastrado
                        </label>
                        <select
                          value={supplierId || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSupplierId(id);
                            const found = suppliers.find((s) => String(s.id) === String(id));
                            if (found) {
                              setSupplierName(found.name);
                              setSupplierNif(found.nif || '');
                              setIsExistingSupplier(true);
                              setCreateNewSupplier(false);
                            }
                          }}
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                        >
                          <option value="">Selecione da Lista</option>
                          {suppliers.map((s) => (
                            <option key={String(s.id)} value={s.id}>
                              {s.name} ({s.nif || 'S/NIF'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {!isExistingSupplier && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="chkNewSupplier"
                          checked={createNewSupplier}
                          onChange={(e) => setCreateNewSupplier(e.target.checked)}
                          className="rounded border-zinc-300 text-[#003366]"
                        />
                        <label htmlFor="chkNewSupplier" className="text-xs text-zinc-700 font-medium">
                          Cadastrar este fornecedor após confirmação
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Block 3: Cash box (cash payment types) */}
                  {(docType === 'Fatura Recibo de Compra' || docType === 'Recibo') && (
                    <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                      <h4 className="text-[10px] font-black text-[#0f2a4a] border-b border-zinc-100 pb-1 uppercase tracking-widest">
                        3. Pagamento Imediato de Caixa
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Caixa *</label>
                          <select
                            value={cashBox}
                            onChange={(e) => setCashBox(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                          >
                            <option value="">Selecione o Caixa</option>
                            {caixas.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">
                            Forma de Pagamento
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                          >
                            <option value="Numerário">Numerário</option>
                            <option value="Multicaixa">Multicaixa</option>
                            <option value="Transferência">Transferência</option>
                            <option value="Depósito">Depósito</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Block 4: Items table */}
              <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h4 className="text-[10px] font-black text-[#0f2a4a] uppercase tracking-widest flex items-center gap-2">
                    <span>Artigos e Linhas do Documento</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 font-semibold">
                      {items.length} linha(s)
                    </span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="bg-[#003366] hover:bg-[#002244] text-white px-3 py-1 text-[10px] font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={12} /> Adicionar Linha
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: '780px' }}>
                    <thead>
                      <tr className="bg-[#0f2a4a] text-white text-[11px]">
                        <th className="px-2 py-1.5 text-left font-semibold w-7">#</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Descrição</th>
                        <th className="px-2 py-1.5 text-left font-semibold w-44">Associar Produto</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-14">Qtd</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Preço Unit.</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-24">IVA</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Total (Líq.)</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-10">✕</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-6 text-center text-zinc-400 italic border border-dashed border-zinc-200"
                          >
                            Nenhum artigo adicionado. Clique em &quot;Adicionar Linha&quot; para preencher.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/70'}>
                            <td className="px-2 py-1.5 text-zinc-500 border-b border-zinc-100">{idx + 1}</td>
                            <td className="px-2 py-1.5 border-b border-zinc-100">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItemRow(idx, 'description', e.target.value)}
                                placeholder="Descrição do bem ou serviço"
                                className="w-full bg-transparent border border-transparent hover:border-zinc-300 focus:border-[#003366] px-1 py-0.5 text-xs text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 border-b border-zinc-100">
                              <select
                                value={item.matched_product_id || ''}
                                onChange={(e) =>
                                  handleUpdateItemRow(idx, 'matched_product_id', e.target.value)
                                }
                                className="w-full bg-white border border-zinc-200 px-1 py-0.5 text-[11px] text-zinc-700"
                              >
                                <option value="">Não associado</option>
                                {products.map((p) => (
                                  <option key={String(p.id)} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-center border-b border-zinc-100">
                              <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemRow(idx, 'quantity', parseFloat(e.target.value) || 1)
                                }
                                className="w-14 text-center border border-zinc-200 px-1 py-0.5 text-xs font-bold text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right border-b border-zinc-100">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleUpdateItemRow(idx, 'unit_price', parseFloat(e.target.value) || 0)
                                }
                                className="w-20 text-right border border-zinc-200 px-1 py-0.5 text-xs font-bold text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-b border-zinc-100">
                              <select
                                value={item.tax_rate}
                                onChange={(e) =>
                                  handleUpdateItemRow(idx, 'tax_rate', parseFloat(e.target.value) || 0)
                                }
                                className="border border-zinc-200 px-1 py-0.5 text-xs text-zinc-800"
                              >
                                {taxRateOptions.map((opt) => (
                                  <option key={opt.rate} value={opt.rate}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold text-zinc-800 border-b border-zinc-100">
                              {Number(item.total || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}{' '}
                              Kz
                            </td>
                            <td className="px-2 py-1.5 text-center border-b border-zinc-100">
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-zinc-100 gap-4">
                  <div className="text-xs text-zinc-500">
                    {identifiedTotal > 0 && (
                      <span className="inline-block bg-zinc-100 px-2 py-1 text-[11px]">
                        Total lido no documento:{' '}
                        <strong>
                          {identifiedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="w-full sm:w-72 bg-zinc-50 border border-zinc-200 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-600 font-semibold">
                      <span>Subtotal (Incidência):</span>
                      <span>
                        {discrepancyCheck.calculatedSubtotal.toLocaleString('pt-PT', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        Kz
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700 font-semibold">
                      <span>IVA Liquidado:</span>
                      <span>
                        +{discrepancyCheck.calculatedVat.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}{' '}
                        Kz
                      </span>
                    </div>
                    {globalDiscount > 0 && (
                      <div className="flex justify-between text-xs text-red-600 font-semibold">
                        <span>Desconto Global:</span>
                        <span>
                          -{globalDiscount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
                        </span>
                      </div>
                    )}
                    <div className="border-t border-zinc-200 pt-1.5 flex justify-between text-sm font-black text-[#003366]">
                      <span>Total Final:</span>
                      <span>
                        {discrepancyCheck.calculatedTotal.toLocaleString('pt-PT', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        Kz
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>

                {onTransferToManualForm && (
                  <button
                    type="button"
                    onClick={handleTransferToManual}
                    className="px-5 py-2 border border-[#003366] text-[#003366] text-xs font-bold hover:bg-blue-50 transition-colors"
                  >
                    Transferir p/ Formulário Manual
                  </button>
                )}

                <button
                  type="button"
                  disabled={submitting || items.length === 0}
                  onClick={handleConfirmAndRegisterPurchase}
                  className="px-6 py-2 bg-[#003366] hover:bg-[#002244] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> A registar...
                    </>
                  ) : (
                    <>
                      <Check size={14} /> Confirmar e Registar Compra
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for QR frame processing */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
