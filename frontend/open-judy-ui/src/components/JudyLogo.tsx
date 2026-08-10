'use client';

import React from 'react';

interface JudyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  systemName?: string;
  subtitle?: string;
  logoUrl?: string;
  bannerColor?: string;
  className?: string;
  textClassName?: string;
}

export default function JudyLogo({
  size = 'md',
  showText = false,
  systemName = 'Open Judy',
  subtitle,
  logoUrl,
  bannerColor = 'var(--accent-color, #e63946)',
  className = '',
  textClassName = '',
}: JudyLogoProps) {
  const sizeMap = {
    sm: { box: 'w-7 h-12', text: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-10 h-18', text: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-12 h-22', text: 'text-lg', sub: 'text-xs' },
    xl: { box: 'w-14 h-26', text: 'text-xl', sub: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Hanging Top Banner (Vertically elongated, solid color, starts at top: 0 with One-Side Triangle Bottom) */}
      <div
        className={`relative ${currentSize.box} shrink-0 flex items-start justify-center transition-transform duration-200 group-hover:scale-105`}
      >
        {logoUrl ? (
          <div className="w-full h-full rounded-b-md overflow-hidden bg-dark-card border border-dark-border flex items-center justify-center">
            <img
              src={logoUrl}
              alt={systemName}
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        ) : (
          /* Clean Minimalist Solid Banner with Elongated Body & One-Side Triangle Bottom */
          <svg
            viewBox="0 0 38 68"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]"
          >
            {/* 1. Solid Color Hanging Banner (Elongated with One-Side Triangle Cut at Bottom) */}
            <path
              d="M 0 0 H 38 V 48 L 0 66 Z"
              fill={bannerColor}
            />

            {/* 2. Minimalist White Justice Scales Emblem */}
            {/* Top Finial */}
            <circle cx="19" cy="14" r="1.6" fill="#ffffff" />

            {/* Central Vertical Shaft */}
            <line
              x1="19"
              y1="14"
              x2="19"
              y2="42"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Fulcrum Pivot Dot */}
            <circle cx="19" cy="22" r="2" fill="#ffffff" />

            {/* Horizontal Balance Beam */}
            <line
              x1="7"
              y1="22"
              x2="31"
              y2="22"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Left Scale: Strings & Pan */}
            <line
              x1="7"
              y1="22"
              x2="3.5"
              y2="32.5"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <line
              x1="7"
              y1="22"
              x2="10.5"
              y2="32.5"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M 2.5 32.5 Q 7 37.5 11.5 32.5 Z"
              fill="#ffffff"
            />

            {/* Right Scale: Strings & Pan */}
            <line
              x1="31"
              y1="22"
              x2="27.5"
              y2="32.5"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <line
              x1="31"
              y1="22"
              x2="34.5"
              y2="32.5"
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <path
              d="M 26.5 32.5 Q 31 37.5 35.5 32.5 Z"
              fill="#ffffff"
            />

            {/* Minimalist Base Pedestal */}
            <line
              x1="11"
              y1="42"
              x2="27"
              y2="42"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Brand Text */}
      {showText && (
        <div className={`flex flex-col min-w-0 truncate ${textClassName}`}>
          <div className="flex items-center leading-none">
            <span className={`font-bold tracking-tight text-white ${currentSize.text} truncate`}>
              {systemName}
            </span>
          </div>
          {subtitle && (
            <span className={`text-dark-muted font-medium mt-1 truncate ${currentSize.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
