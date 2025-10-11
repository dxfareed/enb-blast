'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/context/UserContext';
import { Home, Trophy, User, ClipboardList, Plus} from 'lucide-react';
import styles from './layout.module.css';
import TokenBalanceDisplay from '@/app/components/TokenBalanceDisplay';
import HighlightTooltip from '@/app/components/HighlightTooltip';
import { TourProvider } from '@/app/context/TourContext';
import GameInfoModal from '@/app/components/GameInfoModal';
import Marquee from '@/app/components/Marquee';
import { getTokenMarqueeData, TokenMarqueeRawData } from '@/lib/dexscreener';
import { TOKEN_ADDRESS } from '../utils/constants';
import { sdk } from '@farcaster/miniapp-sdk'

const TOOLTIP_STORAGE_KEY = 'hasSeenDashboardTooltip';

const tourSteps = [
  { id: 'token-balance', text: 'This is your current token balance. Keep an eye on it!', position: 'bottom', alignment: 'left' },
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
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);

  const [tokenData, setTokenData] = useState<TokenMarqueeRawData | null>(null);
  const [isLoadingTokenData, setIsLoadingTokenData] = useState(true);

  useEffect(() => {
    if (!isLoading && userProfile) {
      const hasSeenTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);
      if (userProfile.lastClaimDate === null && hasSeenTooltip !== 'true') {
        setActiveTourStep(0);
      }
    }
  }, [userProfile, isLoading]);

  useEffect(() => {
    const loadTokenData = async () => {
      const data = await getTokenMarqueeData(TOKEN_ADDRESS);

      if (data) {
        setTokenData(data);
      }
      setIsLoadingTokenData(false);
    };

    loadTokenData();

    const fiveMinutesInMs = 5 * 60 * 1000;
    const intervalId = setInterval(loadTokenData, fiveMinutesInMs);

    return () => clearInterval(intervalId);
  }, []);

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

  const handleNextStep = () => {
    if (activeTourStep < tourSteps.length - 1) {
      setActiveTourStep(prev => prev + 1);
    }
  };

  const handleFinishTour = () => {
    handleDismissTour();
    setIsInfoModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsInfoModalVisible(false);
  };

  const tourContextValue = useMemo(() => ({
    activeTourStep,
    tourSteps
  }), [activeTourStep]);

  const isLastStep = activeTourStep === tourSteps.length - 1;

  const buyFunction = async () => {
    try {
      const buyToken = `eip155:8453/erc20:${TOKEN_ADDRESS}`;
      const result = await sdk.actions.swapToken({
        buyToken,
      });

      if (result.success) {
        console.log('Swap successful:', result.swap);
      } else {
        console.error('Swap failed:', result.reason, result.error);
      }
    } catch (error) {
      console.error('An error occurred while trying to swap tokens:', error);
    }
  }

  return (
    <TourProvider value={tourContextValue}>
      <GameInfoModal show={isInfoModalVisible} onClose={handleCloseModal} />
      <div className={styles.container}>
        {activeTourStep > -1 && (
          <button onClick={handleDismissTour} className={styles.skipButton}>
            Skip Tour
          </button>
        )}

        <div className={styles.appWrapper}>
          <header className={styles.header}>
            {/* START: Added Buy Button */}
            <div className={styles.headerLeft}>
              {/* --- MODIFIED CODE START --- */}
              <button onClick={buyFunction} className={styles.buyButton}>
                <Plus size={18} strokeWidth={3} /> {/* Added Icon */}
                <span>BUY $ENB</span> {/* Wrapped text in a span for spacing */}
              </button>
              {/* --- MODIFIED CODE END --- */}
            </div>
            {/* END: Added Buy Button */}

            {/* The existing TokenBalanceDisplay is now wrapped in a right-aligned container */}
            <div className={styles.headerRight}>
              <HighlightTooltip
                text={tourSteps.find(step => step.id === 'token-balance')?.text || ''}
                show={tourSteps[activeTourStep]?.id === 'token-balance'}
                position="bottom"
                alignment="left"
                onNext={handleNextStep}
                isLastStep={false}
              >
                <TokenBalanceDisplay />
              </HighlightTooltip>
            </div>
          </header>

          <Marquee data={tokenData} isLoading={isLoadingTokenData} token={TOKEN_ADDRESS} />

          <main className={styles.main}>
            {children}
          </main>

          <nav className={styles.navigation}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const tourStep = tourSteps.find(step => step.id === item.id);
              const isThisItemTheLastStep = tourStep?.id === tourSteps[tourSteps.length - 1].id;

              return (
                <HighlightTooltip
                  key={item.id}
                  text={tourStep?.text || ''}
                  show={tourSteps[activeTourStep]?.id === item.id}
                  position="top"
                  alignment={tourStep?.alignment as any}
                  onNext={isThisItemTheLastStep ? handleFinishTour : handleNextStep}
                  isLastStep={isThisItemTheLastStep}
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