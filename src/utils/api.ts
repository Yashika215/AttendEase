const TOKEN_KEY = 'attendease_auth_token';
const REMEMBERED_EMAIL_KEY = 'attendease_remembered_email';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string, rememberMe = true) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getRememberedEmail(): string {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
}

export function setRememberedEmail(email: string, remember: boolean) {
  if (remember && email) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }
}

export class ApiError extends Error {
  status?: number;
  code?: string;
  user?: unknown;
  email?: string;
  retryAfterSeconds?: number;
}

export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new ApiError(data.error || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.code = data.code;
    err.user = data.user;
    err.email = data.email;
    err.retryAfterSeconds = data.retryAfterSeconds;
    throw err;
  }

  return data as T;
}

export const authApi = {
  listPublicColleges: () => apiRequest('/api/colleges/public'),
  registerCollege: (payload: Record<string, any>) =>
    apiRequest('/api/auth/register-college', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password?: string; rememberMe?: boolean; role?: string }) =>
    apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: Record<string, any>) =>
    apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (payload: { email: string; otp: string }) =>
    apiRequest('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify(payload) }),
  resendOtp: (email: string) =>
    apiRequest('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    apiRequest('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => apiRequest('/api/auth/me')
};

export const adminApi = {
  listUsers: (filters?: {
    role?: string;
    courseId?: string;
    academicYearId?: string;
    yearSemesterId?: string;
    divisionId?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.role && filters.role !== 'all') params.set('role', filters.role);
    if (filters?.courseId && filters.courseId !== 'all') params.set('courseId', filters.courseId);
    if (filters?.academicYearId && filters.academicYearId !== 'all') params.set('academicYearId', filters.academicYearId);
    if (filters?.yearSemesterId && filters.yearSemesterId !== 'all') params.set('yearSemesterId', filters.yearSemesterId);
    if (filters?.divisionId && filters.divisionId !== 'all') params.set('divisionId', filters.divisionId);
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    const qs = params.toString();
    return apiRequest(`/api/admin/users${qs ? `?${qs}` : ''}`);
  },
  approveTeacher: (uid: string) =>
    apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/approve`, { method: 'POST' }),
  rejectTeacher: (uid: string) =>
    apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/reject`, { method: 'POST' }),
  promoteToAdmin: (uid: string) =>
    apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/promote`, { method: 'POST' }),
  createAdmin: (payload: Record<string, any>) =>
    apiRequest('/api/admin/users/create-admin', { method: 'POST', body: JSON.stringify(payload) }),
  createTeacher: (payload: Record<string, any>) =>
    apiRequest('/api/admin/teachers', { method: 'POST', body: JSON.stringify(payload) }),
  getAcademicStructure: () => apiRequest('/api/admin/academic/structure'),
  createAcademicYear: (name: string) =>
    apiRequest('/api/admin/academic/years', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteAcademicYear: (id: string) =>
    apiRequest(`/api/admin/academic/years/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createCourse: (payload: Record<string, any>) =>
    apiRequest('/api/admin/academic/courses', { method: 'POST', body: JSON.stringify(payload) }),
  deleteCourse: (id: string) =>
    apiRequest(`/api/admin/academic/courses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createSemester: (payload: Record<string, any>) =>
    apiRequest('/api/admin/academic/semesters', { method: 'POST', body: JSON.stringify(payload) }),
  deleteSemester: (id: string) =>
    apiRequest(`/api/admin/academic/semesters/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createDivision: (payload: Record<string, any>) =>
    apiRequest('/api/admin/academic/divisions', { method: 'POST', body: JSON.stringify(payload) }),
  deleteDivision: (id: string) =>
    apiRequest(`/api/admin/academic/divisions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createClass: (payload: Record<string, any>) =>
    apiRequest('/api/admin/classes', { method: 'POST', body: JSON.stringify(payload) }),
  updateClass: (id: string, payload: Record<string, any>) =>
    apiRequest(`/api/admin/classes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteClass: (id: string) =>
    apiRequest(`/api/admin/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createStudent: (payload: Record<string, any>) =>
    apiRequest('/api/admin/students', { method: 'POST', body: JSON.stringify(payload) }),
  updateStudent: (uid: string, payload: Record<string, any>) =>
    apiRequest(`/api/admin/students/${encodeURIComponent(uid)}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteStudent: (uid: string) =>
    apiRequest(`/api/admin/students/${encodeURIComponent(uid)}`, { method: 'DELETE' }),
  bulkImportStudents: (payload: Record<string, any>) =>
    apiRequest('/api/admin/students/bulk', { method: 'POST', body: JSON.stringify(payload) }),
  getActivityLogs: (filters?: { search?: string; category?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    const qs = params.toString();
    return apiRequest(`/api/activity-logs${qs ? `?${qs}` : ''}`);
  },
  getAdminActivityLogs: (filters?: { search?: string; category?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.category && filters.category !== 'All') params.set('category', filters.category);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    const qs = params.toString();
    return apiRequest(`/api/admin/activity-logs${qs ? `?${qs}` : ''}`);
  },
  createActivityLog: (payload: Record<string, any>) =>
    apiRequest('/api/admin/activity-logs', { method: 'POST', body: JSON.stringify(payload) }),
  clearActivityLogs: () => apiRequest('/api/admin/activity-logs', { method: 'DELETE' }),
  getAttendance: (filters?: {
    classId?: string;
    courseId?: string;
    yearSemesterId?: string;
    divisionId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.classId && filters.classId !== 'all') params.set('classId', filters.classId);
    if (filters?.courseId && filters.courseId !== 'all') params.set('courseId', filters.courseId);
    if (filters?.yearSemesterId && filters.yearSemesterId !== 'all') params.set('yearSemesterId', filters.yearSemesterId);
    if (filters?.divisionId && filters.divisionId !== 'all') params.set('divisionId', filters.divisionId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    const qs = params.toString();
    return apiRequest(`/api/admin/attendance${qs ? `?${qs}` : ''}`);
  },
  getAnalytics: () => apiRequest('/api/admin/analytics')
};

export const notificationApi = {
  getConfig: () => apiRequest('/api/notifications/config'),
  updateConfig: (payload: Record<string, any>) =>
    apiRequest('/api/notifications/config', { method: 'PUT', body: JSON.stringify(payload) }),
  evaluateThreshold: (force = false) =>
    apiRequest('/api/notifications/evaluate', { method: 'POST', body: JSON.stringify({ force }) }),
  getLogs: () => apiRequest('/api/notifications/logs'),
  getMyAlerts: () => apiRequest('/api/notifications/my-alerts'),
  recordAttendance: (payload: Record<string, any>) =>
    apiRequest('/api/attendance/record', { method: 'POST', body: JSON.stringify(payload) })
};

export const teacherApi = {
  getClasses: () => apiRequest('/api/teacher/classes'),
  getStudents: (filter?: string | { classId?: string; divisionId?: string }) => {
    const params = new URLSearchParams();
    if (typeof filter === 'string') {
      if (filter) params.set('classId', filter);
    } else if (filter) {
      if (filter.classId) params.set('classId', filter.classId);
      if (filter.divisionId) params.set('divisionId', filter.divisionId);
    }
    const qs = params.toString();
    return apiRequest(`/api/teacher/students${qs ? `?${qs}` : ''}`);
  },
  getAttendanceLogs: (filters?: {
    classId?: string;
    classCode?: string;
    divisionId?: string;
    courseId?: string;
    academicYearId?: string;
    yearSemesterId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.classId && filters.classId !== 'all') params.set('classId', filters.classId);
    if (filters?.classCode && filters.classCode !== 'all') params.set('classCode', filters.classCode);
    if (filters?.divisionId && filters.divisionId !== 'all') params.set('divisionId', filters.divisionId);
    if (filters?.courseId && filters.courseId !== 'all') params.set('courseId', filters.courseId);
    if (filters?.academicYearId && filters.academicYearId !== 'all') params.set('academicYearId', filters.academicYearId);
    if (filters?.yearSemesterId && filters.yearSemesterId !== 'all') params.set('yearSemesterId', filters.yearSemesterId);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return apiRequest(`/api/teacher/attendance${qs ? `?${qs}` : ''}`);
  },
  generateQrSession: (classCode: string, durationMinutes = 30, classId?: string) =>
    apiRequest('/api/teacher/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ classCode, classId, durationMinutes })
    }),
  verifyQrScan: (payload: Record<string, any>) =>
    apiRequest('/api/teacher/qr/scan', { method: 'POST', body: JSON.stringify(payload) })
};

export const studentApi = {
  getProfile: () => apiRequest('/api/student/profile'),
  getCourses: () => apiRequest('/api/student/courses'),
  getAttendance: () => apiRequest('/api/student/attendance'),
  scanQr: (payload: Record<string, any>) =>
    apiRequest('/api/student/qr/scan', { method: 'POST', body: JSON.stringify(payload) })
};

export const enquiryApi = {
  submit: (payload: Record<string, any>) =>
    apiRequest('/api/enquiries', { method: 'POST', body: JSON.stringify(payload) }),
  list: (filters?: { search?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.search?.trim()) params.set('search', filters.search.trim());
    if (filters?.status && filters.status !== 'All') params.set('status', filters.status);
    const qs = params.toString();
    return apiRequest(`/api/admin/enquiries${qs ? `?${qs}` : ''}`);
  },
  getById: (id: string) => apiRequest(`/api/admin/enquiries/${encodeURIComponent(id)}`),
  updateStatus: (id: string, status: string) =>
    apiRequest(`/api/admin/enquiries/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  delete: (id: string) => apiRequest(`/api/admin/enquiries/${encodeURIComponent(id)}`, { method: 'DELETE' })
};
