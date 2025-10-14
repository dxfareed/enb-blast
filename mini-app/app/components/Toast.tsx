'use client';

import { useState, useEffect } from 'react';
import styles from './Toast.module.css';

type ToastProps = {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`${styles.toast} ${styles[type]}`}>
      <p>{message}</p>
      <button onClick={onClose} className={styles.closeButton}>&times;</button>
    </div>
  );
}
