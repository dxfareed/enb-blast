// app/dashboard/layout.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';
import { Home, Trophy, User, ClipboardList } from 'lucide-react';
import styles from './layout.module.css';
import TokenBalanceDisplay from '@/app/components/TokenBalanceDisplay';
import HighlightTooltip from '@/app/components/HighlightTooltip';
import { TourProvider } from '@/app/context/TourContext';

const TOOLTIP_STORAGE_KEY = 'hasSeenDashboardTooltip';

const tourSteps = [
  { id: 'token-balance', text: 'This is your current token balance. Keep an eye on it!', position: 'bottom', alignment: 'left' },
  { id: 'sound-toggle', text: 'You can mute or unmute game sounds here.', position: 'bottom', alignment: 'right' },
  { id: 'home', text: 'Play the game and earn points from the home page.', alignment: 'left' },
  { id: 'tasks', text: 'Complete daily tasks to boost your earnings!', alignment: 'center' },
  { id: 'leaderboard', text: 'See how you rank against other players.', alignment: 'center' },
  { id: 'profile', text: 'View your profile and overall progress.', alignment: 'right' },
];

const navItems = [
  { id: 'home', href: '/dashboard/game', icon: Home, label: 'Home' },
  { id: 'tasks', href: '/dashboard/tasks', icon: ClipboardList, label: 'Tasks' },
  { id: 'leaderboard', href: '/dashboard/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { id: 'profile', href: '/dashboard/profile', icon: User, label: 'Me' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile, isLoading } = useUser();
  const [hasIncompleteTasks, setHasIncompleteTasks] = useState(false);
  const pathname = usePathname();
  const [activeTourStep, setActiveTourStep] = useState(-1);

  useEffect(() => {
    if (!isLoading && userProfile) {
      const hasSeenTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);
      if (userProfile.lastClaimDate === null && hasSeenTooltip !== 'true') {
        setActiveTourStep(0);
      }
    }
  }, [userProfile, isLoading]);

  useEffect(() => {
    if (activeTourStep >= 0 && activeTourStep < tourSteps.length) {
      const timer = setTimeout(() => { setActiveTourStep(p => p + 1); }, 2500);
      return () => clearTimeout(timer);
    } else if (activeTourStep >= tourSteps.length) {
      handleDismissTour();
    }
  }, [activeTourStep]);

    useEffect(() => {
    if (!userProfile?.fid) return;

    const checkTaskStatus = async () => {
      try {
        const response = await fetch(`/api/tasks/status?fid=${userProfile.fid}`);
        if (response.ok) {
          const data = await response.json();
          setHasIncompleteTasks(data.hasIncompleteTasks);
        }
      } catch (error) {
        console.error('Failed to fetch task status:', error);
      }
    };

    checkTaskStatus();
    const interval = setInterval(checkTaskStatus, 30000);
    return () => clearInterval(interval);
  }, [userProfile?.fid]);

  const handleDismissTour = () => {
    localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
    setActiveTourStep(-1);
  };

  const tourContextValue = useMemo(() => ({
    activeTourStep,
    tourSteps
  }), [activeTourStep]);

  return (
    <TourProvider value={tourContextValue}>
      <div className={styles.container}>
        {activeTourStep > -1 && (
          <button onClick={handleDismissTour} className={styles.skipButton}>
            Skip Tour
          </button>
        )}

        <div className={styles.appWrapper}>
          <header className={styles.header}>
            <HighlightTooltip
              text={tourSteps.find(step => step.id === 'token-balance')?.text || ''}
              show={tourSteps[activeTourStep]?.id === 'token-balance'}
              position="bottom"
              alignment="left"
            >
              <TokenBalanceDisplay />
            </HighlightTooltip>

            <div aria-hidden className={styles.spacer} />

          </header>

          <main className={styles.main}>
            {children}
          </main>

          <nav className={styles.navigation}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const tourStep = tourSteps.find(step => step.id === item.id);
              return (
                <HighlightTooltip
                  key={item.id}
                  text={tourStep?.text || ''}
                  show={tourSteps[activeTourStep]?.id === item.id}
                  position="top"
                  alignment={tourStep?.alignment as any}
                  
                  // The incorrect 'className' prop has been removed from here
                >
                  <Link href={item.href} className={`${styles.navLink} ${pathname === item.href ? styles.navLinkActive : ''}`}>
                    {item.id === 'tasks' ? (
                      <div className={styles.navIconContainer}>
                        <Icon size={28} className={styles.navIcon} />
                        {hasIncompleteTasks && <div className={styles.notificationDot}></div>}
                      </div>
                    ) : (
                      <Icon size={28} className={styles.navIcon} />
                    )}
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                </HighlightTooltip>
              );
            })}
          </nav>
        </div>
      </div>
    </TourProvider>
  );
}