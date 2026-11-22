import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';

const HONORIFIC_PREFIXES = new Set(['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'miss']);

function getInitials(name: string): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return 'U';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const filtered =
    parts.length > 1 && HONORIFIC_PREFIXES.has(parts[0].toLowerCase()) ? parts.slice(1) : parts;
  if (filtered.length === 0) return trimmed.slice(0, 2).toUpperCase();
  if (filtered.length === 1) return filtered[0].slice(0, 2).toUpperCase();
  return `${filtered[0][0]}${filtered[filtered.length - 1][0]}`.toUpperCase();
}

const AVATAR_GRADIENTS = [
  'from-blue-600 to-indigo-700',
  'from-indigo-600 to-violet-700',
  'from-sky-500 to-blue-700',
  'from-cyan-600 to-blue-700',
  'from-emerald-600 to-teal-700'
];

function getGradient(name: string, role?: UserRole): string {
  if (role === 'admin') return 'from-[#1B3168] to-blue-600';
  if (role === 'teacher') return 'from-indigo-600 to-blue-600';
  if (role === 'student') return 'from-sky-500 to-blue-600';
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

export interface UserAvatarProps {
  name: string;
  src?: string | null;
  role?: UserRole;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-10 h-10 text-xs',
  xl: 'w-14 h-14 sm:w-16 sm:h-16 text-lg'
};

const ROUNDED_CLASSES: Record<NonNullable<UserAvatarProps['rounded']>, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full'
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  src,
  role,
  size = 'md',
  rounded = 'lg',
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const baseCls = `${SIZE_CLASSES[size]} ${ROUNDED_CLASSES[rounded]} shrink-0 select-none`;
  const cleanSrc = (src || '').trim();

  if (cleanSrc && !imgError) {
    return (
      <img
        src={cleanSrc}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${baseCls} object-cover ${className}`}
      />
    );
  }

  const initials = getInitials(name);
  const gradient = getGradient(name, role);

  return (
    <div
      role="img"
      aria-label={`${name} avatar (${initials})`}
      className={`${baseCls} bg-gradient-to-br ${gradient} text-white font-bold tracking-tight flex items-center justify-center shadow-xs ${className}`}
    >
      {initials}
    </div>
  );
};
