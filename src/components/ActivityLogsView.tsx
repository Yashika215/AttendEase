import React, { useState, useMemo } from 'react';
import { ScrollText, RefreshCw, Trash2, Search } from 'lucide-react';
import { useActivityLog } from '../context/ActivityLogContext';
import { EmptyState } from './EmptyState';

interface ActivityLogsViewProps {
  adminScope?: boolean;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ adminScope = false }) => {
  const { logs, loading, sourceLabel, lastSyncedAt, refreshLogs, clearLogs } = useActivityLog();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return logs.filter((item) => {
      if (category !== 'All' && item.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.action.toLowerCase().includes(q) ||
          item.actorName.toLowerCase().includes(q) ||
          item.target.toLowerCase().includes(q) ||
          item.details.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, search, category]);

  const badgeClass = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
      case 'warning':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
      case 'error':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-blue-600" />
            <span>Audit & Activity Logs</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Source: {sourceLabel} {lastSyncedAt ? `· Synced ${lastSyncedAt}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshLogs({ adminScope })}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {adminScope && (
            <button
              type="button"
              onClick={clearLogs}
              className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, or class..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
        >
          {['All', 'Authentication', 'Attendance', 'User Management', 'Course Management', 'System Alerts'].map(
            (cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            )
          )}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          variant="logs"
          compact
          title="No Matching Activity Logs"
          description="Try clearing the search query or switching category filters."
        />
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((item) => (
            <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${badgeClass(item.status)}`}>
                    {item.category}
                  </span>
                  <span className="text-sm font-bold text-[#14213D] dark:text-white">{item.action}</span>
                  <span className="text-xs text-slate-500">· {item.target}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{item.details}</p>
              </div>
              <div className="text-xs text-slate-400 shrink-0 text-right">
                <p className="font-semibold text-slate-600 dark:text-slate-300">{item.actorName}</p>
                <p>{item.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
