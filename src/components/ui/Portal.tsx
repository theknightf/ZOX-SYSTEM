'use client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body so `position: fixed` overlays escape
 * ancestor containing blocks (backdrop-filter / transform on glass cards).
 */
export default function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, document.body);
}
