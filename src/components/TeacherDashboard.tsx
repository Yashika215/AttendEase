import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  QrCode,
  Bell,
  ScrollText,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Download,
  FileText,
  Clock,
  Users
} from 'lucide-react';
import QRCode from 'qrcode';
import { User, CourseClass, AttendanceRecord } from '../types';
import { teacherApi, notificationApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useActivityLog } from '../context/ActivityLogContext';
import { DashboardLayout, SidebarCategory } from './DashboardLayout';
import { QrScannerUI, QrScanOutcome } from './QrScannerUI';
import { AttendanceAlertsPanel } from './AttendanceAlertsPanel';
import { ActivityLogsView } from './ActivityLogsView';
import { EmptyState } from './EmptyState';
import { exportAttendanceToPdf } from '../utils/pdfExport';

interface TeacherDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigateHome
}) => {
  const toast = useToast();
  const { refreshLogs } = useActivityLog();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Dynamic QR state
  const [qrDuration, setQrDuration] = useState(15);
  const [qrSession, setQrSession] = useState<{
    token: string;
    classCode: string;
    className: string;
    divisionName?: string;
    expiresAt: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [generatingQr, setGeneratingQr] = useState(false);

  const loadClassesAndLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, attRes] = await Promise.all([
        teacherApi.getClasses().catch(() => ({ classes: [] })),
        teacherApi.getAttendanceLogs().catch(() => ({ records: [] }))
      ]);
      const clsList: CourseClass[] = Array.isArray(clsRes.classes) ? clsRes.classes : [];
      setClasses(clsList);
      setAttendanceRecords(Array.isArray(attRes.records) ? attRes.records : []);
      if (clsList.length > 0 && !selectedClassId) {
        setSelectedClassId(clsList[0].id);
      }
    } catch {
      toast.error('Load Failed', 'Could not fetch assigned courses.');
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, toast]);

  const loadStudentsForClass = useCallback(async (clsId: string) => {
    if (!clsId) {
      setStudents([]);
      return;
    }
    try {
      const res = await teacherApi.getStudents({ classId: clsId });
      setStudents(Array.isArray(res.students) ? res.students : []);
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    loadClassesAndLogs();
    refreshLogs();
  }, [loadClassesAndLogs, refreshLogs]);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsForClass(selectedClassId);
    }
  }, [selectedClassId, loadStudentsForClass]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedClassId) || classes[0] || null,
    [classes, selectedClassId]
  );

  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      if (selectedClassId && activeTab === 'attendance' && r.classId !== selectedClassId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.studentName.toLowerCase().includes(q) ||
          r.studentId.toLowerCase().includes(q) ||
          r.className.toLowerCase().includes(q) ||
          (r.classCode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [attendanceRecords, selectedClassId, activeTab, searchQuery]);

  const todayPresentIds = useMemo(() => {
    const map = new Map<string, 'present' | 'absent'>();
    attendanceRecords
      .filter((r) => r.classId === selectedClassId && r.date === attendanceDate)
      .forEach((r) => {
        map.set((r.studentId || '').toUpperCase(), r.status);
      });
    return map;
  }, [attendanceRecords, selectedClassId, attendanceDate]);

  const handleMarkAttendance = async (stu: User, status: 'present' | 'absent') => {
    if (!selectedClass) return;
    try {
      await notificationApi.recordAttendance({
        classId: selectedClass.id,
        studentUid: stu.uid,
        studentId: stu.studentId || stu.rollNo || stu.uid,
        date: attendanceDate,
        status,
        method: 'manual'
      });
      toast.success('Marked', `${stu.name} marked ${status.toUpperCase()} for ${selectedClass.code}.`);
      loadClassesAndLogs();
    } catch (err: any) {
      toast.error('Mark Failed', err?.message || 'Unable to record attendance.');
    }
  };

  const handleGenerateQr = async () => {
    if (!selectedClass) return;
    setGeneratingQr(true);
    try {
      const res = await teacherApi.generateQrSession(selectedClass.code, qrDuration, selectedClass.id);
      setQrSession(res);
      const url = await QRCode.toDataURL(res.token, {
        width: 240,
        margin: 2,
        color: { dark: '#14213D', light: '#FFFFFF' }
      });
      setQrDataUrl(url);
      toast.success('QR Session Active', `Token ${res.token} valid for ${qrDuration} minutes.`);
    } catch (err: any) {
      toast.error('QR Generation Failed', err?.message || 'Could not generate session.');
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleTeacherQrVerify = async (
    qrPayload: string,
    studentId?: string,
    method?: 'camera' | 'manual'
  ): Promise<QrScanOutcome> => {
    const res = await teacherApi.verifyQrScan({
      qrToken: qrPayload,
      studentId,
      method
    });
    loadClassesAndLogs();
    return {
      success: Boolean(res.verified),
      message: res.message || 'Verified check-in.',
      className: res.className
    };
  };

  const handleExportCsv = () => {
    const header = ['Date', 'Student Name', 'Student ID', 'Class Code', 'Subject', 'Method', 'Status'];
    const lines = [
      header.join(','),
      ...filteredRecords.map((r) =>
        [
          r.date,
          `"${r.studentName.replace(/"/g, '""')}"`,
          r.studentId,
          r.classCode || '',
          `"${r.className.replace(/"/g, '""')}"`,
          r.method,
          r.status
        ].join(',')
      )
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categories: SidebarCategory[] = [
    {
      id: 'classroom',
      label: 'Classroom & Teaching',
      defaultOpen: true,
      items: [
        { id: 'overview', label: 'Faculty Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          id: 'classes',
          label: 'Assigned Classes',
          icon: <BookOpen className="w-4 h-4" />,
          badge: classes.length,
          badgeVariant: 'blue'
        },
        { id: 'attendance', label: 'Roll Call & Reports', icon: <ClipboardCheck className="w-4 h-4" /> },
        { id: 'qr-generate', label: 'QR Session Desk', icon: <QrCode className="w-4 h-4" /> }
      ]
    },
    {
      id: 'monitoring',
      label: 'Alerts & Activity',
      defaultOpen: true,
      items: [
        { id: 'alerts', label: 'Low Attendance Alerts', icon: <Bell className="w-4 h-4" /> },
        { id: 'logs', label: 'Session Audit Logs', icon: <ScrollText className="w-4 h-4" /> }
      ]
    }
  ];

  const presentTotal = attendanceRecords.filter((r) => r.status === 'present').length;
  const overallRate =
    attendanceRecords.length > 0 ? Math.round((presentTotal / attendanceRecords.length) * 100) : 100;

  return (
    <DashboardLayout
      currentUser={currentUser}
      portalLabel={currentUser.collegeName || 'JG University · Teacher Hub'}
      categories={categories}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={onLogout}
      onNavigateHome={onNavigateHome}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search student roster or records..."
      headerAction={
        <button
          type="button"
          onClick={loadClassesAndLogs}
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
              <p className="text-xs font-semibold text-slate-500">Assigned Classes</p>
              <p className="text-2xl font-extrabold text-[#14213D] dark:text-white">{classes.length}</p>
              <p className="text-xs text-slate-400">Active semester subjects</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Recorded Check-ins</p>
              <p className="text-2xl font-extrabold text-[#14213D] dark:text-white">{attendanceRecords.length}</p>
              <p className="text-xs text-slate-400">{presentTotal} verified present</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-1">
              <p className="text-xs font-semibold text-slate-500">Average Class Presence</p>
              <p className="text-2xl font-extrabold text-blue-600">{overallRate}%</p>
              <p className="text-xs text-slate-400">Across assigned divisions</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#14213D] dark:text-white">Your Assigned Subjects</h3>
              <button
                type="button"
                onClick={() => setActiveTab('qr-generate')}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>Launch Lecture QR</span>
              </button>
            </div>

            {classes.length === 0 ? (
              <EmptyState
                variant="courses"
                compact
                title="No Subjects Assigned"
                description="Ask your institutional administrator to assign courses to your faculty account."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {classes.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-blue-600 uppercase">{c.code}</span>
                      <h4 className="text-sm font-bold text-[#14213D] dark:text-white">{c.name}</h4>
                      <p className="text-xs text-slate-500">
                        {c.divisionName || 'Division'} · {c.schedule} · {c.room}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setActiveTab('attendance');
                      }}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:border-blue-500 cursor-pointer shrink-0"
                    >
                      Take Roll Call
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classes.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
            >
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase">{c.code}</span>
                <h3 className="text-lg font-bold text-[#14213D] dark:text-white mt-0.5">{c.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{c.divisionName || 'Assigned Division'}</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.schedule}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.totalStudents} enrolled students · {c.room}</span>
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassId(c.id);
                    setActiveTab('attendance');
                  }}
                  className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Roster
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClassId(c.id);
                    setActiveTab('qr-generate');
                  }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Start QR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} · {c.name} ({c.divisionName || 'Division'})
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportAttendanceToPdf(filteredRecords, {
                      title: selectedClass ? `${selectedClass.code} Attendance Report` : 'Faculty Attendance Report',
                      subtitle: selectedClass?.name,
                      generatedBy: currentUser.name,
                      collegeName: currentUser.collegeName || undefined
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-[#14213D] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <EmptyState
                variant="directory"
                compact
                title="No Enrolled Students Found"
                description="Select a class with an active student roster to mark manual attendance."
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((stu) => {
                  const sid = (stu.studentId || stu.rollNo || '').toUpperCase();
                  const currentStatus = todayPresentIds.get(sid);
                  return (
                    <div key={stu.uid} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-[#14213D] dark:text-white">{stu.name}</p>
                        <p className="text-xs text-slate-500">
                          {stu.rollNo || stu.studentId} · {stu.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentStatus && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase mr-2 ${
                              currentStatus === 'present'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {currentStatus}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(stu, 'present')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Present</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMarkAttendance(stu, 'absent')}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Absent</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'qr-generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-[#14213D] dark:text-white">
                Generate Division-Bound Lecture QR
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Only students enrolled in the chosen division can scan this dynamic token.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
              <select
                value={qrDuration}
                onChange={(e) => setQrDuration(Number(e.target.value))}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value={5}>Valid for 5 minutes</option>
                <option value={15}>Valid for 15 minutes</option>
                <option value={30}>Valid for 30 minutes</option>
                <option value={60}>Valid for 60 minutes</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGenerateQr}
              disabled={generatingQr || !selectedClass}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs cursor-pointer disabled:opacity-50"
            >
              {generatingQr ? 'Generating Token...' : 'Generate Active QR Code'}
            </button>

            {qrSession && qrDataUrl && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col items-center text-center space-y-3">
                <img src={qrDataUrl} alt="Lecture QR Code" className="w-52 h-52 rounded-xl bg-white p-2 shadow-md" />
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Token: {qrSession.token}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {qrSession.classCode} · {qrSession.className} ({qrSession.divisionName || 'Division'})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Expires at {new Date(qrSession.expiresAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <QrScannerUI
            requireStudentId
            title="Faculty Desk Check-In Scanner"
            subtitle="Scan a student QR badge or verify a manual check-in token for your assigned subject."
            onScanVerify={handleTeacherQrVerify}
          />
        </div>
      )}

      {activeTab === 'alerts' && <AttendanceAlertsPanel role="teacher" />}
      {activeTab === 'logs' && <ActivityLogsView />}
    </DashboardLayout>
  );
};
