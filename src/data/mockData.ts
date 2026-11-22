import { CourseClass, AttendanceRecord, DirectoryMember, ActivityLogEntry } from '../types';
import adminAvatarImg from '../assets/images/admin_profile_avatar_1794746526934.jpg';
import teacherSarahAvatarImg from '../assets/images/teacher_sarah_avatar_1794746590760.jpg';
import studentAlexAvatarImg from '../assets/images/student_alex_avatar_1794746591803.jpg';

export const DEMO_AVATARS = {
  admin: adminAvatarImg,
  teacher: teacherSarahAvatarImg,
  student: studentAlexAvatarImg
};

export const INITIAL_CLASSES: CourseClass[] = [
  {
    id: 'c-1',
    code: 'CS-401',
    name: 'Advanced Software Engineering',
    teacherId: 'u-2',
    teacherName: 'Prof. Sarah Jenkins',
    schedule: 'Mon, Wed 10:00 AM - 11:30 AM',
    room: 'Lab 3B',
    totalStudents: 42
  },
  {
    id: 'c-2',
    code: 'CS-202',
    name: 'Data Structures & Algorithms',
    teacherId: 'u-2',
    teacherName: 'Prof. Sarah Jenkins',
    schedule: 'Tue, Thu 02:00 PM - 03:30 PM',
    room: 'Hall A',
    totalStudents: 58
  },
  {
    id: 'c-3',
    code: 'CS-505',
    name: 'Cloud Computing & Distributed Systems',
    teacherId: 'u-2',
    teacherName: 'Prof. Sarah Jenkins',
    schedule: 'Fri 09:00 AM - 12:00 PM',
    room: 'Tech Hub 1',
    totalStudents: 35
  },
  {
    id: 'c-4',
    code: 'CS-301',
    name: 'Operating Systems & Kernel Design',
    teacherId: 'u-2',
    teacherName: 'Prof. Sarah Jenkins',
    schedule: 'Mon, Thu 09:00 AM - 10:30 AM',
    room: 'Sys Lab 2',
    totalStudents: 60
  },
  {
    id: 'c-5',
    code: 'CS-304',
    name: 'Database Management Systems',
    teacherId: 'u-2',
    teacherName: 'Prof. Sarah Jenkins',
    schedule: 'Tue, Fri 11:00 AM - 12:30 PM',
    room: 'Hall B',
    totalStudents: 52
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-1',
    classId: 'c-1',
    classCode: 'CS-401',
    className: 'Advanced Software Engineering',
    studentId: 'ST-2026-8492',
    studentName: 'Alex Rivera',
    date: '2026-11-15',
    status: 'present',
    method: 'qr'
  },
  {
    id: 'att-2',
    classId: 'c-1',
    classCode: 'CS-401',
    className: 'Advanced Software Engineering',
    studentId: 'ST-2026-8493',
    studentName: 'Jordan Smith',
    date: '2026-11-15',
    status: 'absent',
    method: 'manual'
  },
  {
    id: 'att-3',
    classId: 'c-1',
    classCode: 'CS-401',
    className: 'Advanced Software Engineering',
    studentId: 'ST-2026-8494',
    studentName: 'Taylor Swift',
    date: '2026-11-15',
    status: 'absent',
    method: 'manual'
  },
  {
    id: 'att-20',
    classId: 'c-3',
    classCode: 'CS-505',
    className: 'Cloud Computing & Distributed Systems',
    studentId: 'ST-2026-8492',
    studentName: 'Alex Rivera',
    date: '2026-11-14',
    status: 'present',
    method: 'qr'
  },
  {
    id: 'att-21',
    classId: 'c-3',
    classCode: 'CS-505',
    className: 'Cloud Computing & Distributed Systems',
    studentId: 'ST-2026-8499',
    studentName: 'David Kim',
    date: '2026-11-14',
    status: 'present',
    method: 'qr'
  },
  {
    id: 'att-22',
    classId: 'c-3',
    classCode: 'CS-505',
    className: 'Cloud Computing & Distributed Systems',
    studentId: 'ST-2026-8492',
    studentName: 'Alex Rivera',
    date: '2026-11-07',
    status: 'present',
    method: 'manual'
  }
];

