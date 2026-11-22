import React from 'react';
import { useBranding } from '../context/BrandingContext';

const ATTACHED_LOGO_PATH = '/assets/images/attendease-logo.png';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'dark-surface';
  showWordmark?: boolean;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'default',
  showWordmark = true,
  subtitle
}) => {
  const { customLogoUrl } = useBranding();
  const logoSrc = customLogoUrl || ATTACHED_LOGO_PATH;

  if (!showWordmark) {
    return (
      <div
        className={`${size === 'sm' ? 'w-9 h-9' : 'w-10 h-10'} bg-transparent overflow-hidden flex items-center justify-center shrink-0`}
      >
        <img
          src={logoSrc}
          alt="AttendEase"
          referrerPolicy="no-referrer"
          className={`${customLogoUrl ? 'w-full h-full object-contain' : 'w-full h-full object-cover object-left'} ${
            variant === 'dark-surface' ? 'brightness-110' : 'dark:brightness-110'
          }`}
        />
      </div>
    );
  }

  const heightCls = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-10' : 'h-8 sm:h-9';
  const subtitleCls =
    variant === 'dark-surface' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className="flex flex-col items-start text-left shrink-0">
      <div className="bg-transparent flex items-center justify-center shrink-0">
        <img
          src={logoSrc}
          alt="AttendEase"
          referrerPolicy="no-referrer"
          className={`${heightCls} w-auto max-w-[175px] object-contain ${
            variant === 'dark-surface' ? 'brightness-110' : 'dark:brightness-110'
          }`}
        />
      </div>
      {subtitle && (
        <span className={`text-[11px] font-medium block whitespace-nowrap mt-1 pl-0.5 ${subtitleCls}`}>
          {subtitle}
        </span>
      )}
    </div>
  );
};
