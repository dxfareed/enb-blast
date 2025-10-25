// app/dashboard/1v1/page.tsx
'use client';

import { Swords } from 'lucide-react';
import styles from './page.module.css';

export default function OneVsOnePage() {
  return (
    <div className={styles.container}>
      <img
        src="/yellow-guy-rich.png"
        width={128}
        height={128}
        alt="Staking"
      />
      {/* <Swords size={64} className={styles.icon} /> */}
      <h1 className={styles.title}>1v1 Challenge</h1>
      <p className={styles.subtitle}>Coming Soon</p>
      <p className={styles.description}>
        Challenge another player in a real-time score attack. You both stake an
        amount, and the winner with the highest score takes all! 💰
        <br />
        May the best blaster triumph!
      </p>
    </div>
  );
}