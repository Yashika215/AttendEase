import React from 'react';
import {
  ShieldCheck,
  Users,
  QrCode,
  CheckSquare,
  Bell,
  FileSpreadsheet,
  Lock,
  BarChart3
} from 'lucide-react';

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Role-Based Login & Secure Access',
    description:
      'Strict server-verified access separating Admin, Teacher, and Student sessions with college and division data isolation.'
  },
  {
    icon: Users,
    title: 'Admin Student, Teacher & Division Management',
    description:
      'Centralized directory for approving faculty accounts, onboarding students in bulk, and structuring academic divisions.'
  },
  {
    icon: QrCode,
    title: 'Dynamic QR Attendance Sessions',
    description:
      'Time-limited, division-bound QR codes generated per lecture to prevent proxy check-ins and accelerate classroom roll call.'
  },
  {
    icon: CheckSquare,
    title: 'Manual Attendance & Live Roster',
    description:
      'Teachers can mark or adjust student attendance manually with instant database synchronization and audit logging.'
  },
  {
    icon: Bell,
    title: 'Automated Low-Attendance Alerts',
    description:
      'Monitors compliance against configurable percentage thresholds (75% default) and dispatches email warnings automatically.'
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV & Institutional PDF Exports',
    description:
      'Filter attendance logs by date, course, or division and export audit-ready spreadsheets and formatted PDF reports.'
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics & Trends',
    description:
      'Interactive charts track daily check-in rates, subject participation, and division-level attendance health.'
  },
  {
    icon: Lock,
    title: 'Multi-College Cloud Isolation',
    description:
      'Built for scalable institutional deployment with isolated tenant workspaces, OTP verification, and audit trails.'
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-[#F8FAFC] dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
            Core Platform Modules
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
            Everything You Need to Manage Attendance
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Built from the ground up for modern educational institutions seeking reliability, security, and operational clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-white dark:bg-slate-800/75 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-700/80 hover:border-blue-500/40 hover:shadow-lg transition-all space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-[#14213D] dark:text-white leading-snug">
                  {feat.title}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
