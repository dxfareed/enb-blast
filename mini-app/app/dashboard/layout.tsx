'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';
import { Home, Trophy, History, User, ClipboardList } from 'lucide-react';
import styles from './layout.module.css';
import TokenBalanceDisplay from '@/app/components/TokenBalanceDisplay';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { fid } = useUser();
  const [hasIncompleteTasks, setHasIncompleteTasks] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!fid) return;

    const checkTaskStatus = async () => {
      try {
        const response = await fetch(`/api/tasks/status?fid=${fid}`);
        if (response.ok) {
          const data = await response.json();
          setHasIncompleteTasks(data.hasIncompleteDailyTasks);
        }
      } catch (error) {
        console.error('Failed to fetch task status:', error);
      }
    };

    checkTaskStatus();
    const interval = setInterval(checkTaskStatus, 30000);
    return () => clearInterval(interval);
  }, [fid]);

  return (
    <div className={styles.container}>
      <div className={styles.appWrapper}>

        {/* === TOP BAR === */}
        <header className={styles.header}>
           <TokenBalanceDisplay />
          <div aria-hidden className={styles.spacer} />
        </header>

        <main className={styles.main}>
          {children}
        </main>

        {/* BOTTOM NAVIGATION */}
        <nav className={styles.navigation}>
          <Link href="/dashboard/game" className={`${styles.navLink} ${pathname === '/dashboard/game' ? styles.navLinkActive : ''}`}>
            <Home size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Home</span>
          </Link>

          <Link href="/dashboard/tasks" className={`${styles.navLink} ${pathname === '/dashboard/tasks' ? styles.navLinkActive : ''}`}>
            <div className={styles.navIconContainer}>
              <ClipboardList size={28} className={styles.navIcon} />
              {hasIncompleteTasks && <div className={styles.notificationDot}></div>}
            </div>
            <span className={styles.navLabel}>Tasks</span>
          </Link>

          <Link href="/dashboard/leaderboard" className={`${styles.navLink} ${pathname === '/dashboard/leaderboard' ? styles.navLinkActive : ''}`}>
            <Trophy size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Leaderboard</span>
          </Link>
          <Link href="/dashboard/profile" className={`${styles.navLink} ${pathname === '/dashboard/profile' ? styles.navLinkActive : ''}`}>
            <User size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Me</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}


