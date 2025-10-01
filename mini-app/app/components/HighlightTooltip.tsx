// app/components/HighlightTooltip.tsx
'use client';

import React from 'react';
import styles from './HighlightTooltip.module.css';

interface HighlightTooltipProps {
  children: React.ReactNode;
  text: string;
  show: boolean;
  position?: 'top' | 'bottom';
  alignment?: 'center' | 'left' | 'right';
  className?: string;
}

const HighlightTooltip = ({
  children,
  text,
  show,
  position = 'top',
  alignment = 'center',
  className = '',
}: HighlightTooltipProps) => {
  if (!show) {
    if (className) {
      return <div className={className}>{children}</div>;
    }
    return <>{children}</>;
  }

  const alignmentClass = {
    left: styles.alignLeft,
    right: styles.alignRight,
    center: '',
  }[alignment];

  return (
     <div className={`${styles.tooltipContainer} ${className}`}>
      {children}
      <div className={styles.highlightCircle}></div>
      <div
        className={`${styles.tooltipBox} ${
          position === 'top' ? styles.tooltipTop : styles.tooltipBottom
        } ${alignmentClass}`}
      >
        {text}
      </div>
    </div>
  );
};

export default HighlightTooltip;