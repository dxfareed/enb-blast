'use client';

import styles from './ApologyModal.module.css';

type ApologyModalProps = {
  onClose: () => void;
};

export default function ApologyModal({ onClose }: ApologyModalProps) {
  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <h2>An Important Update!</h2>
        <p>
          To protect our players, we've just completed a major upgrade to our game systems to prevent cheating and ensure fair play for everyone.
        </p>
        <p>
          We apologize for any recent downtime. This upgrade was essential to safeguard your experience and make the game even better. Thanks for your understanding!
        </p>
        <button onClick={onClose} className={styles.closeButton}>
          Got It!
        </button>
      </div>
    </div>
  );
}
