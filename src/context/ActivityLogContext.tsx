import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ActivityLogEntry } from '../types';
import { INITIAL_ACTIVITY_LOGS } from '../data/mockData';
import { adminApi, getStoredToken } from '../utils/api';

interface ActivityLogContextValue {
  logs: ActivityLogEntry[];
  loading: boolean;
  sourceLabel: string;
  lastSyncedAt: string | null;
  refreshLogs: (options?: { adminScope?: boolean }) => Promise<void>;
  addLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => Promise<void>;
}

const ActivityLogContext = createContext<ActivityLogContextValue | undefined>(undefined);

const formatTimestamp = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const ActivityLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<ActivityLogEntry[]>(INITIAL_ACTIVITY_LOGS);
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState('Database / Audit Feed');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshLogs = useCallback(async (options?: { adminScope?: boolean }) => {
    if (!getStoredToken()) return;
    setLoading(true);
    try {
      const res = options?.adminScope
        ? await adminApi.getAdminActivityLogs()
        : await adminApi.getActivityLogs();
      if (Array.isArray(res.logs)) {
        setLogs(res.logs);
        setSourceLabel(res.source === 'postgresql' ? 'PostgreSQL Database' : 'Live Database Sync');
        setLastSyncedAt(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch {
      // Fallback to local feed if unauthenticated or offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshLogs();
  }, [refreshLogs]);

  const addLog = useCallback((entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: ActivityLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: formatTimestamp()
    };
    setLogs((prev) => [newEntry, ...prev]);

    if (getStoredToken()) {
      adminApi
        .createActivityLog({
          actorName: entry.actorName,
          actorRole: entry.actorRole,
          category: entry.category,
          action: entry.action,
          target: entry.target,
          details: entry.details,
          status: entry.status
        })
        .catch(() => {});
    }
  }, []);

  const clearLogs = useCallback(async () => {
    setLogs([]);
    if (getStoredToken()) {
      try {
        await adminApi.clearActivityLogs();
      } catch {
        // Ignore clear error
      }
    }
  }, []);

  return (
    <ActivityLogContext.Provider
      value={{ logs, loading, sourceLabel, lastSyncedAt, refreshLogs, addLog, clearLogs }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
};

export function useActivityLog(): ActivityLogContextValue {
  const ctx = useContext(ActivityLogContext);
  if (!ctx) throw new Error('useActivityLog must be used within an ActivityLogProvider');
  return ctx;
}
