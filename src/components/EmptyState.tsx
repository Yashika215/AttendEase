import React from 'react';
import { Calendar, Users, BookOpen, ScrollText, Search } from 'lucide-react';

export type EmptyStateVariant = 'attendance' | 'directory' | 'courses' | 'logs' | 'search';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

const EmptyIllustration: React.FC<{ variant: EmptyStateVariant }> = ({ variant }) => {
  const icons: Record<EmptyStateVariant, React.ReactNode> = {
    attendance: <Calendar className="w-7 h-7 text-blue-600 dark:text-blue-400" />,
    directory: <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />,
    courses: <BookOpen className="w-7 h-7 text-sky-600 dark:text-sky-400" />,
    logs: <ScrollText className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
    search: <Search className="w-7 h-7 text-slate-600 dark:text-slate-400" />
  };

  return (
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto">
      {icons[variant]}
    </div>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'search',
  title,
  description,
  actionLabel,
  onAction,
  compact = false
}) => {
  return (
    <div
      className={`text-center ${
        compact ? 'py-8 px-4' : 'py-14 px-6'
      } bg-slate-50/70 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl`}
    >
      <EmptyIllustration variant={variant} />
      <h4 className="mt-4 text-base font-bold text-[#14213D] dark:text-white">{title}</h4>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
