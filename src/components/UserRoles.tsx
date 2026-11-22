import React from 'react';
import { Shield, BookOpen, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

interface UserRolesProps {
  onSelectRole: (role: UserRole) => void;
}

export const UserRoles: React.FC<UserRolesProps> = ({ onSelectRole }) => {
  return (
    <section id="roles" className="py-24 bg-white dark:bg-[#14213D] transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
            Three Dedicated Portals
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
            Designed for Everyone
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            One platform. Three powerful experiences tailored for administrators, educators and students.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#F8FAFC] dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-xl transition-all flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-[#14213D] dark:text-white">Admin Dashboard</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Complete system oversight and institutional controls.
                </p>
              </div>
              <ul className="space-y-3 pt-2">
                {[
                  'Manage students and teachers',
                  'Manage courses and classes',
                  'Monitor attendance analytics',
                  'Manage the entire system'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <button
                type="button"
                onClick={() => onSelectRole('admin')}
                className="w-full py-3.5 px-6 bg-white dark:bg-slate-900 hover:bg-blue-600 text-blue-600 dark:text-blue-400 hover:text-white font-semibold rounded-xl border border-blue-200 dark:border-slate-700 hover:border-blue-600 shadow-sm transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
              >
                <span>Admin Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-xl transition-all flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform">
                <BookOpen className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-[#14213D] dark:text-white">Teacher Hub</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Streamlined tools for classroom engagement and attendance tracking.
                </p>
              </div>
              <ul className="space-y-3 pt-2">
                {[
                  'Manage assigned classes',
                  'Mark manual attendance',
                  'Generate QR attendance',
                  'View attendance reports'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <button
                type="button"
                onClick={() => onSelectRole('teacher')}
                className="w-full py-3.5 px-6 bg-white dark:bg-slate-900 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white font-semibold rounded-xl border border-indigo-200 dark:border-slate-700 hover:border-indigo-600 shadow-sm transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
              >
                <span>Teacher Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="bg-[#F8FAFC] dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-xl transition-all flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-bold text-[#14213D] dark:text-white">Student Portal</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Easy check-ins and personal attendance tracking on any device.
                </p>
              </div>
              <ul className="space-y-3 pt-2">
                {[
                  'Scan QR codes',
                  'Track personal attendance',
                  'View attendance history',
                  'Monitor attendance percentage'
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-8">
              <button
                type="button"
                onClick={() => onSelectRole('student')}
                className="w-full py-3.5 px-6 bg-white dark:bg-slate-900 hover:bg-sky-600 text-sky-600 dark:text-sky-400 hover:text-white font-semibold rounded-xl border border-sky-200 dark:border-slate-700 hover:border-sky-600 shadow-sm transition-all flex items-center justify-center gap-2 group/btn cursor-pointer"
              >
                <span>Student Portal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
