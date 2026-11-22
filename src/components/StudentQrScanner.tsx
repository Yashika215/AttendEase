import React, { useState, useEffect } from 'react';
import { QrCode, Camera, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { QrScannerUI, QrScanOutcome } from './QrScannerUI';
import { queryCameraPermission, CameraPermissionStatus } from '../utils/CameraPermissionManager';

interface StudentQrScannerProps {
  studentId: string;
  studentName: string;
  onVerifyCheckIn: (qrPayload: string, method?: 'camera' | 'manual') => Promise<QrScanOutcome>;
}

export const StudentQrScanner: React.FC<StudentQrScannerProps> = ({
  studentId,
  studentName,
  onVerifyCheckIn
}) => {
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('prompt');

  useEffect(() => {
    queryCameraPermission().then(setPermissionStatus).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-[#14213D] to-blue-800 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Authenticated Check-In · {studentId}</span>
          </div>
          <h3 className="text-xl font-bold">{studentName}</h3>
          <p className="text-xs text-blue-100/80">
            {permissionStatus === 'granted'
              ? 'Camera permission is ready. Point your camera at the instructor QR code.'
              : 'Accept the browser camera permission prompt to begin live QR code scanning.'}
          </p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-semibold flex items-center gap-2 self-start">
          <Camera className="w-4 h-4 text-cyan-300" />
          <span className="capitalize">Camera: {permissionStatus}</span>
        </div>
      </div>

      <QrScannerUI
        title="Scan Lecture QR Code"
        subtitle="Allow camera permission when prompted. Hold the QR code inside the cyan frame for automatic detection—your camera will stop automatically once attendance is verified on the server."
        defaultStudentId={studentId}
        onScanVerify={(payload, _sid, method) => onVerifyCheckIn(payload, method)}
      />

      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 grid sm:grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>Duplicate check-ins for the same lecture and date are automatically blocked.</span>
        </div>
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span>QR tokens are verified against your enrolled course division on the backend.</span>
        </div>
      </div>
    </div>
  );
};
