import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  QrCode,
  Bell,
  ScrollText,
  FileSpreadsheet,
  MessageSquare,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  FileText,
  ShieldAlert,
  RefreshCw,
  Edit3,
  UserPlus,
  Building2,
  Layers
} from 'lucide-react';
import {
  User,
  DirectoryMember,
  AcademicYear,
  Course,
  YearSemester,
  Division,
  CourseClass,
  AttendanceRecord,
  Enquiry
} from '../types';
import { adminApi, teacherApi, notificationApi, enquiryApi } from '../utils/api';
import { useToast } from '../context/ToastContext';
import { useActivityLog } from '../context/ActivityLogContext';
import { DashboardLayout, SidebarCategory } from './DashboardLayout';
import { AdminAnalyticsCharts } from './AdminAnalyticsCharts';
import { BulkStudentUpload } from './BulkStudentUpload';
import { AttendanceAlertsPanel } from './AttendanceAlertsPanel';
import { ActivityLogsView } from './ActivityLogsView';
import { QrScannerUI, QrScanOutcome } from './QrScannerUI';
import { EmptyState } from './EmptyState';
import { UserAvatar } from './UserAvatar';
import { exportAttendanceToPdf } from '../utils/pdfExport';

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigateHome: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  onNavigateHome
}) => {
  const toast = useToast();
  const { refreshLogs } = useActivityLog();

  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<DirectoryMember[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<YearSemester[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);

  // Filters
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userCourseFilter, setUserCourseFilter] = useState('all');
  const [attCourseFilter, setAttCourseFilter] = useState('all');
  const [attDivisionFilter, setAttDivisionFilter] = useState('all');
  const [attStatusFilter, setAttStatusFilter] = useState('all');
  const [attStartDate, setAttStartDate] = useState('');
  const [attEndDate, setAttEndDate] = useState('');

  // Quick creation forms
  const [newYearName, setNewYearName] = useState('2026-2027');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDept, setNewCourseDept] = useState('');
  const [newSemAyId, setNewSemAyId] = useState('');
  const [newSemCourseId, setNewSemCourseId] = useState('');
  const [newSemName, setNewSemName] = useState('');
  const [newDivCourseId, setNewDivCourseId] = useState('');
  const [newDivSemId, setNewDivSemId] = useState('');
  const [newDivCode, setNewDivCode] = useState('');
  const [newDivBatch, setNewDivBatch] = useState('');
  const [newDivRoom, setNewDivRoom] = useState('');

  // New class form
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [classTeacherId, setClassTeacherId] = useState('');
  const [classDivisionId, setClassDivisionId] = useState('');
  const [classSchedule, setClassSchedule] = useState('Mon/Wed/Fri · 10:00 AM');
  const [classRoom, setClassRoom] = useState('Lab 301');

  // New teacher form
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherDept, setTeacherDept] = useState('Computer Science & Engineering');

  // New / Edit student modal state
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<DirectoryMember | null>(null);
  const [stuName, setStuName] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuPhone, setStuPhone] = useState('');
  const [stuRoll, setStuRoll] = useState('');
  const [stuDivisionId, setStuDivisionId] = useState('');

  // Manual attendance quick mark
  const [markClassId, setMarkClassId] = useState('');
  const [markStudentId, setMarkStudentId] = useState('');
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [markStatus, setMarkStatus] = useState<'present' | 'absent'>('present');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsRes, structRes, usersRes, attRes, enqRes] = await Promise.all([
        adminApi.getAnalytics().catch(() => null),
        adminApi.getAcademicStructure().catch(() => null),
        adminApi.listUsers().catch(() => ({ users: [] })),
        adminApi.getAttendance().catch(() => ({ records: [] })),
        enquiryApi.list().catch(() => ({ enquiries: [] }))
      ]);

      if (analyticsRes) setAnalytics(analyticsRes);
      if (structRes) {
        const ays = Array.isArray(structRes.academicYears) ? structRes.academicYears : [];
        const crs = Array.isArray(structRes.courses) ? structRes.courses : [];
        const sems = Array.isArray(structRes.yearSemesters) ? structRes.yearSemesters : [];
        const divs = Array.isArray(structRes.divisions) ? structRes.divisions : [];
        const cls = Array.isArray(structRes.classes) ? structRes.classes : [];
        const tchs = Array.isArray(structRes.teachers) ? structRes.teachers : [];

        setAcademicYears(ays);
        setCourses(crs);
        setSemesters(sems);
        setDivisions(divs);
        setClasses(cls);
        setTeachers(tchs);

        if (!newSemAyId && ays[0]?.id) setNewSemAyId(ays[0].id);
        if (!newSemCourseId && crs[0]?.id) setNewSemCourseId(crs[0].id);
        if (!newDivCourseId && crs[0]?.id) setNewDivCourseId(crs[0].id);
        if (!newDivSemId && sems[0]?.id) setNewDivSemId(sems[0].id);
        if (!classTeacherId && tchs[0]?.uid) setClassTeacherId(tchs[0].uid);
        if (!classDivisionId && divs[0]?.id) setClassDivisionId(divs[0].id);
        if (!stuDivisionId && divs[0]?.id) setStuDivisionId(divs[0].id);
        if (!markClassId && cls[0]?.id) setMarkClassId(cls[0].id);
      }

      setUsers(Array.isArray(usersRes?.users) ? usersRes.users : []);
      setAttendanceRecords(Array.isArray(attRes?.records) ? attRes.records : []);
      setEnquiries(Array.isArray(enqRes?.enquiries) ? enqRes.enquiries : []);
    } catch {
      toast.error('Load Error', 'Some administrative metrics could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
    refreshLogs({ adminScope: true });
  }, [loadAll, refreshLogs]);

  const pendingTeachers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === 'teacher' &&
          (u.approvalStatus === 'PENDING' || u.status === 'Pending')
      ),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
      if (userCourseFilter !== 'all' && u.courseId !== userCourseFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.studentId || '').toLowerCase().includes(q) ||
          (u.rollNo || '').toLowerCase().includes(q) ||
          (u.department || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, userRoleFilter, userCourseFilter, searchQuery]);

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((rec) => {
      if (attDivisionFilter !== 'all' && rec.divisionId !== attDivisionFilter) return false;
      if (attStatusFilter !== 'all' && rec.status !== attStatusFilter) return false;
      if (attStartDate && rec.date < attStartDate) return false;
      if (attEndDate && rec.date > attEndDate) return false;
      if (attCourseFilter !== 'all') {
        const cls = classes.find((c) => c.id === rec.classId);
        if (cls && cls.courseId !== attCourseFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          rec.studentName.toLowerCase().includes(q) ||
          rec.studentId.toLowerCase().includes(q) ||
          rec.className.toLowerCase().includes(q) ||
          (rec.classCode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    attendanceRecords,
    attDivisionFilter,
    attStatusFilter,
    attStartDate,
    attEndDate,
    attCourseFilter,
    classes,
    searchQuery
  ]);

  const chartData = useMemo(() => {
    const byDate = new Map<string, { present: number; absent: number }>();
    attendanceRecords.forEach((r) => {
      const entry = byDate.get(r.date) || { present: 0, absent: 0 };
      if (r.status === 'present') entry.present += 1;
      else entry.absent += 1;
      byDate.set(r.date, entry);
    });

    const trendData = Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([date, val]) => {
        const total = val.present + val.absent;
        return {
          date: date.slice(5),
          present: val.present,
          absent: val.absent,
          rate: total > 0 ? Math.round((val.present / total) * 100) : 0
        };
      });

    const courseData = Array.isArray(analytics?.subjectBreakdown)
      ? analytics.subjectBreakdown.slice(0, 8).map((s: any) => ({
          code: s.code,
          name: s.name,
          rate: Number(s.attendanceRate || 0),
          total: Number(s.totalRecords || 0)
        }))
      : [];

    return { trendData, courseData };
  }, [attendanceRecords, analytics]);

  const categories: SidebarCategory[] = [
    {
      id: 'analytics',
      label: 'Institution Insights',
      defaultOpen: true,
      items: [
        { id: 'overview', label: 'Overview & KPIs', icon: <LayoutDashboard className="w-4 h-4" /> },
        {
          id: 'attendance',
          label: 'Attendance Ledger',
          icon: <ClipboardCheck className="w-4 h-4" />,
          badge: attendanceRecords.length,
          badgeVariant: 'blue'
        }
      ]
    },
    {
      id: 'people',
      label: 'People & Academics',
      defaultOpen: true,
      items: [
        {
          id: 'users',
          label: 'Users & Approvals',
          icon: <Users className="w-4 h-4" />,
          badge: pendingTeachers.length > 0 ? pendingTeachers.length : undefined,
          badgeVariant: 'amber'
        },
        { id: 'academics', label: 'Academic Hierarchy', icon: <Building2 className="w-4 h-4" /> },
        { id: 'classes', label: 'Subjects & Faculty', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'bulk-upload', label: 'Bulk Student Import', icon: <FileSpreadsheet className="w-4 h-4" /> }
      ]
    },
    {
      id: 'ops',
      label: 'Operations & Audit',
      defaultOpen: true,
      items: [
        { id: 'qr-verify', label: 'QR Attendance Verify', icon: <QrCode className="w-4 h-4" /> },
        { id: 'alerts', label: 'Threshold Alerts', icon: <Bell className="w-4 h-4" /> },
        {
          id: 'enquiries',
          label: 'Enquiries',
          icon: <MessageSquare className="w-4 h-4" />,
          badge: enquiries.filter((e) => e.status === 'New').length || undefined,
          badgeVariant: 'emerald'
        },
        { id: 'logs', label: 'Audit Logs', icon: <ScrollText className="w-4 h-4" /> }
      ]
    }
  ];

  // Handlers
  const handleApproveTeacher = async (uid: string) => {
    try {
      const res = await adminApi.approveTeacher(uid);
      toast.success('Teacher Approved', res.message || 'Faculty access enabled.');
      loadAll();
    } catch (err: any) {
      toast.error('Approval Failed', err?.message || 'Unable to approve teacher.');
    }
  };

  const handleRejectTeacher = async (uid: string) => {
    try {
      const res = await adminApi.rejectTeacher(uid);
      toast.info('Request Declined', res.message || 'Faculty request declined.');
      loadAll();
    } catch (err: any) {
      toast.error('Action Failed', err?.message || 'Unable to reject teacher.');
    }
  };

  const handlePromoteAdmin = async (uid: string) => {
    try {
      const res = await adminApi.promoteToAdmin(uid);
      toast.success('Role Updated', res.message || 'User promoted to Administrator.');
      loadAll();
    } catch (err: any) {
      toast.error('Promotion Failed', err?.message || 'Unable to promote user.');
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim() || !teacherEmail.trim()) return;
    try {
      await adminApi.createTeacher({
        fullName: teacherName.trim(),
        email: teacherEmail.trim(),
        phoneNumber: teacherPhone.trim(),
        department: teacherDept.trim()
      });
      toast.success('Faculty Created', `${teacherName} added and approved.`);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPhone('');
      loadAll();
    } catch (err: any) {
      toast.error('Create Failed', err?.message || 'Could not add teacher.');
    }
  };

  const openAddStudent = () => {
    setEditingStudent(null);
    setStuName('');
    setStuEmail('');
    setStuPhone('');
    setStuRoll('');
    setStuDivisionId(divisions[0]?.id || '');
    setStudentModalOpen(true);
  };

  const openEditStudent = (stu: DirectoryMember) => {
    setEditingStudent(stu);
    setStuName(stu.name);
    setStuEmail(stu.email);
    setStuPhone('');
    setStuRoll(stu.rollNo || stu.studentId || '');
    setStuDivisionId(stu.divisionId || divisions[0]?.id || '');
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        await adminApi.updateStudent(editingStudent.uid || editingStudent.id, {
          name: stuName.trim(),
          email: stuEmail.trim(),
          phoneNumber: stuPhone.trim() || undefined,
          rollNumber: stuRoll.trim(),
          studentId: stuRoll.trim(),
          divisionId: stuDivisionId
        });
        toast.success('Student Updated', `${stuName} updated successfully.`);
      } else {
        await adminApi.createStudent({
          name: stuName.trim(),
          email: stuEmail.trim(),
          phoneNumber: stuPhone.trim(),
          rollNumber: stuRoll.trim(),
          studentId: stuRoll.trim(),
          divisionId: stuDivisionId
        });
        toast.success('Student Added', `${stuName} enrolled in division.`);
      }
      setStudentModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error('Save Failed', err?.message || 'Could not save student.');
    }
  };

  const handleDeleteStudent = async (stu: DirectoryMember) => {
    try {
      await adminApi.deleteStudent(stu.uid || stu.id);
      toast.warning('Student Removed', `${stu.name} removed from directory.`);
      loadAll();
    } catch (err: any) {
      toast.error('Delete Failed', err?.message || 'Could not remove student.');
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    try {
      await adminApi.createAcademicYear(newYearName.trim());
      toast.success('Academic Year Added', newYearName.trim());
      setNewYearName('');
      loadAll();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Could not create academic year.');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newCourseName.trim()) return;
    try {
      await adminApi.createCourse({
        code: newCourseCode.trim().toUpperCase(),
        name: newCourseName.trim(),
        department: newCourseDept.trim() || newCourseName.trim()
      });
      toast.success('Course Created', `${newCourseCode.toUpperCase()} · ${newCourseName}`);
      setNewCourseCode('');
      setNewCourseName('');
      setNewCourseDept('');
      loadAll();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Could not create course.');
    }
  };

  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemAyId || !newSemCourseId || !newSemName.trim()) return;
    try {
      await adminApi.createSemester({
        academicYearId: newSemAyId,
        courseId: newSemCourseId,
        name: newSemName.trim()
      });
      toast.success('Semester Added', newSemName.trim());
      setNewSemName('');
      loadAll();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Could not create semester.');
    }
  };

  const handleCreateDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    const sem = semesters.find((s) => s.id === newDivSemId);
    if (!newDivSemId || !newDivCode.trim()) return;
    try {
      await adminApi.createDivision({
        academicYearId: (sem as any)?.academicYearId || academicYears[0]?.id,
        courseId: sem?.courseId || newDivCourseId || courses[0]?.id,
        yearSemesterId: newDivSemId,
        code: newDivCode.trim().toUpperCase(),
        name: `Division ${newDivCode.trim().toUpperCase()}`,
        batchName: newDivBatch.trim() || `Batch ${newDivCode.trim().toUpperCase()}1`,
        room: newDivRoom.trim() || 'Main Hall'
      });
      toast.success('Division Created', `Division ${newDivCode.toUpperCase()} ready.`);
      setNewDivCode('');
      setNewDivBatch('');
      setNewDivRoom('');
      loadAll();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Could not create division.');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim() || !className.trim() || !classTeacherId || !classDivisionId) return;
    try {
      await adminApi.createClass({
        code: classCode.trim().toUpperCase(),
        name: className.trim(),
        teacherId: classTeacherId,
        divisionId: classDivisionId,
        schedule: classSchedule.trim(),
        room: classRoom.trim()
      });
      toast.success('Subject Assigned', `${classCode.toUpperCase()} assigned to faculty.`);
      setClassCode('');
      setClassName('');
      loadAll();
    } catch (err: any) {
      toast.error('Error', err?.message || 'Could not assign subject.');
    }
  };

  const handleManualAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markClassId || !markStudentId.trim()) return;
    try {
      await notificationApi.recordAttendance({
        classId: markClassId,
        studentId: markStudentId.trim(),
        date: markDate,
        status: markStatus,
        method: 'manual'
      });
      toast.success('Attendance Recorded', `Marked ${markStudentId} as ${markStatus}.`);
      setMarkStudentId('');
      loadAll();
    } catch (err: any) {
      toast.error('Record Failed', err?.message || 'Unable to mark attendance.');
    }
  };

  const handleQrVerify = async (qrPayload: string, studentId?: string, method?: 'camera' | 'manual'): Promise<QrScanOutcome> => {
    const res = await teacherApi.verifyQrScan({
      qrToken: qrPayload,
      studentId,
      method
    });
    loadAll();
    return {
      success: Boolean(res.verified),
      message: res.message || 'Check-in verified.',
      className: res.className
    };
  };

  const handleExportCsv = () => {
    const header = ['Date', 'Student Name', 'Student ID', 'Class Code', 'Subject', 'Method', 'Status'];
    const lines = [
      header.join(','),
      ...filteredAttendance.map((r) =>
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
    a.download = `attendease-institutional-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV Downloaded', `Exported ${filteredAttendance.length} record(s).`);
  };

  const handleUpdateEnquiry = async (id: string, status: string) => {
    try {
      await enquiryApi.updateStatus(id, status);
      toast.success('Enquiry Updated', `Status changed to ${status}.`);
      loadAll();
    } catch (err: any) {
      toast.error('Update Failed', err?.message || 'Could not update enquiry.');
    }
  };

  return (
    <DashboardLayout
      currentUser={currentUser}
      portalLabel={currentUser.collegeName || 'JG University · Admin Console'}
      categories={categories}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onLogout={onLogout}
      onNavigateHome={onNavigateHome}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search students, faculty, roll numbers..."
      headerAction={
        <button
          type="button"
          onClick={loadAll}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      }
    >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Students',
                value: analytics?.totalStudents ?? users.filter((u) => u.role === 'student').length,
                sub: `${analytics?.totalDivisions ?? divisions.length} active divisions`,
                icon: <GraduationCap className="w-5 h-5 text-blue-600" />
              },
              {
                label: 'Verified Faculty',
                value: analytics?.totalTeachers ?? teachers.length,
                sub: `${pendingTeachers.length} pending approval`,
                icon: <Users className="w-5 h-5 text-indigo-600" />
              },
              {
                label: 'Active Subjects',
                value: analytics?.totalClasses ?? classes.length,
                sub: `${analytics?.totalCourses ?? courses.length} degree programs`,
                icon: <BookOpen className="w-5 h-5 text-sky-600" />
              },
              {
                label: 'Attendance Rate',
                value: `${analytics?.overallRate ?? 0}%`,
                sub: `${analytics?.presentCount ?? 0} present / ${analytics?.totalRecords ?? 0} total`,
                icon: <ClipboardCheck className="w-5 h-5 text-emerald-600" />
              }
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {card.label}
                  </span>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800">{card.icon}</div>
                </div>
                <p className="text-2xl font-extrabold text-[#14213D] dark:text-white">{card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.sub}</p>
              </div>
            ))}
          </div>

          {pendingTeachers.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {pendingTeachers.length} Faculty Registration(s) Awaiting Approval
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Review pending instructor credentials before granting classroom QR & grading access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0"
              >
                Review Requests
              </button>
            </div>
          )}

          <AdminAnalyticsCharts trendData={chartData.trendData} courseData={chartData.courseData} />

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-[#14213D] dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>Division & Subject Performance Breakdown</span>
            </h3>
            {Array.isArray(analytics?.divisionBreakdown) && analytics.divisionBreakdown.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 pr-4">Course & Division</th>
                      <th className="py-2.5 px-4">Semester</th>
                      <th className="py-2.5 px-4">Students</th>
                      <th className="py-2.5 px-4">Subjects</th>
                      <th className="py-2.5 pl-4 text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {analytics.divisionBreakdown.map((d: any) => (
                      <tr key={d.divisionId}>
                        <td className="py-3 pr-4 font-semibold text-[#14213D] dark:text-white">
                          {d.courseCode} · {d.divisionName}
                        </td>
                        <td className="py-3 px-4 text-slate-500">{d.yearSemesterName}</td>
                        <td className="py-3 px-4">{d.studentsCount}</td>
                        <td className="py-3 px-4">{d.subjectsCount}</td>
                        <td className="py-3 pl-4 text-right font-bold text-blue-600">
                          {d.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                variant="attendance"
                compact
                title="No Division Analytics Yet"
                description="Add courses, divisions, and attendance sessions to view aggregated analytics."
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          {pendingTeachers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 p-6 space-y-4">
              <h3 className="text-base font-bold text-[#14213D] dark:text-white">
                Pending Faculty Approvals ({pendingTeachers.length})
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingTeachers.map((t) => (
                  <div key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-[#14213D] dark:text-white">{t.name}</p>
                      <p className="text-xs text-slate-500">
                        {t.email} · {t.department || 'Faculty'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveTeacher(t.uid || t.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectTeacher(t.uid || t.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form
              onSubmit={handleCreateTeacher}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
            >
              <h3 className="text-sm font-bold text-[#14213D] dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                <span>Add Faculty Member</span>
              </h3>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Full Name (e.g. Prof. Mehta)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="email"
                required
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="faculty@jguni.edu"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="tel"
                value={teacherPhone}
                onChange={(e) => setTeacherPhone(e.target.value)}
                placeholder="Phone Number"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="text"
                value={teacherDept}
                onChange={(e) => setTeacherDept(e.target.value)}
                placeholder="Department"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Add Approved Teacher
              </button>
            </form>

            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-[#14213D] dark:text-white">
                  Institutional Directory ({filteredUsers.length})
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Teachers</option>
                    <option value="admin">Admins</option>
                  </select>
                  <select
                    value={userCourseFilter}
                    onChange={(e) => setUserCourseFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openAddStudent}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Enroll Student</span>
                  </button>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <EmptyState
                  variant="directory"
                  compact
                  title="No Users Match Filters"
                  description="Try adjusting your search or role filters."
                />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[460px] overflow-y-auto">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={u.name} src={u.avatar} role={u.role} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#14213D] dark:text-white truncate">
                              {u.name}
                            </p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 uppercase text-slate-600 dark:text-slate-300">
                              {u.role}
                            </span>
                            {(u.rollNo || u.studentId) && (
                              <span className="text-[11px] font-mono text-blue-600">
                                {u.rollNo || u.studentId}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {u.email} · {u.department || 'Academic'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {u.role === 'teacher' && (
                          <button
                            type="button"
                            onClick={() => handlePromoteAdmin(u.uid || u.id)}
                            className="px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 text-[11px] font-semibold hover:bg-blue-50 cursor-pointer"
                          >
                            Promote Admin
                          </button>
                        )}
                        {u.role === 'student' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditStudent(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                              title="Edit student"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Remove student"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'academics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">Academic Years</h3>
            <form onSubmit={handleCreateYear} className="flex gap-2">
              <input
                type="text"
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                placeholder="e.g. 2026-2027"
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer">
                Add
              </button>
            </form>
            <div className="space-y-2">
              {academicYears.map((ay) => (
                <div key={ay.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <span className="font-bold">{ay.name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.deleteAcademicYear(ay.id);
                      loadAll();
                    }}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">Degree Courses & Programs</h3>
            <form onSubmit={handleCreateCourse} className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                placeholder="Code (e.g. BCA)"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="text"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Program Name"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer">
                Add Course
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {courses.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <span>
                    <strong className="text-blue-600">{c.code}</strong> · {c.name}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.deleteCourse(c.id);
                      loadAll();
                    }}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">Year / Semesters</h3>
            <form onSubmit={handleCreateSemester} className="grid grid-cols-3 gap-2">
              <select
                value={newSemCourseId}
                onChange={(e) => setNewSemCourseId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newSemName}
                onChange={(e) => setNewSemName(e.target.value)}
                placeholder="e.g. Semester 5"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer">
                Add Semester
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {semesters.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <span className="font-semibold">{s.name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.deleteSemester(s.id);
                      loadAll();
                    }}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">Divisions & Batches</h3>
            <form onSubmit={handleCreateDivision} className="grid grid-cols-2 gap-2">
              <select
                value={newDivSemId}
                onChange={(e) => setNewDivSemId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newDivCode}
                onChange={(e) => setNewDivCode(e.target.value)}
                placeholder="Division Code (e.g. C)"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="text"
                value={newDivBatch}
                onChange={(e) => setNewDivBatch(e.target.value)}
                placeholder="Batch (optional)"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer">
                Add Division
              </button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {divisions.map((d) => (
                <div key={d.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-xs">
                  <span>
                    <strong>{d.name}</strong> {d.batchName ? `(${d.batchName})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.deleteDivision(d.id);
                      loadAll();
                    }}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateClass}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">
              Assign Subject & Faculty to Division
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={classCode}
                onChange={(e) => setClassCode(e.target.value)}
                placeholder="Subject Code (e.g. CS-505)"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <input
                type="text"
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Subject Name"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <select
                value={classTeacherId}
                onChange={(e) => setClassTeacherId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {teachers.map((t) => (
                  <option key={t.uid} value={t.uid}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={classDivisionId}
                onChange={(e) => setClassDivisionId(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {divisions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={classSchedule}
                onChange={(e) => setClassSchedule(e.target.value)}
                placeholder="Schedule"
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Create Subject Class
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-blue-600 uppercase">{c.code}</span>
                    <h4 className="text-sm font-bold text-[#14213D] dark:text-white">{c.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await adminApi.deleteClass(c.id);
                      toast.warning('Removed', `${c.code} deleted.`);
                      loadAll();
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Delete subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Faculty: <strong className="text-slate-700 dark:text-slate-200">{c.teacherName}</strong></p>
                  <p>Division: {c.divisionName || 'General'} · {c.schedule}</p>
                  <p>Room: {c.room} · Enrolled: {c.totalStudents}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <form
            onSubmit={handleManualAttendance}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject Class</label>
              <select
                value={markClassId}
                onChange={(e) => setMarkClassId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Student Roll / ID</label>
              <input
                type="text"
                required
                value={markStudentId}
                onChange={(e) => setMarkStudentId(e.target.value)}
                placeholder="e.g. ST-2026-8492"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date</label>
              <input
                type="date"
                value={markDate}
                onChange={(e) => setMarkDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
              <select
                value={markStatus}
                onChange={(e) => setMarkStatus(e.target.value as 'present' | 'absent')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Record Entry
            </button>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={attCourseFilter}
                  onChange={(e) => setAttCourseFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <select
                  value={attDivisionFilter}
                  onChange={(e) => setAttDivisionFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="all">All Divisions</option>
                  {divisions.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={attStatusFilter}
                  onChange={(e) => setAttStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                </select>
                <input
                  type="date"
                  value={attStartDate}
                  onChange={(e) => setAttStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
                <input
                  type="date"
                  value={attEndDate}
                  onChange={(e) => setAttEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportAttendanceToPdf(filteredAttendance, {
                      title: 'Institutional Attendance Report',
                      subtitle: 'All Filtered Sessions',
                      generatedBy: currentUser.name,
                      collegeName: currentUser.collegeName || undefined
                    })
                  }
                  className="px-3 py-2 rounded-xl bg-[#14213D] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {filteredAttendance.length === 0 ? (
              <EmptyState
                variant="attendance"
                compact
                title="No Attendance Records Found"
                description="Try clearing date or division filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                    <tr>
                      <th className="py-2.5 pr-3">Date</th>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 pl-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAttendance.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 pr-3 font-mono">{r.date}</td>
                        <td className="py-3 px-3 font-semibold text-[#14213D] dark:text-white">
                          {r.studentName} <span className="text-slate-400">({r.studentId})</span>
                        </td>
                        <td className="py-3 px-3">
                          {r.classCode ? `${r.classCode} · ${r.className}` : r.className}
                        </td>
                        <td className="py-3 px-3 uppercase">{r.method}</td>
                        <td className="py-3 pl-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                              r.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
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
        </div>
      )}

      {activeTab === 'bulk-upload' && (
        <BulkStudentUpload
          academicYears={academicYears}
          courses={courses}
          semesters={semesters}
          divisions={divisions}
          onImportComplete={loadAll}
        />
      )}

      {activeTab === 'qr-verify' && (
        <QrScannerUI
          requireStudentId
          title="Administrator QR Session Verification"
          subtitle="Scan or paste an active class QR token alongside a Student ID to verify check-in."
          onScanVerify={handleQrVerify}
        />
      )}

      {activeTab === 'alerts' && <AttendanceAlertsPanel role="admin" />}

      {activeTab === 'enquiries' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-base font-bold text-[#14213D] dark:text-white">
            Institutional Enquiries ({enquiries.length})
          </h3>
          {enquiries.length === 0 ? (
            <EmptyState
              variant="logs"
              compact
              title="No Enquiries Submitted"
              description="Messages from prospective institutions and students will appear here."
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {enquiries.map((enq) => (
                <div key={enq.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[#14213D] dark:text-white">
                      {enq.subject} · <span className="text-blue-600">{enq.fullName}</span>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300">{enq.message}</p>
                    <p className="text-[11px] text-slate-400">
                      {enq.email} · {enq.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={enq.status}
                      onChange={(e) => handleUpdateEnquiry(enq.id, e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    >
                      <option value="New">New</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        await enquiryApi.delete(enq.id);
                        loadAll();
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'logs' && <ActivityLogsView adminScope />}

      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <form
            onSubmit={handleSaveStudent}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-[#14213D] dark:text-white">
              {editingStudent ? 'Edit Student Record' : 'Enroll New Student'}
            </h3>
            <input
              type="text"
              required
              value={stuName}
              onChange={(e) => setStuName(e.target.value)}
              placeholder="Student Full Name"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
            <input
              type="email"
              required
              value={stuEmail}
              onChange={(e) => setStuEmail(e.target.value)}
              placeholder="student@jguni.edu"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
            <input
              type="text"
              required
              value={stuRoll}
              onChange={(e) => setStuRoll(e.target.value)}
              placeholder="Roll Number / Student ID (e.g. ST-2026-8501)"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            />
            <select
              value={stuDivisionId}
              onChange={(e) => setStuDivisionId(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};
