import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

interface TrendPoint {
  date: string;
  present: number;
  absent: number;
  rate: number;
}

interface CourseStat {
  code: string;
  name: string;
  rate: number;
  total: number;
}

interface AdminAnalyticsChartsProps {
  trendData: TrendPoint[];
  courseData: CourseStat[];
}

export const AdminAnalyticsCharts: React.FC<AdminAnalyticsChartsProps> = ({
  trendData,
  courseData
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#14213D] dark:text-white">Daily Attendance Rate (%)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Session check-in consistency across recent lecture days
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#2563eb"
                fill="#3b82f6"
                fillOpacity={0.18}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#14213D] dark:text-white">Attendance by Subject (%)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparison of verified presence rates across active subjects
          </p>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={courseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="code" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="rate" fill="#4f46e5" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
