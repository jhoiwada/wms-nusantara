'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetectorInstance;
      getSupportedFormats?: () => Promise<string[]>;
    };
  }
}

export interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedValue: string) => boolean | void;
  title?: string;
  subtitle?: string;
  targetType?: 'PRODUCT' | 'LOCATION' | 'ANY';
}

/**
 * Plays a pleasant pos confirmation beep using Web Audio API oscillator
 */
function playBeepSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Audio may fail if user hasn't interacted or unsupported
  }
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode Kamera HP',
  subtitle = 'Arahkan kamera ke barcode produk atau label rak',
}: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningRef = useRef(false);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'not_found'>('idle');
  const [continuousMode, setContinuousMode] = useState(true);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Handle scanned value
  const handleProcessScan = useCallback(
    (code: string) => {
      const cleanCode = code.trim();
      if (!cleanCode) return;

      playBeepSound();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(80);
        } catch {
          // silent
        }
      }

      setLastScanned(cleanCode);
      const isSuccess = onScan(cleanCode);

      if (isSuccess === false) {
        setScanStatus('not_found');
      } else {
        setScanStatus('success');
      }

      if (!continuousMode) {
        stopCamera();
        onClose();
      } else {
        // Reset success state after a moment to keep scanning
        setTimeout(() => {
          setScanStatus('idle');
        }, 1500);
      }
    },
    [onScan, continuousMode, stopCamera, onClose],
  );

  // Effect to manage camera lifecycle when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let active = true;

    async function initCamera() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (active) setCameraError('Browser tidak mendukung akses kamera.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setCameraError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play().catch(() => {});
        }

        isScanningRef.current = true;

        if (typeof window !== 'undefined' && window.BarcodeDetector) {
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'ean_13', 'ean_8', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
          });

          let lastDetectedTime = 0;

          const scanFrame = async () => {
            if (!active || !isScanningRef.current || !videoRef.current) return;

            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              try {
                const now = Date.now();
                if (now - lastDetectedTime > 1200) {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0 && barcodes[0]?.rawValue) {
                    lastDetectedTime = now;
                    handleProcessScan(barcodes[0].rawValue);
                  }
                }
              } catch {
                // Frame decoding error
              }
            }

            if (active && isScanningRef.current) {
              requestAnimationFrame(scanFrame);
            }
          };

          requestAnimationFrame(scanFrame);
        }
      } catch (err: unknown) {
        if (!active) return;
        const errorMsg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Silakan izinkan akses kamera di browser Anda.'
            : 'Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.';
        setCameraError(errorMsg);
      }
    }

    void initCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [isOpen, facingMode, retryCount, stopCamera, handleProcessScan]);

  // Handle manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Toggle camera facing mode (front / back)
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Viewfinder Section */}
        <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden bg-slate-950">
          {cameraError ? (
            <div className="px-6 text-center text-slate-300">
              <svg
                className="mx-auto mb-2 h-10 w-10 text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-xs font-semibold text-white">{cameraError}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Gunakan input manual di bawah atau pemindai barcode USB/Bluetooth.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRetryCount((c) => c + 1)}
                className="mt-3 border-slate-700 text-xs text-white hover:bg-slate-800"
              >
                Coba Akses Kamera Lagi
              </Button>
            </div>
          ) : (
            <>
              {/* Live Video Feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={`relative h-44 w-64 rounded-xl border-2 transition-colors duration-300 ${
                    scanStatus === 'success'
                      ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                      : scanStatus === 'not_found'
                        ? 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.5)]'
                        : 'border-white/80'
                  }`}
                >
                  {/* Corner accents */}
                  <div className="absolute -top-1.5 -left-1.5 h-4 w-4 border-t-3 border-l-3 border-indigo-500" />
                  <div className="absolute -top-1.5 -right-1.5 h-4 w-4 border-t-3 border-r-3 border-indigo-500" />
                  <div className="absolute -bottom-1.5 -left-1.5 h-4 w-4 border-b-3 border-l-3 border-indigo-500" />
                  <div className="absolute -right-1.5 -bottom-1.5 h-4 w-4 border-r-3 border-b-3 border-indigo-500" />

                  {/* Scanning Laser Animation Line */}
                  <div className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 animate-pulse bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
                </div>
              </div>

              {/* Camera Controls Overlay */}
              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="rounded-full bg-slate-900/70 p-2 text-white backdrop-blur-xs transition-colors hover:bg-slate-900"
                  title="Ganti Kamera Depan/Belakang"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Scan Status & Feedback Banner */}
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  scanStatus === 'success'
                    ? 'animate-ping bg-emerald-500'
                    : scanStatus === 'not_found'
                      ? 'bg-rose-500'
                      : 'animate-pulse bg-indigo-500'
                }`}
              />
              <span className="font-medium text-slate-700">
                {scanStatus === 'success' ? (
                  <span className="font-bold text-emerald-700">Kode Terdeteksi: {lastScanned}</span>
                ) : scanStatus === 'not_found' ? (
                  <span className="font-bold text-rose-700">Tidak Terdaftar: {lastScanned}</span>
                ) : (
                  <span>Arahkan kamera tepat ke garis barcode...</span>
                )}
              </span>
            </div>

            {/* Continuous Mode Toggle */}
            <label className="flex cursor-pointer items-center gap-1.5 text-slate-600 select-none">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-[11px]">Scan Terus (Multi-Item)</span>
            </label>
          </div>
        </div>

        {/* Manual Barcode & Scanner Input Fallback */}
        <div className="p-5">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Input Barcode / Laser Scanner (Enter)
              </label>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Ketik SKU atau scan dengan alat barcode..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="font-mono text-xs"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-indigo-600 px-4 text-xs hover:bg-indigo-700"
                >
                  Tambah
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Pemindai fisik USB/Bluetooth otomatis membaca ke kolom ini dan menekan Enter.
            </p>
          </form>

          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Selesai & Tutup
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
