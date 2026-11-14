import React, { useState, useEffect } from 'react';

export const AnimatedCounter: React.FC<{ value: number; duration?: number; suffix?: string }> = ({
  value,
  duration = 600,
  suffix = ""
}) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const animId = requestAnimationFrame(() => {
        setDisplayValue(value);
      });
      return () => cancelAnimationFrame(animId);
    }

    const start = 0;
    const end = value;
    if (start === end) {
      const animId = requestAnimationFrame(() => {
        setDisplayValue(end);
      });
      return () => cancelAnimationFrame(animId);
    }

    const startTime = performance.now();
    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        setDisplayValue(end);
      }
    };

    const animId = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animId);
  }, [value, duration]);

  return <span>{displayValue}{suffix}</span>;
};