export const INITIAL_DIRECTORY_MEMBERS: DirectoryMember[] = [
  {
    id: 'dir-1',
    name: 'Dr. Robert Chen',
    email: 'admin@attendease.edu',
    role: 'admin',
    department: 'Academic Affairs & IT',
    avatar: adminAvatarImg,
    status: 'Active',
    joinedAt: '2025-08-15'
  },
  {
    id: 'dir-2',
    name: 'Prof. Sarah Jenkins',
    email: 'teacher@attendease.edu',
    role: 'teacher',
    department: 'Computer Science',
    courseCode: 'CS-401',
    avatar: teacherSarahAvatarImg,
    status: 'Active',
    joinedAt: '2025-09-01'
  },
  {
    id: 'dir-3',
    name: 'Alex Rivera',
    email: 'student@attendease.edu',
    role: 'student',
    department: 'Software Engineering',
    studentId: 'ST-2026-8492',
    courseCode: 'BTECH',
    avatar: studentAlexAvatarImg,
    status: 'Active',
    joinedAt: '2026-09-04'
  },
  {
    id: 'dir-4',
    name: 'Jordan Smith',
    email: 'jordan.smith@attendease.edu',
    role: 'student',
    department: 'Computer Science',
    studentId: 'ST-2026-8493',
    courseCode: 'CS-401',
    status: 'Active',
    joinedAt: '2026-09-04'
  },
  {
    id: 'dir-5',
    name: 'Elena Rostova',
    email: 'elena.rostova@attendease.edu',
    role: 'student',
    department: 'Applied Data Systems',
    studentId: 'ST-2026-8496',
    courseCode: 'CS-202',
    status: 'Active',
    joinedAt: '2026-09-05'
  },
  {
    id: 'dir-6',
    name: 'David Kim',
    email: 'david.kim@attendease.edu',
    role: 'student',
    department: 'Computer Science & Engineering',
    studentId: 'ST-2026-8499',
    courseCode: 'CS-505',
    status: 'Active',
    joinedAt: '2026-09-06'
  }
];

export const INITIAL_ACTIVITY_LOGS: ActivityLogEntry[] = [
  {
    id: 'log-101',
    timestamp: '2026-11-15 04:40:18',
    actorName: 'Dr. Robert Chen',
    actorRole: 'admin',
    category: 'System Alerts',
    action: 'Flagged Attendance Compliance Threshold',
    target: 'Jordan Smith · CS-401',
    details: 'Attendance rate dropped below 75% threshold.',
    status: 'warning'
  },
  {
    id: 'log-102',
    timestamp: '2026-11-15 04:38:05',
    actorName: 'Prof. Sarah Jenkins',
    actorRole: 'teacher',
    category: 'Attendance',
    action: 'Generated Dynamic QR Session',
    target: 'CS-401 (Advanced Software Engineering)',
    details: 'Opened timed QR attendance check-in window.',
    status: 'info'
  },
  {
    id: 'log-103',
    timestamp: '2026-11-15 04:30:22',
    actorName: 'Alex Rivera',
    actorRole: 'student',
    category: 'Attendance',
    action: 'Checked in via QR Scan',
    target: 'CS-401 (Lab 3B)',
    details: 'Student verified presence via mobile QR scan.',
    status: 'success'
  },
  {
    id: 'log-104',
    timestamp: '2026-11-15 04:15:40',
    actorName: 'Dr. Robert Chen',
    actorRole: 'admin',
    category: 'Course Management',
    action: 'Verified Term Timetable Registry',
    target: 'Fall 2026 Academic Term',
    details: 'Validated scheduled lecture rooms and assigned faculty credentials.',
    status: 'info'
  },
  {
    id: 'log-106',
    timestamp: '2026-11-15 03:40:00',
    actorName: 'Prof. Sarah Jenkins',
    actorRole: 'teacher',
    category: 'Attendance',
    action: 'Manual Roster Update',
    target: 'Taylor Swift · CS-401',
    details: 'Instructor recorded absence status on manual attendance roster.',
    status: 'error'
  }
];
