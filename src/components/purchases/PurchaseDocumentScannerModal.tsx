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
  Search,
  Plus,
  Trash2,
  Eye,
  Sliders,
  Check,
  Building2,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import jsQR from 'jsqr';
import { createWorker } from 'tesseract.js';
import { supabase } from '../../lib/supabase';
import { Supplier, Product, Caixa } from '../../types';
import {
  ScannedPurchaseData,
  ScannedPurchaseItem,
  parseAgtQrCode,
  parseInvoiceOcrText,
  validateDocumentDiscrepancy,
  checkDuplicatePurchase,
  uploadPurchaseOriginalFile,
  parseNumericValue
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

type ScanMode = 'select' | 'camera_scan' | 'camera_qr' | 'upload_file' | 'analyzing' | 'review';

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
  fiscalYear
}) => {
  if (!isOpen) return null;

  const currentEmpresaId = user?.empresa_id || user?.company_id || companyData?.empresa_id || '';

  // Estados de navegação
  const [mode, setMode] = useState<ScanMode>('select');
  const [analyzingStep, setAnalyzingStep] = useState<number>(1);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Ficheiro capturado / carregado
  const [capturedFile, setCapturedFile] = useState<File | Blob | null>(null);
  const [capturedFileName, setCapturedFileName] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Dados extraídos e editáveis
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

  // Itens
  const [items, setItems] = useState<ScannedPurchaseItem[]>([]);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Totais
  const [identifiedTotal, setIdentifiedTotal] = useState<number>(0);
  const [cashBox, setCashBox] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Transferência');

  // Duplicados e avisos
  const [duplicateAlert, setDuplicateAlert] = useState<any | null>(null);
  const [confidenceFields, setConfidenceFields] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Refs de vídeo / canvas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Limpeza de recursos
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Iniciar câmara para foto do documento
  const startCameraScan = async () => {
    setAnalysisError(null);
    setMode('camera_scan');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
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

  // Iniciar câmara para leitor de QR Code em tempo real
  const startCameraQr = async () => {
    setAnalysisError(null);
    setMode('camera_qr');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      requestAnimationFrame(scanQrFrame);
    } catch (err: any) {
      console.error('Erro ao aceder à câmara:', err);
      setAnalysisError('Não foi possível aceder à câmara para ler o QR Code.');
      setMode('select');
    }
  };

  // Loop de digitalização contínua de QR Code no vídeo
  const scanQrFrame = () => {
    if (!videoRef.current || !canvasRef.current || mode !== 'camera_qr') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        // Encontrou QR Code!
        stopCamera();
        handleProcessQrData(code.data);
        return;
      }
    }

    if (mode === 'camera_qr') {
      requestAnimationFrame(scanQrFrame);
    }
  };

  // Capturar foto da câmara
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx && video.videoWidth > 0) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          stopCamera();
          const fileName = `captura_cam_${Date.now()}.jpg`;
          setCapturedFile(blob);
          setCapturedFileName(fileName);
          setPreviewUrl(URL.createObjectURL(blob));
          processCapturedDocument(blob, fileName);
        }
      }, 'image/jpeg', 0.92);
    }
  };

  // Manipular upload de ficheiro (PDF, JPG, PNG, WEBP)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação de formato e tamanho
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
      alert('Formato de ficheiro não suportado. Por favor, envie um documento PDF, JPG, PNG ou WEBP.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      alert('O ficheiro ultrapassa o limite de 25MB.');
      return;
    }

    setCapturedFile(file);
    setCapturedFileName(file.name);
    setPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    processCapturedDocument(file, file.name);
  };

  // Processar dados do QR Code
  const handleProcessQrData = async (qrText: string) => {
    setMode('analyzing');
    setAnalyzingStep(1);

    const parsed = parseAgtQrCode(qrText);
    if (!parsed) {
      setAnalysisError('Código QR não identificado ou formato não reconhecido.');
      setMode('select');
      return;
    }

    setAnalyzingStep(3); // Identificação do fornecedor
    let matchedSup: Supplier | undefined = undefined;
    if (parsed.supplier_nif) {
      matchedSup = suppliers.find(s => s.nif && String(s.nif).trim() === String(parsed.supplier_nif).trim());
    }

    setAnalyzingStep(4); // Identificação do documento
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
    } else {
      setSupplierId('');
      setSupplierName(parsed.supplier_name || 'Fornecedor Identificado');
      setSupplierNif(parsed.supplier_nif || '');
      setIsExistingSupplier(false);
      setCreateNewSupplier(true);
    }

    setAnalyzingStep(5); // Itens
    // Se o QR Code trouxer itens ou valores
    const initialItems: ScannedPurchaseItem[] = [];
    if (parsed.subtotal && parsed.subtotal > 0) {
      initialItems.push({
        description: `Aquisição s/ ${parsed.invoice_number || 'Documento'}`,
        quantity: 1,
        unit_price: parsed.subtotal,
        tax_rate: 14,
        tax_type: 'IVA',
        tipo_imposto: 'IVA',
        desconto: 0,
        total: parsed.total || parsed.subtotal * 1.14,
        confidence: 'high'
      });
    }
    setItems(initialItems);
    setIdentifiedTotal(parsed.total || 0);

    setAnalyzingStep(6); // Validação de duplicados
    if (parsed.invoice_number) {
      const dup = await checkDuplicatePurchase(currentEmpresaId, matchedSup?.id, parsed.supplier_nif, parsed.invoice_number);
      if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
    }

    setAnalyzingStep(8); // Pronto para conferência
    setConfidenceFields(parsed.confidence_fields || {});
    setMode('review');
  };

  // Processar documento via OCR e QR Code combinado
  const processCapturedDocument = async (fileOrBlob: File | Blob, fileName: string) => {
    setMode('analyzing');
    setAnalysisError(null);
    setAnalyzingStep(1); // 1. Documento recebido ✓

    try {
      // 2. Tentar decodificar QR Code diretamente da imagem (se for imagem)
      if (fileOrBlob.type.startsWith('image/')) {
        const imageBitmap = await createImageBitmap(fileOrBlob);
        const canvas = document.createElement('canvas');
        canvas.width = imageBitmap.width;
        canvas.height = imageBitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imageBitmap, 0, 0);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(imgData.data, imgData.width, imgData.height);
          if (qr && qr.data) {
            handleProcessQrData(qr.data);
            return;
          }
        }
      }

      setAnalyzingStep(2); // 2. Leitura OCR
      let extractedText = '';

      if (fileOrBlob.type === 'application/pdf') {
        // Tentar extrair texto embutido do PDF via FileReader
        const buffer = await fileOrBlob.arrayBuffer();
        const decoder = new TextDecoder('utf-8', { fatal: false });
        extractedText = decoder.decode(buffer);
      }

      // Se não tiver texto ou for imagem, executar OCR com Tesseract
      if (!extractedText || extractedText.length < 50) {
        try {
          const worker = await createWorker('por');
          const ret = await worker.recognize(fileOrBlob);
          extractedText = ret.data.text;
          await worker.terminate();
        } catch (ocrErr: any) {
          console.warn('[OCR Worker warning]:', ocrErr.message);
        }
      }

      setAnalyzingStep(3); // 3. Identificação do fornecedor
      const parsedOcr = parseInvoiceOcrText(extractedText);

      // Verificar Fornecedor
      let matchedSupplier: Supplier | undefined = undefined;
      if (parsedOcr.supplier_nif) {
        matchedSupplier = suppliers.find(
          s => s.nif && String(s.nif).trim().toLowerCase() === String(parsedOcr.supplier_nif).trim().toLowerCase()
        );
      }
      if (!matchedSupplier && parsedOcr.supplier_name) {
        matchedSupplier = suppliers.find(
          s => s.name && s.name.trim().toLowerCase().includes(parsedOcr.supplier_name!.trim().toLowerCase())
        );
      }

      setAnalyzingStep(4); // 4. Identificação do documento
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

      setAnalyzingStep(5); // 5. Identificação dos artigos
      let finalItems = parsedOcr.items || [];
      if (finalItems.length === 0 && parsedOcr.subtotal && parsedOcr.subtotal > 0) {
        finalItems = [{
          description: `Mercadoria / Serviço conf. ${parsedOcr.invoice_number || 'Documento'}`,
          quantity: 1,
          unit_price: parsedOcr.subtotal,
          tax_rate: 14,
          tax_type: 'IVA',
          tipo_imposto: 'IVA',
          desconto: 0,
          total: parsedOcr.total || parsedOcr.subtotal * 1.14,
          confidence: 'medium'
        }];
      }

      // Tentar associar artigos com produtos existentes
      const mappedItems = finalItems.map(item => {
        const itemDescLower = item.description.toLowerCase();
        const matchedProd = products.find(p => 
          (p.barcode && p.barcode.toLowerCase() === itemDescLower) ||
          (p.referente && p.referente.toLowerCase() === itemDescLower) ||
          p.name.toLowerCase().includes(itemDescLower) ||
          itemDescLower.includes(p.name.toLowerCase())
        );

        if (matchedProd) {
          return {
            ...item,
            matched_product_id: matchedProd.id,
            matched_product_name: matchedProd.name,
            product_id: matchedProd.id
          };
        }
        return item;
      });

      setItems(mappedItems);
      setIdentifiedTotal(parsedOcr.total || 0);

      setAnalyzingStep(6); // 6. Validação dos valores e duplicados
      if (parsedOcr.invoice_number) {
        const dup = await checkDuplicatePurchase(currentEmpresaId, matchedSupplier?.id, parsedOcr.supplier_nif, parsedOcr.invoice_number);
        if (dup.isDuplicate) setDuplicateAlert(dup.existingRecord);
      }

      setAnalyzingStep(7); // 7. Preparação do formulário
      setConfidenceFields(parsedOcr.confidence_fields || {});

      setAnalyzingStep(8); // 8. Conferência
      setMode('review');
    } catch (err: any) {
      console.error('Erro na análise:', err);
      setAnalysisError('Não foi possível identificar automaticamente todas as informações. Pode preencher os dados manualmente.');
      setMode('review');
    }
  };

  // Recalcular totais actuais dos itens
  const discrepancyCheck = validateDocumentDiscrepancy(items, identifiedTotal, globalDiscount);

  // Manipular adição de nova linha de artigo
  const handleAddItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        description: 'Novo Artigo / Serviço',
        quantity: 1,
        unit_price: 0,
        tax_rate: 14,
        tax_type: 'IVA',
        tipo_imposto: 'IVA',
        desconto: 0,
        total: 0,
        unidade_medida: 'QUANTIDADE (Qtd)',
        confidence: 'high'
      }
    ]);
  };

  // Manipular alteração de linha de artigo
  const handleUpdateItemRow = (index: number, field: keyof ScannedPurchaseItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      // Se alterou quantidade, preço ou desconto, recalcular total
      if (field === 'quantity' || field === 'unit_price' || field === 'desconto') {
        const qty = Number(item.quantity) || 1;
        const price = Number(item.unit_price) || 0;
        const desc = Number(item.desconto) || 0;
        item.total = Math.round(qty * price * (1 - desc / 100) * 100) / 100;
      }

      // Se associou a um produto existente
      if (field === 'matched_product_id') {
        const prod = products.find(p => String(p.id) === String(value));
        if (prod) {
          item.matched_product_name = prod.name;
          item.product_id = prod.id;
          if (!item.description || item.description === 'Novo Artigo / Serviço') {
            item.description = prod.name;
          }
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

  // Remover linha
  const handleRemoveItemRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Gravação Real da Compra no Supabase
  const handleConfirmAndRegisterPurchase = async () => {
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

      // Se selecionou registar novo fornecedor e não tem ID
      if (!finalSupplierId && createNewSupplier && supplierName) {
        const newSupPayload: any = {
          company_id: currentEmpresaId,
          empresa_id: currentEmpresaId,
          nome: supplierName,
          name: supplierName,
          nif: supplierNif || null,
          pais: countryCode === 'AO' ? 'Angola' : countryCode,
          tipo_fornecedor: 'Normal',
          created_at: new Date().toISOString()
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

      const formattedItems = items.map(it => ({
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total: Number(it.total) || 0,
        desconto: Number(it.desconto) || 0,
        tax_rate: Number(it.tax_rate) || 14,
        tax_type: it.tax_type || 'IVA',
        unidade_medida: it.unidade_medida || 'QUANTIDADE (Qtd)',
        product_id: it.product_id || it.matched_product_id || null
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
          scanner_source: 'ocr_scanner_qr'
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
        updated_at: new Date().toISOString()
      };

      const { data: savedPurchase, error: saveErr } = await supabase
        .from('compras')
        .insert([purchaseData])
        .select()
        .single();

      if (saveErr) throw saveErr;

      // Upload do ficheiro original para o Storage se existir
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
                document_path: uploadRes.storagePath
              })
              .eq('id', savedPurchase.id);
          }
        } catch (uploadErr) {
          console.warn('[Storage upload warning]:', uploadErr);
        }
      }

      // Se for documento a pronto pagamento (Fatura Recibo) e houver caixa selecionado
      const isCashDoc = ['Fatura Recibo de Compra', 'Pagamento', 'Recibo', 'Fatura Recibo'].some(
        t => t.toLowerCase() === docType.trim().toLowerCase()
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
            date: new Date().toISOString()
          });
        } catch (movErr) {
          console.warn('[Movimento Caixa warning]:', movErr);
        }
      }

      onSuccess(savedPurchase);
      onClose();
    } catch (err: any) {
      console.error('Erro ao gravar compra digitalizada:', err);
      alert('Erro ao registar documento de compra: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Transferir dados para o formulário manual padrão do sistema
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
        items: items.map(it => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total: it.total,
          tax_rate: it.tax_rate,
          tax_type: it.tax_type,
          unidade_medida: it.unidade_medida,
          desconto: it.desconto
        })),
        global_discount: globalDiscount,
        caixa: cashBox,
        payment_method: paymentMethod
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 bg-zinc-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-zinc-200 shadow-2xl w-full max-w-5xl my-6 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-[#003366] text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-none">
              <Camera size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Registar documento por Scanner / Imagem / QR Code
              </h2>
              <p className="text-xs text-blue-200">
                Digitalização de faturas, faturas-recibo, notas e recibos com OCR e validação fiscal
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* MODO 1: SELECÇÃO DO MÉTODO DE ENTRADA */}
          {mode === 'select' && (
            <div className="space-y-6 py-4">
              <div className="text-center max-w-xl mx-auto">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">
                  Como deseja registar o documento de compra?
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Selecione uma das opções abaixo para ler automaticamente os dados do fornecedor, artigos, valores e impostos.
                </p>
              </div>

              {analysisError && (
                <div className="bg-red-50 border border-red-200 p-3 text-red-700 text-xs flex items-center gap-2 max-w-xl mx-auto">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {/* Opção A: Digitalizar documento com a câmara */}
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
                      Utilize a câmara ou scanner do dispositivo para fotografar a fatura em tempo real.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1">
                    Abrir Câmara <ArrowRight size={12} />
                  </span>
                </button>

                {/* Opção B: Carregar documento PDF/Arquivo */}
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
                      Carregue o ficheiro PDF digital da fatura fornecido pelo emissor.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    Procurar PDF <ArrowRight size={12} />
                  </span>
                </button>

                {/* Opção C: Carregar imagem do documento */}
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
                      Envie uma fotografia ou scan do documento em formato JPG, PNG ou WEBP.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    Selecionar Foto <ArrowRight size={12} />
                  </span>
                </button>

                {/* Opção D: Ler Código QR da fatura */}
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
                      Aponte a câmara para o QR Code impresso na fatura fiscal certificada pela AGT.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    Ler QR Code <ArrowRight size={12} />
                  </span>
                </button>
              </div>

              {/* Input escondido para upload de arquivos */}
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
                {/* Moldura guia para alinhar a fatura */}
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

          {/* MODO 3: VISOR DA CÂMARA PARA QR CODE */}
          {mode === 'camera_qr' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-md aspect-square bg-black border-2 border-emerald-500 overflow-hidden shadow-inner">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                {/* Moldura de mira de QR Code */}
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

          {/* MODO 4: ESTADO DE PROCESSAMENTO COM ETAPAS VISUAIS (SEÇÃO 21) */}
          {mode === 'analyzing' && (
            <div className="py-12 flex flex-col items-center max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-[#003366]/10 text-[#003366] flex items-center justify-center animate-spin">
                <RefreshCw size={32} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-black text-zinc-800 tracking-tight">
                  A analisar documento...
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Processando dados fiscais com validação estruturada
                </p>
              </div>

              {/* Checklist de 8 etapas conforme especificado na Seção 21 */}
              <div className="w-full bg-zinc-50 border border-zinc-200 p-4 space-y-2 text-xs">
                {[
                  { step: 1, label: 'Documento recebido' },
                  { step: 2, label: 'Leitura OCR / QR Code' },
                  { step: 3, label: 'Identificação do fornecedor' },
                  { step: 4, label: 'Identificação do documento' },
                  { step: 5, label: 'Identificação dos artigos' },
                  { step: 6, label: 'Validação dos valores e duplicados' },
                  { step: 7, label: 'Preparação do formulário' },
                  { step: 8, label: 'Conferência' }
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
                      <span className={`${isDone ? 'text-zinc-800 font-semibold' : isCurrent ? 'text-[#003366] font-bold' : 'text-zinc-400'}`}>
                        {label} {isDone && '✓'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 5: CONFERÊNCIA OBRIGATÓRIA ("CONFERIR DADOS IDENTIFICADOS") */}
          {mode === 'review' && (
            <div className="space-y-4">
              {/* Alerta de Documento Duplicado (Seção 10) */}
              {duplicateAlert && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Aviso de Duplicação Potencial:</strong>
                    <p className="mt-0.5">
                      Este documento pode já estar registado no sistema (Nº {duplicateAlert.numero_documento || duplicateAlert.invoice_number}, data {duplicateAlert.data_compra || duplicateAlert.date}, valor {Number(duplicateAlert.valor_total || duplicateAlert.total || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz). Verifique com atenção se pretende continuar o registo.
                    </p>
                  </div>
                </div>
              )}

              {/* Alerta de Discrepância nos Totais (Seção 9) */}
              {discrepancyCheck.hasDiscrepancy && (
                <div className="bg-blue-50 border-l-4 border-blue-600 p-3 text-xs text-blue-900 flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Discrepância entre Itens e Total do Documento:</strong>
                    <p className="mt-0.5">{discrepancyCheck.message}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* COLUNA ESQUERDA: Pré-visualização do ficheiro capturado */}
                <div className="lg:col-span-1 bg-zinc-50 border border-zinc-200 p-3 space-y-2">
                  <h4 className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Documento Original</span>
                    <span className="text-[10px] text-zinc-400">{capturedFileName || 'Digitalização'}</span>
                  </h4>

                  <div className="border border-zinc-200 bg-white min-h-[220px] max-h-[360px] overflow-hidden flex items-center justify-center relative">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Documento" className="w-full h-full object-contain" />
                    ) : (
                      <div className="p-6 text-center text-zinc-400">
                        <FileText size={48} className="mx-auto text-zinc-300 mb-2" />
                        <span className="text-xs font-medium">Documento em formato PDF ou digital</span>
                        <p className="text-[10px] text-zinc-400 mt-1">{capturedFileName}</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setMode('select')}
                      className="w-full text-xs text-zinc-600 hover:text-zinc-900 border border-zinc-300 py-1.5 font-bold hover:bg-zinc-100 transition-colors"
                    >
                      ↺ Digitalizar Outro Ficheiro
                    </button>
                  </div>
                </div>

                {/* COLUNA DIREITA: Formulário Estruturado de Conferência */}
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Tipo Documento *</label>
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Nº Documento *</label>
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Data de Emissão *</label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs h-7 mt-0.5 text-zinc-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Data Vencimento</label>
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
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">NIF do Fornecedor *</label>
                        <input
                          type="text"
                          value={supplierNif}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSupplierNif(val);
                            const found = suppliers.find(s => s.nif && String(s.nif).trim() === val.trim());
                            if (found) {
                              setSupplierId(found.id);
                              setSupplierName(found.name);
                              setIsExistingSupplier(true);
                              setCreateNewSupplier(false);
                            } else {
                              setIsExistingSupplier(false);
                            }
                          }}
                          placeholder="Ex: 5000000001"
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Nome / Razão Social *</label>
                        <input
                          type="text"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          placeholder="Designação do Fornecedor"
                          className="w-full bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs font-semibold h-7 mt-0.5 text-zinc-800"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-zinc-500 uppercase">Selecionar Cadastrado</label>
                        <select
                          value={supplierId || ''}
                          onChange={(e) => {
                            const id = e.target.value;
                            setSupplierId(id);
                            const found = suppliers.find(s => String(s.id) === String(id));
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
                          {suppliers.map(s => (
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
                          Cadastrar este fornecedor na base de dados após confirmação
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Se for Fatura Recibo / Pronto Pagamento: Caixa */}
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
                            {caixas.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 uppercase">Forma de Pagamento</label>
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

              {/* Bloco 3: Tabela de Artigos e Linhas */}
              <div className="bg-white border border-zinc-200 p-3 shadow-sm space-y-2">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h4 className="text-[10px] font-black text-[#0f2a4a] uppercase tracking-widest flex items-center gap-2">
                    <span>Artigos e Linhas do Documento</span>
                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 font-semibold">
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
                  <table className="w-full text-xs border-collapse" style={{ minWidth: '760px' }}>
                    <thead>
                      <tr className="bg-[#0f2a4a] text-white text-[11px]">
                        <th className="px-2 py-1.5 text-left font-semibold w-8">#</th>
                        <th className="px-2 py-1.5 text-left font-semibold">Descrição do Bem / Serviço</th>
                        <th className="px-2 py-1.5 text-left font-semibold w-48">Associar a Produto de Stock</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-16">Qtd</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Preço Unit.</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-20">IVA (%)</th>
                        <th className="px-2 py-1.5 text-right font-semibold w-24">Total</th>
                        <th className="px-2 py-1.5 text-center font-semibold w-12">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-zinc-400 italic border border-dashed border-zinc-200">
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
                                className="w-full bg-transparent border border-transparent hover:border-zinc-300 focus:border-[#003366] px-1 py-0.5 text-xs text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 border-b border-zinc-100">
                              <select
                                value={item.matched_product_id || ''}
                                onChange={(e) => handleUpdateItemRow(idx, 'matched_product_id', e.target.value)}
                                className="w-full bg-white border border-zinc-200 px-1 py-0.5 text-[11px] text-zinc-700"
                              >
                                <option value="">Não associado (Artigo avulso)</option>
                                {products.map(p => (
                                  <option key={String(p.id)} value={p.id}>
                                    {p.name} {p.barcode ? `(${p.barcode})` : ''}
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
                                onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-14 text-center border border-zinc-200 px-1 py-0.5 text-xs font-bold text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right border-b border-zinc-100">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) => handleUpdateItemRow(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right border border-zinc-200 px-1 py-0.5 text-xs font-bold text-zinc-800"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center border-b border-zinc-100">
                              <select
                                value={item.tax_rate}
                                onChange={(e) => handleUpdateItemRow(idx, 'tax_rate', parseFloat(e.target.value) || 0)}
                                className="border border-zinc-200 px-1 py-0.5 text-xs text-zinc-800"
                              >
                                <option value="14">14% (Geral)</option>
                                <option value="7">7% (Reduzida)</option>
                                <option value="5">5% (Intermédia)</option>
                                <option value="0">0% (Isento)</option>
                              </select>
                            </td>
                            <td className="px-2 py-1.5 text-right font-bold text-zinc-800 border-b border-zinc-100">
                              {Number(item.total || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz
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
                        Total lido no documento: <strong>{identifiedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz</strong>
                      </span>
                    )}
                  </div>

                  <div className="w-full sm:w-72 bg-zinc-50 border border-zinc-200 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-600 font-semibold">
                      <span>Subtotal (Incidência):</span>
                      <span>{discrepancyCheck.calculatedSubtotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz</span>
                    </div>
                    <div className="flex justify-between text-xs text-blue-700 font-semibold">
                      <span>IVA Liquidado:</span>
                      <span>+{discrepancyCheck.calculatedVat.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-1.5 flex justify-between text-sm font-black text-[#003366]">
                      <span>Total Final:</span>
                      <span>{discrepancyCheck.calculatedTotal.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} Kz</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Finais (Seção 8 e 11) */}
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
                      <RefreshCw size={14} className="animate-spin" /> A registar no Supabase...
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

        {/* Canvas invisível para processamento de fotogramas e QR codes */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};
