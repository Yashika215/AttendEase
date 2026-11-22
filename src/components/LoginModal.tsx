import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  KeyRound,
  RefreshCw,
  Clock
} from 'lucide-react';
import { User, UserRole } from '../types';
import { useToast } from '../context/ToastContext';
import {
  authApi,
  setAuthToken,
  getRememberedEmail,
  setRememberedEmail
} from '../utils/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
  initialRole?: UserRole;
  initialView?: 'login' | 'register' | 'register-college' | 'verify-otp' | 'pending-approval' | 'forgot-password';
}

type ModalView = 'login' | 'register' | 'register-college' | 'verify-otp' | 'pending-approval' | 'forgot-password';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  initialRole = 'student',
  initialView = 'login'
}) => {
  const toast = useToast();
  const [view, setView] = useState<ModalView>(initialView);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const [email, setEmail] = useState(() => getRememberedEmail() || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => Boolean(getRememberedEmail()));

  // Register College state
  const [collegeName, setCollegeName] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [collegeAddress, setCollegeAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');

  // Register User state
  const [regRole, setRegRole] = useState<UserRole>(initialRole === 'admin' ? 'student' : initialRole);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Computer Science');
  const [regStudentId, setRegStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [colleges, setColleges] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [regCollegeId, setRegCollegeId] = useState('');

  // OTP state
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpExpirySeconds, setOtpExpirySeconds] = useState(0);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [pendingName, setPendingName] = useState('');
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setInfoMsg(null);
      setView(initialView || 'login');
      authApi
        .listPublicColleges()
        .then((res) => {
          if (Array.isArray(res.colleges)) {
            setColleges(res.colleges);
            if (res.colleges[0]?.id && !regCollegeId) {
              setRegCollegeId(res.colleges[0].id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialRole, initialView]);

  useEffect(() => {
    if (view !== 'verify-otp') return;
    const timer = window.setInterval(() => {
      setOtpExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [view]);

  if (!isOpen) return null;

  const switchView = (next: ModalView) => {
    setErrorMsg(null);
    setInfoMsg(null);
    setView(next);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleDemoFill = async (role: UserRole) => {
    const demoEmails: Record<UserRole, string> = {
      admin: 'admin@attendease.edu',
      teacher: 'teacher@attendease.edu',
      student: 'student@attendease.edu'
    };
    const demoEmail = demoEmails[role];
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await authApi.login({
        email: demoEmail,
        password: 'password123',
        rememberMe: true,
        role
      });
      setAuthToken(res.token, true);
      setRememberedEmail(res.user.email, true);
      onLogin(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    const trimmedEmail = email.trim();
    const fallbackEmail =
      initialRole === 'admin'
        ? 'admin@attendease.edu'
        : initialRole === 'teacher'
        ? 'teacher@attendease.edu'
        : 'student@attendease.edu';

    setLoading(true);
    try {
      const res = await authApi.login({
        email: trimmedEmail || fallbackEmail,
        password: password || 'portal-access',
        rememberMe,
        role: initialRole
      });
      setAuthToken(res.token, rememberMe);
      if (trimmedEmail) {
        setRememberedEmail(trimmedEmail, rememberMe);
      }
      onLogin(res.user);
      onClose();
    } catch (err: any) {
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        setOtpEmail(err?.email || trimmedEmail.toLowerCase());
        setOtpDigits(['', '', '', '', '', '']);
        setOtpExpirySeconds(600);
        setResendCooldownSeconds(0);
        setInfoMsg('Your account requires email verification. Enter your 6-digit OTP below.');
        setView('verify-otp');
      } else if (err?.code === 'TEACHER_PENDING_APPROVAL') {
        setPendingName(err?.user?.name || 'Faculty Member');
        setView('pending-approval');
      } else {
        setErrorMsg(err?.message || 'Unable to sign in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCollegeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (adminPassword.length < 8) {
      setErrorMsg('Admin password must be at least 8 characters long.');
      return;
    }
    if (adminPassword !== adminConfirmPassword) {
      setErrorMsg('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.registerCollege({
        collegeName: collegeName.trim(),
        officialEmail: officialEmail.trim(),
        contactNumber: contactNumber.trim(),
        collegeAddress: collegeAddress.trim(),
        website: website.trim() || undefined,
        adminFullName: adminFullName.trim(),
        adminEmail: adminEmail.trim(),
        password: adminPassword,
        confirmPassword: adminConfirmPassword
      });
      setAuthToken(res.token, true);
      setRememberedEmail(res.user.email, true);
      toast.success('College Registered', res.message);
      onLogin(res.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to register college. Please check all required fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const res = await authApi.register({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        role: regRole,
        department: regDepartment.trim(),
        studentId: regRole === 'student' ? regStudentId.trim() : undefined,
        password: regPassword,
        collegeId: regCollegeId || undefined
      });
      if (res.requiresOtp) {
        setOtpEmail(res.email || regEmail.trim().toLowerCase());
        setOtpDigits(['', '', '', '', '', '']);
        setOtpExpirySeconds(600);
        setResendCooldownSeconds(60);
        setInfoMsg(res.devOtpPreview ? `Verification code: ${res.devOtpPreview}` : res.message);
        setView('verify-otp');
      } else if (res.token && res.user) {
        setAuthToken(res.token, true);
        onLogin(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('');
      const next = [...otpDigits];
      chars.forEach((c, offset) => {
        if (idx + offset < 6) next[idx + offset] = c;
      });
      setOtpDigits(next);
      otpRefs.current[Math.min(5, idx + chars.length)]?.focus();
      return;
    }
    const next = [...otpDigits];
    next[idx] = clean;
    setOtpDigits(next);
    if (clean && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.verifyOtp({ email: otpEmail, otp });
      if (res.pendingApproval) {
        setPendingName(res.user?.name || 'Faculty Member');
        setView('pending-approval');
      } else if (res.token && res.user) {
        setAuthToken(res.token, true);
        toast.success('Email Verified', 'Your AttendEase account is now active.');
        onLogin(res.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldownSeconds > 0 || !otpEmail) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.resendOtp(otpEmail);
      setOtpExpirySeconds(600);
      setResendCooldownSeconds(60);
      setInfoMsg(res.devOtpPreview ? `New verification code: ${res.devOtpPreview}` : 'Fresh OTP sent.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authApi.forgotPassword(email.trim());
      setInfoMsg(res.message || 'If an account matches that email, password reset instructions have been sent.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-blue-100 dark:border-slate-800 overflow-hidden my-auto">
        <div className="bg-gradient-to-r from-[#14213D] via-[#1B3168] to-blue-700 px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-tight">
                {view === 'login' && 'AttendEase Portal Sign In'}
                {view === 'register' && 'Create Institutional Account'}
                {view === 'register-college' && 'Register College Workspace'}
                {view === 'verify-otp' && 'Verify Email Address'}
                {view === 'pending-approval' && 'Faculty Approval Pending'}
                {view === 'forgot-password' && 'Reset Account Password'}
              </h3>
              <p className="text-xs text-blue-100/80">
                JG University · Smart Attendance System
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {view === 'login' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Instant Portal Access
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoFill('admin')}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-slate-700 hover:border-blue-500 text-xs font-semibold text-blue-700 dark:text-blue-300 transition-all cursor-pointer"
                  >
                    Admin Demo
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoFill('teacher')}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-700 hover:border-indigo-500 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer"
                  >
                    Teacher Demo
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDemoFill('student')}
                    className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 hover:border-sky-500 text-xs font-semibold text-sky-700 dark:text-sky-300 transition-all cursor-pointer"
                  >
                    Student Demo
                  </button>
                </div>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Institutional Email or ID
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@attendease.edu"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot-password')}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password (optional for demo)"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Keep me signed in on this browser</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>{loading ? 'Signing In...' : 'Sign In to Portal'}</span>
                </button>
              </form>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  New Student / Faculty Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => switchView('register-college')}
                  className="font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
                >
                  Register Institution
                </button>
              </div>
            </div>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegisterUserSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRegRole(r)}
                    className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all cursor-pointer ${
                      regRole === r
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {r} Registration
                  </button>
                ))}
              </div>

              {colleges.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Institution
                  </label>
                  <select
                    value={regCollegeId}
                    onChange={(e) => setRegCollegeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
                  >
                    {colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@university.edu"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {regRole === 'student' ? 'Enrollment / Student ID' : 'Department'}
                  </label>
                  {regRole === 'student' ? (
                    <input
                      type="text"
                      value={regStudentId}
                      onChange={(e) => setRegStudentId(e.target.value)}
                      placeholder="ST-2026-9001"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      placeholder="Computer Science"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {view === 'register-college' && (
            <form onSubmit={handleRegisterCollegeSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">College / University Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="JG University"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Official College Email</label>
                  <input
                    type="email"
                    required
                    value={officialEmail}
                    onChange={(e) => setOfficialEmail(e.target.value)}
                    placeholder="info@jguni.edu"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Contact Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+91 79 2685 6000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Website (optional)</label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://jguni.in"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Campus Address</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={collegeAddress}
                    onChange={(e) => setCollegeAddress(e.target.value)}
                    placeholder="Asia Campus, Drive-In Rd, Ahmedabad"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold mb-1">Admin Full Name</label>
                  <input
                    type="text"
                    required
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="Dr. Dean"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@jguni.edu"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Admin Password (8+ chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Provisioning Workspace...' : 'Create College Workspace'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {view === 'verify-otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit verification code sent to <strong>{otpEmail}</strong>
                </p>
                {otpExpirySeconds > 0 && (
                  <p className="text-xs font-semibold text-blue-600">
                    Expires in {formatTimer(otpExpirySeconds)}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                        otpRefs.current[idx - 1]?.focus();
                      }
                    }}
                    className="w-11 h-12 text-center text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:border-blue-500"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldownSeconds > 0 || loading}
                  className="flex items-center gap-1.5 text-blue-600 font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldownSeconds > 0
                      ? `Resend in ${resendCooldownSeconds}s`
                      : 'Resend Code'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {view === 'pending-approval' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-[#14213D] dark:text-white">
                Pending Administrator Approval
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Hello {pendingName}, your faculty registration has been verified and is awaiting institutional approval by your college administrator.
              </p>
              <button
                type="button"
                onClick={() => switchView('login')}
                className="px-5 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Return to Sign In
              </button>
            </div>
          )}

          {view === 'forgot-password' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Enter your registered institutional email address to receive password recovery details.
              </p>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-xl text-sm cursor-pointer"
              >
                {loading ? 'Sending...' : 'Request Reset'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
