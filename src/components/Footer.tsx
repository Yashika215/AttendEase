import React, { useState } from 'react';
import { Mail, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  onNavigateHome: () => void;
  onNavigateSection?: (sectionId: string) => void;
  onOpenLogin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigateHome,
  onNavigateSection,
  onOpenLogin
}) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    toast.success('Subscribed!', `Updates will be sent to ${email}. Thank you for joining.`);
    setEmail('');
    setTimeout(() => {
      setSubscribed(false);
    }, 5000);
  };

  return (
    <footer className="bg-[#14213D] dark:bg-slate-950 text-white pt-16 pb-12 border-t border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          <div className="md:col-span-5 space-y-4">
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-left focus:outline-none group cursor-pointer"
            >
              <BrandLogo
                variant="dark-surface"
                subtitle="Smart Attendance. Simplified Management."
              />
            </button>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              An intelligent attendance management platform designed to simplify attendance tracking for educational institutions, teachers and students.
            </p>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Navigation
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Home
                </button>
              </li>
              <li>
                <a
                  href="#features"
                  onClick={(e) => {
                    if (onNavigateSection) {
                      e.preventDefault();
                      onNavigateSection('features');
                    }
                  }}
                  className="hover:text-white transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#roles"
                  onClick={(e) => {
                    if (onNavigateSection) {
                      e.preventDefault();
                      onNavigateSection('roles');
                    }
                  }}
                  className="hover:text-white transition-colors"
                >
                  User Roles
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Sign In / Portal
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-blue-400">
              Stay Updated
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Subscribe to our institutional newsletter to receive feature updates, security alerts, and EdTech insights.
            </p>

            {subscribed ? (
              <div className="bg-emerald-900/50 border border-emerald-500/50 text-emerald-200 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-medium">Thank you for subscribing! We&apos;ll keep you updated.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Enter institutional email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Subscribe</span>
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <div className="flex items-center gap-3">
            <p>© {new Date().getFullYear()} AttendEase Inc. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="#features"
              onClick={(e) => {
                if (onNavigateSection) {
                  e.preventDefault();
                  onNavigateSection('features');
                } else {
                  onNavigateHome();
                }
              }}
              className="hover:text-white transition-colors"
            >
              Platform Features
            </a>
            <a
              href="#roles"
              onClick={(e) => {
                if (onNavigateSection) {
                  e.preventDefault();
                  onNavigateSection('roles');
                } else {
                  onNavigateHome();
                }
              }}
              className="hover:text-white transition-colors"
            >
              User Portals
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
