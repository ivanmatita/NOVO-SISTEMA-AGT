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
  ShieldAlert,
} from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import pdfjsLib from 'pdfjs-dist/build/pdf.js';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry.js?url';
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

if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

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

  // Isolamento Multi-tenant estrito: empresa_id obtido exclusivamente do perfil/sessão autenticada
  const currentEmpresaId: string =
    (user?.empresa_id as string) ||
    (user?.company_id as string) ||
    (companyData?.empresa_id as string) ||
    '';

  // Estados de navegação e pipeline
  const [mode, setMode] = useState<ScanMode>('select');
  const [analyzingStep, setAnalyzingStep] = useState<number>(1);
  const [analyzingLabel, setAnalyzingLabel] = useState<string>('Documento carregado');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Ficheiro carregado
  const [capturedFile, setCapturedFile] = useState<File | Blob | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Campos principais do formulário
  const [docType, setDocType] = useState<string>('Fatura de Compra');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [serie, setSerie] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [hashCode, setHashCode] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('AO');

  // Fornecedor
  const [supplierId, setSupplierId] = useState<string | number | ''>('');
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierNif, setSupplierNif] = useState<string>('');
  const [isExistingSupplier, setIsExistingSupplier] = useState<boolean>(false);
  const [createNewSupplier, setCreateNewSupplier] = useState<boolean>(false);

  // Artigos / Linhas do documento
  const [items, setItems] = useState<ScannedPurchaseItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Totais lidos
  const [identifiedTotal, setIdentifiedTotal] = useState<number>(0);
  const [cashBox, setCashBox] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferência');

  // Duplicados e submissão
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Refs de mídia e controle de câmara
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modeRef = useRef<ScanMode>('select');
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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

  // Taxa padrão de IVA das configurações da empresa (14% fallback)
  const defaultTaxRate = (() => {
    const ivaGeral = activeTaxes.find(
      (t) => t.tipo_imposto === 'IVA' && (Number(t.taxa) === 14 || t.codigo_imposto === 'IVA14')
    );
    return ivaGeral ? Number(ivaGeral.taxa) : 14;
  })();

  // -------------------------------------------------------------------------
  // Câmara fotográfica para digitalizar documento
  // -------------------------------------------------------------------------
  const startCameraScan = async () => {
    setAnalysisError(null);
    setMode('camera_scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
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
  // Leitor de QR Code em tempo real
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
  }, [stopCamera]);

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
            processDocumentPipeline(blob, fileName);
          }
        },
        'image/jpeg',
        0.92
      );
    }
  };

  // -------------------------------------------------------------------------
  // Carregamento de ficheiro (PDF ou Imagem)
  // -------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      alert('Formato não suportado. Por favor envie um documento PDF, JPG, PNG ou WEBP.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('O ficheiro ultrapassa o limite de 25 MB.');
      return;
    }

    setCapturedFile(file);
    setCapturedFileName(file.name);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    processDocumentPipeline(file, file.name);
  };

  // -------------------------------------------------------------------------
  // Processamento de dados de QR Code identificado
  // -------------------------------------------------------------------------
  const handleProcessQrData = async (qrText: string) => {
    setMode('analyzing');
    setAnalyzingStep(4);
    setAnalyzingLabel('Código QR detectado e lido');

    const parsed = parseAgtQrCode(qrText);
    if (!parsed) {
      setAnalysisError('Código QR não identificado ou formato não reconhecido.');
      setMode('select');
      return;
    }

    // Identificação do fornecedor
    setAnalyzingStep(7);
    setAnalyzingLabel('A identificar fornecedor na base de dados...');
    let matchedSup: Supplier | undefined;
    if (parsed.supplier_nif) {
      matchedSup = suppliers.find(
        (s) => s.nif && String(s.nif).trim() === String(parsed.supplier_nif).trim()
      );
    }

    // Preenchimento dos campos do documento
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

    // Se o QR trouxer itens ou subtotal
    setAnalyzingStep(8);
    setAnalyzingLabel('A associar linhas do documento...');
    const initialItems: ScannedPurchaseItem[] = [];
    if (parsed.subtotal && parsed.subtotal > 0) {
      initialItems.push({
        description: `Aquisição conf. ${parsed.invoice_number || 'Documento'}`,
        quantity: 1,
        unit_price: parsed.subtotal,
        tax_rate: parsed.vat_amount && parsed.subtotal ? Math.round((parsed.vat_amount / parsed.subtotal) * 100) : 0,
        tax_type: parsed.vat_amount && parsed.vat_amount > 0 ? 'IVA' : 'Isento',
        tipo_imposto: parsed.vat_amount && parsed.vat_amount > 0 ? 'IVA' : 'Isento',
        desconto: 0,
        total: parsed.total || parsed.subtotal,
        unidade_medida: 'QUANTIDADE (Qtd)',
        confidence: 'high',
      });
    }
    setItems(initialItems);
    setIdentifiedTotal(parsed.total || 0);

    // Validação de duplicados
    setAnalyzingStep(10);
    setAnalyzingLabel('A verificar duplicados na empresa...');
    if (parsed.invoice_number && currentEmpresaId) {
      const dup = await checkDuplicatePurchase(
        currentEmpresaId,
        matchedSup?.id,
        parsed.supplier_nif,
        parsed.invoice_number
      );
      if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
    }

    setAnalyzingStep(11);
    setAnalyzingLabel('Pronto para revisão');
    setMode('review');
  };

  // -------------------------------------------------------------------------
  // PIPELINE COMPLETO DE EXTRAÇÃO (11 ETAPAS REAIS)
  // -------------------------------------------------------------------------
  const processDocumentPipeline = async (fileOrBlob: File | Blob, fileName: string) => {
    setMode('analyzing');
    setAnalysisError(null);

    // Etapa 1: Documento carregado
    setAnalyzingStep(1);
    setAnalyzingLabel('Documento carregado');

    try {
      let combinedText = '';
      let detectedQrCode: string | null = null;

      // Etapa 2: Pré-processando imagem / documento
      setAnalyzingStep(2);
      setAnalyzingLabel('A pré-processar imagem / documento...');

      if (fileOrBlob.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        // Processamento de PDF multipágina nativo com pdfjs-dist
        const arrayBuffer = await fileOrBlob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          isEvalSupported: false,
          disableFontFace: true,
        });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          setAnalyzingLabel(`A processar página ${pageNum} de ${totalPages}...`);
          const page = await pdf.getPage(pageNum);

          // Extração direta de texto estruturado
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((it: any) => it.str).join(' ');
          combinedText += pageText + '\n';

          // Renderizar página em alta resolução para busca de QR Code e OCR
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;

            // Etapa 3: Procurando QR Code nesta página
            if (!detectedQrCode) {
              setAnalyzingStep(3);
              setAnalyzingLabel(`A procurar QR Code na página ${pageNum}...`);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (qr && qr.data) {
                detectedQrCode = qr.data;
              }
            }

            // Se o texto da página for muito curto, executar OCR
            if (!pageText || pageText.trim().length < 50) {
              setAnalyzingStep(5);
              setAnalyzingLabel(`A executar OCR na página ${pageNum}...`);
              try {
                const worker = await createWorker('por');
                const blob = await new Promise<Blob>((res) =>
                  canvas.toBlob((b) => res(b!), 'image/png')
                );
                const ret = await worker.recognize(blob);
                combinedText += '\n' + ret.data.text;
                await worker.terminate();
              } catch (ocrErr) {
                console.warn('[OCR Page Error]:', ocrErr);
              }
            }
          }
        }
      } else {
        // Ficheiro de Imagem (JPG, PNG, WEBP)
        const imageBitmap = await createImageBitmap(fileOrBlob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (ctx) {
          ctx.drawImage(imageBitmap, 0, 0);

          // Etapa 3: Procurando QR Code
          setAnalyzingStep(3);
          setAnalyzingLabel('A procurar QR Code na imagem...');
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: 'attemptBoth',
          });
          if (qr && qr.data) {
            detectedQrCode = qr.data;
          }

          // Etapa 5: Executando OCR
          setAnalyzingStep(5);
          setAnalyzingLabel('A executar reconhecimento ótico de caracteres (OCR)...');
          try {
            const worker = await createWorker('por');
            const ret = await worker.recognize(fileOrBlob);
            combinedText = ret.data.text;
            await worker.terminate();
          } catch (ocrErr) {
            console.warn('[OCR Image Error]:', ocrErr);
          }
        }
      }

      // Etapa 4: Lendo QR Code (se encontrado)
      let parsedQr: Partial<any> | null = null;
      if (detectedQrCode) {
        setAnalyzingStep(4);
        setAnalyzingLabel('Código QR identificado com sucesso');
        parsedQr = parseAgtQrCode(detectedQrCode);
      }

      // Etapa 6: Interpretando documento
      setAnalyzingStep(6);
      setAnalyzingLabel('A interpretar estrutura fiscal do documento...');
      const parsedOcr = parseInvoiceOcrText(combinedText);

      // Etapa 7: Identificando campos
      setAnalyzingStep(7);
      setAnalyzingLabel('A identificar cabeçalho e dados do fornecedor...');

      // Prioridade: QR Code para identificação estruturada, OCR para complemento
      const finalDocType = parsedQr?.document_type || parsedOcr.document_type || 'Fatura de Compra';
      const finalInvoiceNumber = parsedQr?.invoice_number || parsedOcr.invoice_number || '';
      const finalSerie = parsedQr?.serie || parsedOcr.serie || '';
      const finalDate = parsedQr?.date || parsedOcr.date || new Date().toISOString().split('T')[0];
      const finalDueDate = parsedQr?.due_date || parsedOcr.due_date || '';
      const finalHashCode = parsedQr?.hash_code || '';
      const finalCountry = parsedQr?.country_code || parsedOcr.country_code || 'AO';

      const finalSupplierNif = parsedQr?.supplier_nif || parsedOcr.supplier_nif || '';
      const finalSupplierName = parsedQr?.supplier_name || parsedOcr.supplier_name || '';

      setDocType(finalDocType);
      setInvoiceNumber(finalInvoiceNumber);
      setSerie(finalSerie);
      setDate(finalDate);
      setDueDate(finalDueDate);
      setHashCode(finalHashCode);
      setCountryCode(finalCountry);

      // Localizar fornecedor na base de dados da empresa autenticada
      let matchedSupplier: Supplier | undefined;
      if (finalSupplierNif) {
        matchedSupplier = suppliers.find(
          (s) =>
            s.nif &&
            String(s.nif).trim().toLowerCase() === String(finalSupplierNif).trim().toLowerCase()
        );
      }
      if (!matchedSupplier && finalSupplierName) {
        const normName = finalSupplierName.toLowerCase();
        matchedSupplier = suppliers.find(
          (s) => s.name && s.name.toLowerCase().includes(normName.slice(0, 10))
        );
      }

      if (matchedSupplier) {
        setSupplierId(matchedSupplier.id);
        setSupplierName(matchedSupplier.name);
        setSupplierNif(matchedSupplier.nif || '');
        setIsExistingSupplier(true);
        setCreateNewSupplier(false);
      } else {
        setSupplierId('');
        setSupplierName(finalSupplierName);
        setSupplierNif(finalSupplierNif);
        setIsExistingSupplier(false);
        setCreateNewSupplier(Boolean(finalSupplierNif || finalSupplierName));
      }

      // Etapa 8: Identificando linhas
      setAnalyzingStep(8);
      setAnalyzingLabel('A extrair e associar artigos do documento...');

      let finalLines = parsedOcr.items || [];

      // Se o OCR não detectou linhas mas o QR tem valores de incidência
      if (finalLines.length === 0 && (parsedQr?.subtotal || parsedOcr.subtotal)) {
        const sub = parsedQr?.subtotal || parsedOcr.subtotal || 0;
        const tot = parsedQr?.total || parsedOcr.total || sub;
        finalLines = [
          {
            description: `Aquisição s/ ${finalInvoiceNumber || 'Documento'}`,
            quantity: 1,
            unit_price: sub,
            tax_rate: defaultTaxRate,
            tax_type: 'IVA',
            tipo_imposto: 'IVA',
            desconto: 0,
            total: tot,
            unidade_medida: 'QUANTIDADE (Qtd)',
            confidence: 'medium',
          },
        ];
      }

      // Sugerir associação de produtos de stock já cadastrados
      const mappedItems = finalLines.map((it) => {
        const descLower = it.description.toLowerCase();
        const matchedProd = products.find(
          (p) =>
            (p.barcode && p.barcode.toLowerCase() === descLower) ||
            p.name.toLowerCase().includes(descLower.slice(0, 8)) ||
            descLower.includes(p.name.toLowerCase().slice(0, 8))
        );
        if (matchedProd) {
          return {
            ...it,
            matched_product_id: matchedProd.id,
            matched_product_name: matchedProd.name,
            product_id: matchedProd.id,
          };
        }
        return it;
      });

      setItems(mappedItems);

      // Etapa 9: Calculando valores
      setAnalyzingStep(9);
      setAnalyzingLabel('A calcular valores, incidências e impostos...');
      const docTotal = parsedQr?.total || parsedOcr.total || 0;
      setIdentifiedTotal(docTotal);

      // Etapa 10: Validando documento e duplicados
      setAnalyzingStep(10);
      setAnalyzingLabel('A verificar integridade e duplicados na base de dados...');
      if (finalInvoiceNumber && currentEmpresaId) {
        const dup = await checkDuplicatePurchase(
          currentEmpresaId,
          matchedSupplier?.id,
          finalSupplierNif,
          finalInvoiceNumber
        );
        if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
      }

      // Etapa 11: Pronto para revisão
      setAnalyzingStep(11);
      setAnalyzingLabel('Pronto para revisão');
      setMode('review');
    } catch (err: any) {
      console.error('[processDocumentPipeline] Erro:', err);
      setAnalysisError(
        'Não foi possível extrair automaticamente todas as informações do documento. Pode preencher e ajustar os dados manualmente.'
      );
      setMode('review');
    }
  };

  // -------------------------------------------------------------------------
  // Discrepâncias de conferência entre soma dos artigos e total identificado
  // -------------------------------------------------------------------------
  const discrepancyCheck = validateDocumentDiscrepancy(items, identifiedTotal, globalDiscount);

  // -------------------------------------------------------------------------
  // Gestão de linhas de artigos
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
        confidence: 'high',
      },
    ]);
  };

  const handleUpdateItemRow = (index: number, field: keyof ScannedPurchaseItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unit_price' || field === 'desconto') {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const desc = Number(item.desconto) || 0;
        item.total = Math.round(qty * price * (1 - desc / 100) * 100) / 100;
      }

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
  // Registo real da compra no Supabase
  // -------------------------------------------------------------------------
  const handleConfirmAndRegisterPurchase = async () => {
    if (!currentEmpresaId) {
      alert('Erro de isolamento: empresa não identificada na sessão atual.');
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

      // Criar novo fornecedor se o utilizador confirmou o cadastro
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

      // Upload do arquivo original para o Storage
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
              .update({
                document_url: uploadRes.publicUrl,
                document_path: uploadRes.storagePath,
              })
              .eq('id', savedPurchase.id);
          }
        } catch (uploadErr) {
          console.warn('[Storage upload]:', uploadErr);
        }
      }

      // Movimentação automática de caixa para faturas a pronto pagamento
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

  // -------------------------------------------------------------------------
  // Transferir dados extraídos para o formulário manual do ERP
  // -------------------------------------------------------------------------
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

  // Taxas de imposto da empresa para o seletor da tabela
  const taxRateOptions = (() => {
    const fromDb = activeTaxes
      .filter((t) => t.tipo_imposto === 'IVA' || t.codigo_imposto?.startsWith('IVA'))
      .map((t) => ({ rate: Number(t.taxa), label: `${t.taxa}% — ${t.nome || t.codigo_imposto}` }));
    if (fromDb.length > 0) return fromDb;
    return [
      { rate: 14, label: '14% (Geral IVA)' },
      { rate: 7, label: '7% (Reduzida)' },
      { rate: 5, label: '5% (Intermédia)' },
      { rate: 1, label: '1% (Imposto de Selo)' },
      { rate: 0, label: '0% (Isento / Não Sujeito)' },
    ];
  })();

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 bg-zinc-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-zinc-200 shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="bg-[#003366] text-white px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Registar documento por Scanner / Imagem / QR Code
              </h2>
              <p className="text-xs text-blue-200">
                Processamento real com OCR e QR Code AGT — estrito isolamento por empresa
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

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* MODO 1: SELECÇÃO DO MÉTODO DE ENTRADA */}
          {mode === 'select' && (
            <div className="space-y-6 py-4">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">
                  Como deseja registar o documento de compra?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Selecione uma opção para extrair automaticamente fornecedor, linhas de artigos,
                  impostos e totais.
                </p>
              </div>

              {analysisError && (
                <div className="bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2 max-w-xl mx-auto">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {/* Opção A: Digitalizar documento via câmara */}
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

                {/* Opção B: Carregar ficheiro PDF */}
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
                      Carregue o ficheiro PDF digital da fatura (Portal do Contribuinte ou software).
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    Procurar PDF <ArrowRight size={12} />
                  </span>
                </button>

                {/* Opção C: Carregar imagem */}
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
                      Envie uma fotografia ou digitalização em formato JPG, PNG ou WEBP.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    Selecionar Foto <ArrowRight size={12} />
                  </span>
                </button>

                {/* Opção D: Ler código QR */}
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
                      Aponte a câmara para o código QR impresso na fatura fiscal certificada.
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

          {/* MODO 2: VISOR DA CÂMARA (DIGITALIZAR DOCUMENTO) */}
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
                  onClick={() => {
                    stopCamera();
                    setMode('select');
                  }}
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

          {/* MODO 3: VISOR DA CÂMARA PARA QR CODE */}
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
                onClick={() => {
                  stopCamera();
                  setMode('select');
                }}
                className="px-5 py-2 border border-zinc-300 text-zinc-700 text-xs font-bold hover:bg-zinc-100"
              >
                Voltar à Seleção
              </button>
            </div>
          )}

          {/* MODO 4: PROCESSAMENTO (11 ETAPAS REAIS COM FEEDBACK) */}
          {mode === 'analyzing' && (
            <div className="py-10 flex flex-col items-center max-w-md mx-auto space-y-6">
              <div className="w-14 h-14 bg-[#003366]/10 text-[#003366] flex items-center justify-center animate-spin">
                <RefreshCw size={28} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-black text-zinc-800 tracking-tight">
                  A processar documento fiscal...
                </h3>
                <p className="text-xs text-blue-800 font-semibold mt-0.5">{analyzingLabel}</p>
              </div>

              <div className="w-full bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-xs">
                {[
                  { step: 1, label: 'Documento carregado' },
                  { step: 2, label: 'Pré-processando imagem / páginas' },
                  { step: 3, label: 'Procurando QR Code' },
                  { step: 4, label: 'Lendo QR Code' },
                  { step: 5, label: 'Executando OCR' },
                  { step: 6, label: 'Interpretando documento' },
                  { step: 7, label: 'Identificando campos e fornecedor' },
                  { step: 8, label: 'Identificando linhas e artigos' },
                  { step: 9, label: 'Calculando valores e impostos' },
                  { step: 10, label: 'Validando documento e duplicados' },
                  { step: 11, label: 'Pronto para revisão' },
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
                        className={`${
                          isDone
                            ? 'text-zinc-800 font-semibold'
                            : isCurrent
                            ? 'text-[#003366] font-bold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {label} {isDone && '✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 5: REVISÃO E CONFERÊNCIA OBRIGATÓRIA */}
          {mode === 'review' && (
            <div className="space-y-4">
              {/* Alerta de Documento Duplicado */}
              {duplicateAlert && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Aviso: Documento com possível duplicação</strong>
                    <p className="mt-0.5">
                      Este documento já se encontra registado nesta empresa (Nº{' '}
                      {duplicateAlert.numero_documento || duplicateAlert.invoice_number}, data{' '}
                      {duplicateAlert.data_compra || duplicateAlert.date}, total{' '}
                      {Number(duplicateAlert.valor_total || duplicateAlert.total || 0).toLocaleString(
                        'pt-PT',
                        { minimumFractionDigits: 2 }
                      )}{' '}
                      Kz).
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta de Discrepância Matemática ou Sucesso */}
              {discrepancyCheck.hasDiscrepancy ? (
                <div className="bg-red-50 border-l-4 border-red-600 p-3 text-xs text-red-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Diferença entre itens e valor do documento:</strong>
                    <p className="mt-0.5">{discrepancyCheck.message}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>
                    <strong>Valores conferidos com sucesso:</strong> A soma das linhas coincide com o
                    total do documento ({discrepancyCheck.calculatedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz).
                  </span>
                </div>
              )}

              {analysisError && (
                <div className="bg-zinc-50 border border-zinc-300 p-2 text-xs text-zinc-700 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-zinc-500 shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* COLUNA ESQUERDA: Pré-visualização do ficheiro original */}
                <div className="lg:col-span-1 bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Documento Original</span>
                    <span className="text-[10px] text-zinc-400">{capturedFileName || 'Ficheiro'}</span>
                  </h4>
                  <div className="border border-zinc-200 bg-white min-h-[220px] max-h-[360px] overflow-hidden flex items-center justify-center">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Documento" className="w-full h-full object-contain" />
                    ) : (
                      <div className="p-6 text-center text-zinc-400">
                        <FileText size={48} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-xs font-medium">Documento em formato PDF</span>
                        <p className="text-[10px] text-zinc-400 mt-1">{capturedFileName}</p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('select')}
                    className="w-full text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-300 py-1.5 font-bold hover:bg-zinc-100 transition-colors"
                  >
                    ↺ Processar Outro Documento
                  </button>
                </div>

                {/* COLUNA DIREITA: Dados extraídos estruturados */}
                <div className="lg:col-span-2 space-y-3">
                  {/* Bloco 1: Identificação do Documento */}
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

                  {/* Bloco 2: Fornecedor */}
                  <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                    <h4 className="text-[10px] font-black text-[#0f2a4a] border-b border-zinc-100 pb-1 uppercase tracking-widest flex items-center justify-between">
                      <span>2. Dados do Fornecedor (Emitente)</span>
                      {isExistingSupplier ? (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold flex items-center gap-1">
                          <Check size={10} /> Fornecedor Existente
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 font-bold flex items-center gap-1">
                          <AlertTriangle size={10} /> Novo Fornecedor Identificado
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">
                          NIF do Fornecedor *
                        </label>
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
                          Associar a Cadastrado
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
                          Cadastrar este fornecedor na empresa após confirmação
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Bloco 3: Caixa e Pagamento */}
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

              {/* Bloco 4: Tabela de Artigos e Linhas */}
              <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h4 className="text-[10px] font-black text-[#0f2a4a] uppercase tracking-widest flex items-center gap-2">
                    <span>Artigos e Linhas do Documento</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 font-semibold">
                      {items.length} linha(s) identificada(s)
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
                        <th className="px-2 py-1.5 text-left font-semibold">Descrição do Bem / Serviço</th>
                        <th className="px-2 py-1.5 text-left font-semibold w-44">Associar Stock</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-14">Qtd</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Preço Unit.</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-24">Taxa Imposto</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Total Linha</th>
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
                            Nenhum artigo detectado. Clique em &quot;Adicionar Linha&quot; para preencher.
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
                                <option value="">Não associado (Avulso)</option>
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

                {/* Resumo de Totais */}
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
                      <span>Total de Impostos:</span>
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

              {/* Ações de Confirmação */}
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
                      <RefreshCw size={14} className="animate-spin" /> A registar no banco...
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

        {/* Canvas invisível para fotogramas e QR codes */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
