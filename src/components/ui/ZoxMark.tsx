'use client';

import React from 'react';

interface ZoxMarkProps {
  size?: number;
  className?: string;
}

export default function ZoxMark({ size = 32, className = '' }: ZoxMarkProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 border-2 border-primary rounded-lg opacity-80 rotate-45"
        style={{ boxShadow: `0 0 ${size * 0.28}px rgba(139, 92, 246, 0.25)` }}
      />
      <div
        className="absolute border-2 border-accent rounded-md opacity-80"
        style={{ inset: size * 0.09 }}
      />
      <div
        className="absolute bg-accent rounded-full pulse-dot"
        style={{ width: Math.max(4, size * 0.12), height: Math.max(4, size * 0.12) }}
      />
    </div>
  );
}
