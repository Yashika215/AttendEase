import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, RefreshCw, Save, Send, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { notificationApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from './EmptyState';
import { AlertLogEntry, NotificationConfig } from '../types';

interface AttendanceAlertsPanelProps {
  role: 'admin' | 'teacher';
}

export const AttendanceAlertsPanel: React.FC<AttendanceAlertsPanelProps> = ({ role }) => {
  const toast = useToast();
  const [config, setConfig] = useState<NotificationConfig>({
    thresholdPercent: 75,
    autoNotify: true,
    smtpConfigured: false
  });
  const [logs, setLogs] = useState<AlertLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cfgRes = await notificationApi.getConfig();
      if (cfgRes.config) setConfig(cfgRes.config);
      if (role === 'admin') {
        const logsRes = await notificationApi.getLogs();
        setLogs(Array.isArray(logsRes.logs) ? logsRes.logs : []);
      } else {
        const myRes = await notificationApi.getMyAlerts();
        setLogs(Array.isArray(myRes.alerts) ? myRes.alerts : []);
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await notificationApi.updateConfig({
        thresholdPercent: Number(config.thresholdPercent),
        autoNotify: config.autoNotify
      });
      if (res.config) setConfig(res.config);
      toast.success('Settings Updated', `Minimum threshold set to ${config.thresholdPercent}%.`);
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update notification config.');
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      const res = await notificationApi.evaluateThreshold(true);
      toast.success(
        'Evaluation Complete',
        `Evaluated students. ${res.alertsSent || 0} alert(s) triggered.`
      );
      loadData();
    } catch (err: any) {
      toast.error('Evaluation Error', err?.message || 'Unable to evaluate thresholds.');
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6">
      {role === 'admin' && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span>Automated Attendance Threshold Settings</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Trigger email notifications automatically whenever student attendance falls below the target threshold.
              </p>
            </div>
            <button
              type="button"
              onClick={handleEvaluate}
              disabled={evaluating}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{evaluating ? 'Evaluating...' : 'Run Threshold Scan'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Minimum Attendance (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={config.thresholdPercent}
                onChange={(e) => setConfig({ ...config, thresholdPercent: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
              />
            </div>

            <label className="flex items-center gap-2.5 py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoNotify}
                onChange={(e) => setConfig({ ...config, autoNotify: e.target.checked })}
                className="rounded text-blue-600"
              />
              <span>Enable Auto Email Alerts</span>
            </label>

            <button
              type="submit"
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Notification Dispatch Log</span>
          </h3>
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            variant="logs"
            compact
            title="No Alert Dispatches Recorded"
            description="Students are currently above the attendance threshold or no scans have triggered an alert yet."
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {logs.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-[#14213D] dark:text-white">
                      {item.studentName} ({item.studentId})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 font-semibold">
                      {item.attendancePercent}% / {item.thresholdPercent}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.studentEmail}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{item.status}</span>
                  <span>·</span>
                  <span>{item.sentAt}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
