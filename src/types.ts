export type UserRole = 'admin' | 'teacher' | 'student';

export type AttendanceStatus = 'present' | 'absent';
export type AttendanceMethod = 'qr' | 'manual';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string | null;
  studentId?: string | null;
  rollNo?: string | null;
  role: UserRole;
  department?: string | null;
  academicYearId?: string | null;
  courseId?: string | null;
  courseCode?: string | null;
  yearSemesterId?: string | null;
  divisionId?: string | null;
  batchName?: string | null;
  avatar?: string | null;
  collegeId?: string | null;
  collegeName?: string | null;
  approvalStatus?: string;
  status?: string;
  joinedAt?: string;
  emailVerified?: boolean;
}

export interface College {
  id: string;
  name: string;
  code: string;
  officialEmail?: string;
  contactNumber?: string;
  address?: string;
  website?: string;
  createdAt?: string;
}

export interface AcademicYear {
  id: string;
  collegeId?: string;
  name: string;
  status?: string;
}

export interface Course {
  id: string;
  collegeId?: string;
  academicYearId: string;
  code: string;
  name: string;
}

export interface YearSemester {
  id: string;
  collegeId?: string;
  courseId: string;
  name: string;
}

export interface Division {
  id: string;
  collegeId?: string;
  yearSemesterId: string;
  name: string;
  batchName?: string;
}

export interface CourseClass {
  id: string;
  collegeId?: string;
  academicYearId?: string;
  courseId?: string;
  yearSemesterId?: string;
  divisionId?: string;
  batchName?: string;
  code: string;
  name: string;
  teacherId: string;
  teacherName: string;
  schedule: string;
  room: string;
  totalStudents: number;
  courseName?: string;
  yearSemesterName?: string;
  divisionName?: string;
}

export interface AttendanceRecord {
  id: string;
  collegeId?: string;
  divisionId?: string;
  classId: string;
  classCode?: string;
  className: string;
  studentId: string;
  studentName: string;
  studentUid?: string;
  date: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  recordedAt?: string;
}

export interface DirectoryMember {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  studentId?: string;
  rollNo?: string;
  courseCode?: string;
  courseId?: string;
  academicYearId?: string;
  yearSemesterId?: string;
  divisionId?: string;
  batchName?: string;
  avatar?: string | null;
  status: 'Active' | 'Pending' | 'Rejected' | 'Inactive' | string;
  approvalStatus?: string;
  joinedAt: string;
}

export type ActivityCategory =
  | 'Authentication'
  | 'Attendance'
  | 'User Management'
  | 'Course Management'
  | 'System Alerts';

export type ActivityStatus = 'success' | 'info' | 'warning' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole | 'system';
  category: ActivityCategory;
  action: string;
  target: string;
  details: string;
  status: ActivityStatus;
}

export interface NotificationConfig {
  thresholdPercent: number;
  autoNotify: boolean;
  smtpConfigured?: boolean;
  smtpFrom?: string;
  updatedAt?: string;
}

export interface AlertLogEntry {
  id: string;
  studentUid?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attendancePercent: number;
  thresholdPercent: number;
  status: string;
  subject?: string;
  message?: string;
  sentAt: string;
}

export interface Enquiry {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  role?: string;
  subject: string;
  message: string;
  status: 'New' | 'In Review' | 'Resolved' | string;
  createdAt: string;
}
