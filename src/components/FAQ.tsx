import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'How does QR Code attendance prevent proxy check-ins?',
    answer:
      'Instructors generate a course-bound session QR token with an automatic 15-minute expiration window. Every scan verifies the student’s authenticated account, checks course enrollment in the database, and blocks duplicate check-ins for the same lecture day.'
  },
  {
    question: 'How is student and faculty data isolated between accounts and colleges?',
    answer:
      'AttendEase enforces strict server-verified access verification on every backend API route. Each college operates inside its own isolated tenant, students can only view their own division and attendance history, professors can only access divisions and subjects assigned to them, and administrators manage their own institution.'
  },
  {
    question: 'How does AttendEase structure academic years, courses, and divisions?',
    answer:
      'AttendEase organizes attendance in a clean hierarchy: College → Academic Year → Course → Year/Semester → Division → Subject → Students. Administrators configure programs such as B.Tech, B.Com, BBA, and BCA, organize divisions, import student rosters, and assign faculty to specific subjects.'
  },
  {
    question: 'How do automated attendance alerts and threshold emails work?',
    answer:
      'Administrators configure a minimum attendance threshold percentage (75% by default) and cooldown window inside Notifications. Whenever an absence causes a student’s verified rate to drop below the threshold, an automated advisory email and audit record are triggered.'
  },
  {
    question: 'Which export formats are supported for attendance reports?',
    answer:
      'Both the Admin and Teacher portals support date-range, course, and status filtering with one-click CSV exports and formatted PDF institutional summary reports ready for academic review.'
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-24 bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-blue-600 dark:text-blue-400">
            Frequently Asked Questions
          </h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-[#14213D] dark:text-white tracking-tight">
            Answers for Administrators, Faculty & Students
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
            Clear details on security, QR check-in verification, reporting, and institutional onboarding.
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.question}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span className="text-base font-bold text-[#14213D] dark:text-white">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-0 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                    <p className="pt-4">{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
