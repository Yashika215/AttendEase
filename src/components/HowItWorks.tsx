import React from 'react';
import { LogIn, QrCode, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    icon: LogIn,
    title: 'Sign In',
    description:
      'Users log in securely using their assigned institutional credentials for Admin, Teacher or Student access.'
  },
  {
    number: '02',
    icon: QrCode,
    title: 'Mark Attendance',
    description:
      'Teachers mark attendance manually or generate dynamic QR codes. Students scan to check-in instantly.'
  },
  {
    number: '03',
    icon: TrendingUp,
    title: 'Track Progress',
    description:
      'Students and administrators view real-time attendance percentages, history logs, and automated reports.'
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white dark:bg-slate-900 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
            Seamless Workflow
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
            Simple. Smart. Efficient.
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Get started in minutes with a zero-friction process built for busy educators and students.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative bg-[#F8FAFC] dark:bg-slate-800/80 rounded-3xl p-8 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-4xl font-black text-slate-200 dark:text-slate-700 tabular-nums">
                      {step.number}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-2xl font-bold text-[#14213D] dark:text-white">{step.title}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
