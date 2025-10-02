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
  onNext?: () => void;
  isLastStep?: boolean;
}

const HighlightTooltip = ({
  children,
  text,
  show,
  position = 'top',
  alignment = 'center',
  className = '',
  onNext,
  isLastStep = false,
}: HighlightTooltipProps) => {
  if (!show) {
    if (className) { return <div className={className}>{children}</div>; }
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
        <div className={styles.tooltipActions}>
          <button onClick={onNext} className={styles.nextButton}>
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HighlightTooltip;
