import React from 'react';
import { ArrowRight } from 'lucide-react';
import dashboardPreviewImg from '../assets/images/attendease_dashboard_preview_1794743591511.jpg';

interface HeroProps {
  onExploreFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreFeatures }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#EAF4FF]/40 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-[#14213D] pt-12 pb-24 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-8 text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#14213D] dark:text-white tracking-tight leading-[1.1] text-balance">
              Transform the Way You Track Attendance
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              An intelligent attendance management platform designed to simplify attendance tracking for educational institutions, teachers and students.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onExploreFeatures}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all flex items-center justify-center gap-3 text-base group cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>Explore</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-2xl lg:max-w-none">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-2xl opacity-15" />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl shadow-blue-900/10 overflow-hidden">
                <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">attendease.app/dashboard</span>
                  <div className="w-4" />
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950">
                  <img
                    src={dashboardPreviewImg}
                    alt="AttendEase Dashboard Preview"
                    referrerPolicy="no-referrer"
                    className="rounded-lg shadow-inner w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
