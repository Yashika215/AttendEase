import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  QrCode,
  Send
} from 'lucide-react';
import jsQR from 'jsqr';
import {
  requestCameraStream,
  stopCameraStream
} from '../utils/CameraPermissionManager';

export interface QrScanOutcome {
  success: boolean;
  message: string;
  studentName?: string;
  studentId?: string;
  className?: string;
  time?: string;
}

interface QrScannerUIProps {
  onScanVerify: (qrPayload: string, studentId?: string, method?: 'camera' | 'manual') => Promise<QrScanOutcome>;
  defaultStudentId?: string;
  requireStudentId?: boolean;
  title?: string;
  subtitle?: string;
}

export const QrScannerUI: React.FC<QrScannerUIProps> = ({
  onScanVerify,
  defaultStudentId = '',
  requireStudentId = false,
  title = 'Live QR Attendance Scanner',
  subtitle = 'Scan a dynamic QR session token using your device camera or submit a token manually.'
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<QrScanOutcome | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleDetectedToken = async (raw: string, method: 'camera' | 'manual') => {
    setSubmitting(true);
    setOutcome(null);
    try {
      const res = await onScanVerify(raw, studentId.trim() || undefined, method);
      setOutcome(res);
      if (res.success) {
        stopCamera();
      }
    } catch (err: any) {
      setOutcome({
        success: false,
        message: err?.message || 'Verification failed.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setOutcome(null);
    try {
      const stream = await requestCameraStream();
      streamRef.current = stream;
      setCameraActive(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const scanTick = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || !streamRef.current) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const decoded = jsQR(imgData.data, imgData.width, imgData.height);
              if (decoded?.data) {
                handleDetectedToken(decoded.data, 'camera');
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanTick);
        };
        rafRef.current = requestAnimationFrame(scanTick);
      });
    } catch (err: any) {
      setCameraError(err?.message || 'Unable to access camera.');
      stopCamera();
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await handleDetectedToken(manualToken.trim(), 'manual');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={cameraActive ? stopCamera : startCamera}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors ${
            cameraActive
              ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          {cameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          <span>{cameraActive ? 'Stop Camera' : 'Start Camera'}</span>
        </button>
      </div>

      {cameraError && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
          {cameraError}
        </div>
      )}

      {cameraActive && (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-72 mx-auto border border-slate-800">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-44 h-44 border-2 border-cyan-400 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]" />
          </div>
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {requireStudentId && (
          <div className="sm:col-span-4">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Student ID (e.g. ST-2026-8492)"
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
          </div>
        )}
        <div className={requireStudentId ? 'sm:col-span-6' : 'sm:col-span-9'}>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste QR token (e.g. AE-CS-401-XXXXXX)"
            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
          />
        </div>
        <div className={requireStudentId ? 'sm:col-span-2' : 'sm:col-span-3'}>
          <button
            type="submit"
            disabled={submitting || !manualToken.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Verify</span>
          </button>
        </div>
      </form>

      {outcome && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-2.5 ${
            outcome.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
          }`}
        >
          {outcome.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">{outcome.success ? 'Verified' : 'Verification Error'}</p>
            <p className="mt-0.5">{outcome.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
