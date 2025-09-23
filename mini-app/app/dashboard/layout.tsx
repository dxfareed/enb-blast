import Link from 'next/link';
import { Home, Trophy, History, User } from 'lucide-react';
import styles from './layout.module.css';
import TokenBalanceDisplay from '@/app/components/TokenBalanceDisplay';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userData = {
    tokens: 250,
  };

  return (
    <div className={styles.container}>
      <div className={styles.appWrapper}>

        {/* === TOP BAR === */}
        <header className={styles.header}>
         {/*  <div className={styles.tokenDisplay}>
            <div role="status" aria-label={`${userData.tokens} tokens`} className={styles.tokenBadge}>
              {userData.tokens} $TOKENS
            </div>
          </div> */}
           <TokenBalanceDisplay />
          {/* If you need vertical space reserve a height-only element (no visible text): */}
          <div aria-hidden className={styles.spacer} />
        </header>

        <main className={styles.main}>
          {children}
        </main>

        {/* BOTTOM NAVIGATION */}
        <nav className={styles.navigation}>
          <Link href="/dashboard/game" className={styles.navLink}>
            <Home size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Home</span>
          </Link>
          <Link href="/dashboard/leaderboard" className={styles.navLink}>
            <Trophy size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Leaderboard</span>
          </Link>
          <Link href="/dashboard/history" className={styles.navLink}>
            <History size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>History</span>
          </Link>
          <Link href="/dashboard/profile" className={styles.navLink}>
            <User size={28} className={styles.navIcon} />
            <span className={styles.navLabel}>Me</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
