import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../types';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: (role?: UserRole) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateSection?: (sectionId: string) => void;
  activeRole: UserRole | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  onNavigateHome,
  onNavigateSection,
  activeRole
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#14213D]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={onNavigateHome}
          className="text-left focus:outline-none group shrink-0 cursor-pointer"
        >
          <BrandLogo size="md" />
        </button>

        {!currentUser && (
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={onNavigateHome}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Home
            </button>
            <a
              href="#features"
              onClick={(e) => {
                if (onNavigateSection) {
                  e.preventDefault();
                  onNavigateSection('features');
                }
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => {
                if (onNavigateSection) {
                  e.preventDefault();
                  onNavigateSection('how-it-works');
                }
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#faq"
              onClick={(e) => {
                if (onNavigateSection) {
                  e.preventDefault();
                  onNavigateSection('faq');
                }
              }}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0"
            >
              FAQ
            </a>
          </nav>
        )}

        {currentUser && (
          <div className="hidden md:flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 pl-1.5 pr-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
            <UserAvatar
              name={currentUser.name}
              src={currentUser.avatar}
              role={currentUser.role}
              size="sm"
              rounded="full"
              className="ring-1 ring-blue-500/50"
            />
            <span className="capitalize">{activeRole || currentUser.role} Portal</span>
            <span className="text-slate-400 font-normal">({currentUser.name})</span>
          </div>
        )}

        <div className="hidden md:flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenLogin()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span>Login</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#14213D] border-b border-slate-200 dark:border-slate-800 px-6 py-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              onNavigateHome();
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-700 dark:text-slate-200 font-medium hover:text-blue-600"
          >
            Home
          </button>
          <a
            href="#features"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('features');
              }
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-700 dark:text-slate-200 font-medium hover:text-blue-600"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('how-it-works');
              }
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-700 dark:text-slate-200 font-medium hover:text-blue-600"
          >
            How It Works
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              if (onNavigateSection) {
                e.preventDefault();
                onNavigateSection('faq');
              }
              setMobileMenuOpen(false);
            }}
            className="block w-full text-left py-2 text-slate-700 dark:text-slate-200 font-medium hover:text-blue-600"
          >
            FAQ
          </a>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center font-medium text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg"
              >
                Sign Out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center font-semibold text-white bg-blue-600 rounded-xl shadow-md cursor-pointer"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
