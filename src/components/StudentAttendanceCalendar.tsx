import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { AttendanceRecord } from '../types';

interface StudentAttendanceCalendarProps {
  records: AttendanceRecord[];
}

export const StudentAttendanceCalendar: React.FC<StudentAttendanceCalendarProps> = ({ records }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (records.length > 0 && records[0].date) {
      const [y, m] = records[0].date.split('-').map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOffset = new Date(year, month, 1).getDay();

  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    records.forEach((r) => {
      const list = map.get(r.date) || [];
      list.push(r);
      map.set(r.date, list);
    });
    return map;
  }, [records]);

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDayOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h3 className="text-base font-bold text-[#14213D] dark:text-white">{monthName}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase text-slate-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="h-14 rounded-xl bg-slate-50/40 dark:bg-slate-950/30" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRecs = recordsByDate.get(dateStr) || [];
          const hasPresent = dayRecs.some((r) => r.status === 'present');
          const hasAbsent = dayRecs.some((r) => r.status === 'absent');

          let cls = 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300';
          if (hasPresent && !hasAbsent) {
            cls = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300';
          } else if (hasAbsent && !hasPresent) {
            cls = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300';
          } else if (hasPresent && hasAbsent) {
            cls = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300';
          }

          return (
            <div
              key={dateStr}
              title={dayRecs.map((r) => `${r.className}: ${r.status}`).join('\n') || dateStr}
              className={`h-14 rounded-xl border p-1.5 flex flex-col justify-between text-xs ${cls}`}
            >
              <span className="font-bold">{day}</span>
              {dayRecs.length > 0 && (
                <span className="text-[10px] font-semibold truncate">
                  {dayRecs.length} {dayRecs.length === 1 ? 'class' : 'classes'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
