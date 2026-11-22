import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  QrCode,
  Calendar as CalendarIcon,
  History,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { User, CourseClass, AttendanceRecord, AlertLogEntry } from '../types';
import { studentApi, notificationApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { DashboardLayout, SidebarCategory } from './DashboardLayout';
import { StudentQrScanner } from './StudentQrScanner';
import { StudentAttendanceCalendar } from './StudentAttendanceCalendar';
import { QrScanOutcome } from './QrScannerUI';
import { EmptyState } from './EmptyState';

interface StudentDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigateHome
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [courses, setCourses] = useState<CourseClass[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertLogEntry[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    presentCount: 0,
    absentCount: 0,
    percentage: 100
  });

  const loadStudentData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesRes, attRes, alertsRes] = await Promise.all([
        studentApi.getCourses().catch(() => ({ classes: [] })),
        studentApi.getAttendance().catch(() => ({ records: [], summary: null })),
        notificationApi.getMyAlerts().catch(() => ({ alerts: [] }))
      ]);
      setCourses(Array.isArray(coursesRes.classes) ? coursesRes.classes : []);
      setRecords(Array.isArray(attRes.records) ? attRes.records : []);
      if (attRes.summary) {
        setSummary(attRes.summary);
      }
      setAlerts(Array.isArray(alertsRes.alerts) ? alertsRes.alerts : []);
    } catch {
      toast.error('Sync Failed', 'Unable to fetch personal attendance records.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStudentData();
  }, [loadStudentData]);

  const handleVerifyCheckIn = async (
    qrPayload: string,
    method?: 'camera' | 'manual'
  ): Promise<QrScanOutcome> => {
    const res = await studentApi.scanQr({
      qrToken: qrPayload,
      studentId: currentUser.studentId || currentUser.rollNo || undefined,
      method
    });
    toast.success('Attendance Marked', res.message || 'Check-in verified.');
    loadStudentData();
    return {
      success: Boolean(res.verified),
      message: res.message || 'QR attendance check-in recorded.',
      className: res.className
    };
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.className.toLowerCase().includes(q) ||
        (r.classCode || '').toLowerCase().includes(q) ||
        r.date.includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const categories: SidebarCategory[] = [
    {
      id: 'student-portal',
      label: 'My Academics',
      defaultOpen: true,
      items: [
        { id: 'overview', label: 'Attendance Summary', icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          id: 'courses',
          label: 'Enrolled Subjects',
          icon: <BookOpen className="w-4 h-4" />,
          badge: courses.length,
          badgeVariant: 'blue'
        },
        { id: 'qr-scan', label: 'Scan Lecture QR', icon: <QrCode className="w-4 h-4" /> },
        { id: 'calendar', label: 'Monthly Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
        { id: 'history', label: 'Check-In History', icon: <History className="w-4 h-4" /> }
      ]
    }
  ];

  const studentIdentifier = currentUser.studentId || currentUser.rollNo || currentUser.uid;
  const belowThreshold = summary.percentage < 75;

  return (
    <DashboardLayout
      currentUser={currentUser}
      portalLabel={currentUser.collegeName || 'JG University · Student Portal'}
      categories={categories}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={onLogout}
      onNavigateHome={onNavigateHome}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search subjects or dates..."
      headerAction={
        <button
          type="button"
          onClick={loadStudentData}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Overall Attendance</p>
              <p
                className={`text-3xl font-extrabold ${
                  belowThreshold ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {summary.percentage}%
              </p>
              <p className="text-xs text-slate-400">
                {summary.presentCount} present out of {summary.total} sessions
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Enrolled Subjects</p>
              <p className="text-3xl font-extrabold text-[#14213D] dark:text-white">{courses.length}</p>
              <p className="text-xs text-slate-400">{currentUser.department || 'Computer Science'}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Student Roll / ID</p>
              <p className="text-xl font-extrabold text-blue-600 font-mono truncate">{studentIdentifier}</p>
              <p className="text-xs text-slate-400">Verified Institutional ID</p>
            </div>
          </div>

          {belowThreshold && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center gap-3 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold">Attendance Below 75% Institutional Threshold</p>
                <p>Attend upcoming lectures regularly to bring your percentage back above 75%.</p>
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#14213D] dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>Personal Attendance Advisories</span>
              </h3>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 text-xs flex items-center justify-between"
                  >
                    <span>
                      Attendance recorded at <strong>{a.attendancePercent}%</strong> (Threshold: {a.thresholdPercent}%)
                    </span>
                    <span className="text-slate-500">{a.sentAt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#14213D] dark:text-white">Recent Check-Ins</h3>
              <button
                type="button"
                onClick={() => setActiveTab('qr-scan')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Scan Class QR</span>
              </button>
            </div>
            {records.length === 0 ? (
              <EmptyState
                variant="attendance"
                compact
                title="No Attendance Recorded Yet"
                description="Scan a lecture QR code during class to record your attendance."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.slice(0, 6).map((r) => (
                  <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[#14213D] dark:text-white">
                        {r.classCode ? `${r.classCode} · ` : ''}
                        {r.className}
                      </p>
                      <p className="text-slate-500">{r.date} · via {r.method.toUpperCase()}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-md font-bold uppercase text-[10px] flex items-center gap-1 ${
                        r.status === 'present'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{r.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                variant="courses"
                title="No Enrolled Subjects Found"
                description="Your enrolled subjects will appear once assigned to a division."
              />
            </div>
          ) : (
            courses.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3"
              >
                <span className="text-xs font-bold text-blue-600 uppercase">{c.code}</span>
                <h3 className="text-base font-bold text-[#14213D] dark:text-white">{c.name}</h3>
                <p className="text-xs text-slate-500">Instructor: {c.teacherName}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{c.schedule} · {c.room}</span>
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'qr-scan' && (
        <StudentQrScanner
          studentId={studentIdentifier}
          studentName={currentUser.name}
          onVerifyCheckIn={handleVerifyCheckIn}
        />
      )}

      {activeTab === 'calendar' && <StudentAttendanceCalendar records={records} />}

      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-[#14213D] dark:text-white">
            Full Attendance History ({filteredRecords.length})
          </h3>
          {filteredRecords.length === 0 ? (
            <EmptyState
              variant="attendance"
              compact
              title="No Records Match"
              description="Try clearing your search filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                  <tr>
                    <th className="py-2.5 pr-4">Date</th>
                    <th className="py-2.5 px-4">Subject</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 pl-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 pr-4 font-mono">{r.date}</td>
                      <td className="py-3 px-4 font-semibold text-[#14213D] dark:text-white">
                        {r.classCode ? `${r.classCode} · ${r.className}` : r.className}
                      </td>
                      <td className="py-3 px-4 uppercase">{r.method}</td>
                      <td className="py-3 pl-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                            r.status === 'present'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};
