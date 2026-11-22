import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { UserRoles } from './components/UserRoles';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { FAQ } from './components/FAQ';
import { Footer } from './components/Footer';
import { LoginModal } from './components/LoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { ToastProvider, useToast } from './context/ToastContext';
import { ActivityLogProvider, useActivityLog } from './context/ActivityLogContext';
import { BrandingProvider } from './context/BrandingContext';
import { authApi, getStoredToken, clearAuthToken } from './utils/api';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Unexpected rendering error.'
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AttendEase ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 p-6 shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-xl">
              !
            </div>
            <h2 className="text-lg font-bold text-[#14213D] dark:text-white">
              Something went wrong in this view
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
            >
              Reload AttendEase
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function normalizeUserRole(role?: string | null): UserRole {
  const r = String(role || '').trim().toLowerCase();
  if (r === 'admin' || r === 'administrator' || r === 'superadmin') return 'admin';
  if (r === 'teacher' || r === 'faculty' || r === 'instructor' || r === 'professor') return 'teacher';
  return 'student';
}

function AppContent() {
  const toast = useToast();
  const { addLog, refreshLogs } = useActivityLog();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authRestoring, setAuthRestoring] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [modalInitialRole, setModalInitialRole] = useState<UserRole>('student');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setAuthRestoring(false);
      return;
    }

    authApi
      .me()
      .then((res) => {
        if (res.user) {
          const normalizedUser: User = {
            ...res.user,
            role: normalizeUserRole(res.user.role)
          };
          setCurrentUser(normalizedUser);
          refreshLogs({ adminScope: normalizedUser.role === 'admin' });
        } else {
          clearAuthToken();
        }
      })
      .catch(() => {
        clearAuthToken();
      })
      .finally(() => {
        setAuthRestoring(false);
      });
  }, [refreshLogs]);

  const handleOpenLogin = (role?: UserRole) => {
    setModalInitialRole(role || 'student');
    setLoginModalOpen(true);
  };

  const handleLogin = (user: User) => {
    const normalizedUser: User = {
      ...user,
      role: normalizeUserRole(user.role)
    };
    setCurrentUser(normalizedUser);
    refreshLogs({ adminScope: normalizedUser.role === 'admin' });
    addLog({
      actorName: normalizedUser.name,
      actorRole: normalizedUser.role,
      category: 'Authentication',
      action: 'Signed Into Portal',
      target: `${normalizedUser.role.toUpperCase()} Dashboard`,
      details: `${normalizedUser.name} (${normalizedUser.email}) authenticated.`,
      status: 'success'
    });
    toast.success('Signed In', `Welcome to the ${normalizedUser.role.toUpperCase()} portal, ${normalizedUser.name}.`);
  };

  const handleLogout = () => {
    const prevUser = currentUser;
    clearAuthToken();
    setCurrentUser(null);
    if (prevUser) {
      toast.info('Signed Out', `Session ended cleanly for ${prevUser.name}.`);
    }
  };

  const handleNavigateHome = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateSection = (sectionId: string) => {
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  const handleSelectRole = (role: UserRole) => {
    if (currentUser && currentUser.role === role) {
      return;
    }
    handleOpenLogin(role);
  };

  const renderDashboard = () => {
    if (!currentUser) return null;
    const role = normalizeUserRole(currentUser.role);
    if (role === 'admin') {
      return (
        <AdminDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateHome={handleNavigateHome}
        />
      );
    }
    if (role === 'teacher') {
      return (
        <TeacherDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigateHome={handleNavigateHome}
        />
      );
    }
    return (
      <StudentDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateHome={handleNavigateHome}
      />
    );
  };

  if (authRestoring) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <div className="w-9 h-9 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold tracking-wide uppercase">Loading AttendEase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-slate-950 text-[#14213D] dark:text-slate-100 transition-colors">
      {currentUser ? (
        renderDashboard()
      ) : (
        <>
          <Navbar
            currentUser={null}
            onOpenLogin={handleOpenLogin}
            onLogout={handleLogout}
            onNavigateHome={handleNavigateHome}
            onNavigateSection={handleNavigateSection}
            activeRole={null}
          />
          <main className="flex-1">
            <Hero onExploreFeatures={() => handleNavigateSection('features')} />
            <UserRoles onSelectRole={handleSelectRole} />
            <Features />
            <HowItWorks />
            <FAQ />
          </main>
          <Footer
            onNavigateHome={handleNavigateHome}
            onNavigateSection={handleNavigateSection}
            onOpenLogin={() => handleOpenLogin()}
          />
        </>
      )}

      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLogin={handleLogin}
        initialRole={modalInitialRole}
      />
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <ToastProvider>
        <BrandingProvider>
          <ActivityLogProvider>
            <AppContent />
          </ActivityLogProvider>
        </BrandingProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

export default App;
