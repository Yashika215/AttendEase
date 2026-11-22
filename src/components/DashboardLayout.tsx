import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  LogOut,
  ArrowLeft,
  ArrowRight,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { User } from '../types';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeVariant?: 'blue' | 'amber' | 'red' | 'emerald';
}

export interface SidebarCategory {
  id: string;
  label: string;
  defaultOpen?: boolean;
  items: SidebarItem[];
}

interface DashboardLayoutProps {
  currentUser: User;
  portalLabel: string;
  categories: SidebarCategory[];
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  headerAction?: React.ReactNode;
  onProfileClick?: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentUser,
  portalLabel,
  categories,
  activeTab,
  onSelectTab,
  onLogout,
  onNavigateHome,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search students, classes, reports...',
  headerAction,
  onProfileClick,
  children
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [history, setHistory] = useState<{ stack: string[]; index: number }>({
    stack: [activeTab],
    index: 0
  });
  const isNavigatingRef = useRef(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    categories.forEach((cat) => {
      initial[cat.id] = cat.defaultOpen !== false;
    });
    return initial;
  });

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  useEffect(() => {
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    setHistory((prev) => {
      if (prev.stack[prev.index] === activeTab) return prev;
      const nextStack = [...prev.stack.slice(0, prev.index + 1), activeTab];
      return { stack: nextStack, index: nextStack.length - 1 };
    });
  }, [activeTab]);

  const canGoBack = history.index > 0;
  const canGoForward = history.index < history.stack.length - 1;

  const handleBack = () => {
    if (!canGoBack) return;
    const nextIdx = history.index - 1;
    const target = history.stack[nextIdx];
    isNavigatingRef.current = true;
    setHistory((prev) => ({ ...prev, index: nextIdx }));
    onSelectTab(target);
  };

  const handleForward = () => {
    if (!canGoForward) return;
    const nextIdx = history.index + 1;
    const target = history.stack[nextIdx];
    isNavigatingRef.current = true;
    setHistory((prev) => ({ ...prev, index: nextIdx }));
    onSelectTab(target);
  };

  const toggleTheme = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      setDarkMode(true);
    }
  };

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const currentTabLabel =
    categories.flatMap((c) => c.items).find((i) => i.id === activeTab)?.label || 'Overview';

  const handleSelect = (id: string) => {
    onSelectTab(id);
    setMobileOpen(false);
  };

  const badgeCls = (variant: SidebarItem['badgeVariant'] = 'blue') => {
    switch (variant) {
      case 'amber':
        return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
      case 'red':
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      default:
        return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    }
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const mini = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-[#0F172A] text-slate-200 select-none">
        <div
          className={`h-16 px-4 flex items-center ${
            mini ? 'justify-center' : 'justify-between'
          } border-b border-slate-800/80 shrink-0`}
        >
          <button
            type="button"
            onClick={onNavigateHome}
            className="flex items-center text-left focus:outline-none group cursor-pointer"
            title="Return to AttendEase Home"
          >
            <BrandLogo size="sm" variant="dark-surface" showWordmark={!mini} />
          </button>
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            !mini && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )
          )}
        </div>

        {mini && (
          <div className="px-3 pt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {categories.map((cat) => {
            const isOpen = openGroups[cat.id] !== false;
            return (
              <div key={cat.id} className="space-y-1">
                {mini ? (
                  <div className="h-px bg-slate-800 mx-2 my-2" />
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleGroup(cat.id)}
                    className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-md"
                  >
                    <span className="truncate">{cat.label}</span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                  </button>
                )}

                {(isOpen || mini) && (
                  <div className="space-y-1">
                    {cat.items.map((item) => {
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelect(item.id)}
                          title={mini ? item.label : undefined}
                          className={`w-full flex items-center ${
                            mini ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                          } rounded-xl text-sm font-medium transition-all cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25 font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`shrink-0 ${active ? 'text-white' : 'text-slate-400'}`}>
                              {item.icon}
                            </span>
                            {!mini && <span className="truncate">{item.label}</span>}
                          </div>
                          {!mini && item.badge !== undefined && (
                            <span
                              className={`ml-2 px-2 py-0.5 text-[10px] font-bold rounded-md tabular-nums shrink-0 ${
                                active ? 'bg-white/20 text-white' : badgeCls(item.badgeVariant)
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800/90 bg-slate-900/60 space-y-2 shrink-0">
          {mini ? (
            <div className="flex flex-col items-center gap-2">
              <button type="button" onClick={onProfileClick} title={currentUser.name} className="cursor-pointer">
                <UserAvatar
                  name={currentUser.name}
                  src={currentUser.avatar}
                  role={currentUser.role}
                  size="md"
                  rounded="lg"
                  className="ring-1 ring-blue-500/40"
                />
              </button>
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onProfileClick}
                className="w-full p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-3 text-left transition-colors cursor-pointer"
              >
                <UserAvatar
                  name={currentUser.name}
                  src={currentUser.avatar}
                  role={currentUser.role}
                  size="md"
                  rounded="lg"
                  className="ring-1 ring-blue-500/40"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-400 capitalize truncate">
                    {currentUser.role} · {currentUser.department || 'Verified'}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-900/60 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-slate-950 transition-colors">
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen border-r border-slate-800 transition-all duration-200 z-30 ${
          collapsed ? 'w-20' : 'w-68'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={handleBack}
                disabled={!canGoBack}
                title="Back"
                aria-label="Go back"
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleForward}
                disabled={!canGoForward}
                title="Forward"
                aria-label="Go forward"
                className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition-all cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 overflow-hidden">
              <span
                className="hidden sm:inline-block font-medium text-slate-400 dark:text-slate-500 truncate max-w-[120px] md:max-w-[200px] lg:max-w-[320px]"
                title={portalLabel}
              >
                {portalLabel}
              </span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700 shrink-0">/</span>
              <span className="font-bold text-[#14213D] dark:text-white truncate shrink-0 max-w-[110px] sm:max-w-[160px] md:max-w-[240px]">
                {currentTabLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onSearchChange && (
              <div className="relative hidden md:block w-48 lg:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            )}

            {headerAction}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              type="button"
              onClick={onProfileClick}
              className="hidden sm:flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-colors cursor-pointer"
              title="Account Profile"
            >
              <UserAvatar name={currentUser.name} src={currentUser.avatar} role={currentUser.role} size="xs" rounded="lg" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                {currentUser.name}
              </span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
