import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, QrCode, Upload, X, Keyboard } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
  title = 'Leitor de Código de Barras & QR Code',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let cancelled = false;
    const startCamera = async () => {
      setCameraError(null);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Câmara não disponível neste navegador. Utilize o upload de imagem ou leitura por leitor USB/manual.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setScanning(true);

        const BarcodeDetectorCtor = (window as any).BarcodeDetector;
        const detector = BarcodeDetectorCtor
          ? new BarcodeDetectorCtor({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'] })
          : null;

        const tick = async () => {
          if (cancelled || !videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            // 1. Tentar BarcodeDetector nativo (suporta códigos de barras + QR)
            if (detector) {
              try {
                const barcodes = await detector.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  stopCamera();
                  onDetected(barcodes[0].rawValue);
                  onClose();
                  return;
                }
              } catch {
                // fallback jsQR abaixo
              }
            }

            // 2. Fallback jsQR (suporta QR Code em todos os browsers/mobile)
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx && video.videoWidth > 0) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const qr = jsQR(imgData.data, imgData.width, imgData.height);
              if (qr?.data) {
                stopCamera();
                onDetected(qr.data);
                onClose();
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Permissão da câmara recusada. Ative a permissão ou carregue uma imagem do código.'
            : 'Não foi possível aceder à câmara do dispositivo. Utilize leitor USB, upload de foto ou digitação manual.'
        );
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        try {
          const detector = new BarcodeDetectorCtor({ formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39'] });
          const res = await detector.detect(canvas);
          if (res?.[0]?.rawValue) {
            onDetected(res[0].rawValue);
            onClose();
            return;
          }
        } catch {
          // fallback jsQR
        }
      }

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qr = jsQR(data.data, data.width, data.height);
      if (qr?.data) {
        onDetected(qr.data);
        onClose();
      } else {
        setCameraError('Não foi possível detetar nenhum código legível nesta imagem.');
      }
    };
    img.src = URL.createObjectURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[120] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md border-t-4 border-[#003366] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#003366] text-white">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
            <QrCode size={16} />
            <span>{title}</span>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-white/80 hover:text-white cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative bg-zinc-900 aspect-video flex items-center justify-center overflow-hidden border border-zinc-300">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            {scanning && (
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            )}
            {cameraError && (
              <div className="absolute inset-0 bg-zinc-900/90 text-white p-4 flex flex-col items-center justify-center text-center gap-2">
                <Camera size={28} className="text-zinc-400" />
                <p className="text-xs text-zinc-200 leading-relaxed">{cameraError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex-1 border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload size={14} />
              <span>Ler Código de Imagem / Foto</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualCode.trim()) return;
              stopCamera();
              onDetected(manualCode.trim());
              onClose();
            }}
            className="flex gap-2 pt-2 border-t border-zinc-100"
          >
            <div className="relative flex-1">
              <Keyboard size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ou bipe com leitor USB / digite EAN..."
                className="w-full pl-8 pr-2 py-2 bg-zinc-50 border border-zinc-200 text-xs font-mono focus:outline-none focus:border-[#003366]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Aplicar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
