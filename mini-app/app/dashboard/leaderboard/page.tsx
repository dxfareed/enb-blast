'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import WeeklyCountdown from '@/app/components/WeeklyCountdown';
import Loader from '@/app/components/Loader';
import { ChevronDown } from 'lucide-react';

type LeaderboardUser = {
  username: string;
  pfpUrl: string;
  weeklyPoints: string;
  isCurrentUser?: boolean;
  rank?: number;
};

const getRankStyling = (rank: number) => {
  if (rank === 1) return styles.rank1; // Gold
  if (rank === 2) return styles.rank2; // Silver
  if (rank === 3) return styles.rank3; // Bronze
  if (rank >= 4 && rank <= 8) return styles.rankSuperBased; // Purple
  if (rank >= 9 && rank <= 15) return styles.rankBased; // Blue
  return styles.rankDefault; // Default for others
};

const prizePoolAmount = 300000;

export default function LeaderboardPage() {
  const { userProfile } = useUser();
  const username = userProfile?.username;
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('rewards');

  useEffect(() => {
    const logVisit = async () => {
      try {
        await sdk.quickAuth.fetch('/api/events/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventType: 'LEADERBOARD_VISIT' }),
        });
      } catch (error) {
        console.error("Failed to log leaderboard visit:", error);
      }
    };
    logVisit();
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/leaderboard');
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        const data = await response.json();
        //@ts-ignore
        const rankedData = data.topUsers.map((user, index) => ({ ...user, rank: index + 1 }));
        setLeaderboardData(rankedData);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (username && leaderboardData.length > 0) {
      const currentUserData = leaderboardData.find(user => user.username === username);
      if (currentUserData) {
        setCurrentUser(currentUserData);
      } else {
        setCurrentUser(null);
      }
    }
  }, [username, leaderboardData]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={styles.leaderboardContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Leaderboard</h1>
        <div className={styles.subHeader}>
          <div className={styles.prizePool}>
            <span>{prizePoolAmount.toLocaleString()} $ENB</span>
          </div>
          <div className={styles.countdown}>
            <WeeklyCountdown />
          </div>
        </div>

        <div className={`${styles.infoContainer} ${isInfoExpanded ? styles.expanded : ''}`}>
            <div className={styles.tabSelector}>
              <button
                className={`${styles.tabButton} ${activeTab === 'rewards' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('rewards')}
              >
                Reward Tiers
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'earn' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('earn')}
              >
                How to Earn
              </button>
            </div>
            {activeTab === 'rewards' && (
              <div className={styles.tabContent}>
                <div className={styles.tier}>
                  <p className={`${styles.tierRank} ${styles.legendaryText}`}>Legendary 1 - 3</p>
                  <p className={styles.tierReward}>37k $ENB</p>
                </div>
                <div className={styles.tier}>
                  <p className={`${styles.tierRank} ${styles.superBasedText}`}>SuperBased 4 - 8</p>
                  <p className={styles.tierReward}>24k $ENB</p>
                </div>
                <div className={styles.tier}>
                  <p className={`${styles.tierRank} ${styles.basedText}`}>Based 9 - 15</p>
                  <p className={styles.tierReward}>10k $ENB</p>
                </div>
              </div>
            )}
            {activeTab === 'earn' && (
              <div className={styles.tabContent}>
                <div className={styles.howToEarnItem}><p>Blast ENBs</p></div>
                <div className={styles.howToEarnItem}><p>Complete daily tasks</p></div>
                <div className={styles.howToEarnItem}><p>Upgrade your membership level</p></div>
              </div>
            )}
        </div>

        <div className={styles.expandTrigger} onClick={() => setIsInfoExpanded(!isInfoExpanded)}>
          <span>Details</span>
          <ChevronDown size={20} className={`${styles.chevronIcon} ${isInfoExpanded ? styles.rotated : ''}`} />
        </div>
      </div>

      <div className={styles.userList}>
        {leaderboardData.map((user) => (
            <div
              key={user.rank}
              className={`${styles.userRow} ${user.username === username ? styles.currentUser : ''}`}
            >
              {user.rank && (
                <div className={`${styles.rankCircle} ${getRankStyling(user.rank)}`}>
                  {user.rank}
                </div>
              )}
              <img
                src={user.pfpUrl || '/icon.png'}
                alt={`${user.username}'s profile picture`}
                className={styles.pfp}
                width={48}
                height={48}
              />
              <div className={styles.userInfo}>
                <p className={styles.username}>{user.username}</p>
              </div>
              <div className={styles.scoreInfo}>
                <p className={styles.score}>{parseInt(user.weeklyPoints, 10).toLocaleString()}</p>
                <p className={styles.scoreLabel}>points</p>
              </div>
            </div>
          ))}
      </div>

      {currentUser && (
        <div className={styles.currentUserFooter}>
           {currentUser.rank && (
              // Same here, only the one function call
              <div className={`${styles.rankCircle} ${getRankStyling(currentUser.rank)}`}>
                  {currentUser.rank}
              </div>
            )}
              <img
                src={currentUser.pfpUrl || '/icon.png'}
                alt={`${currentUser.username}'s profile picture`}
                className={styles.pfp}
                width={48}
                height={48}
              />
              <div className={styles.userInfo}>
                <p className={styles.username}>Your Rank</p>
              </div>
              <div className={styles.scoreInfo}>
                <p className={styles.score}>{parseInt(currentUser.weeklyPoints, 10).toLocaleString()}</p>
                <p className={styles.scoreLabel}>points</p>
              </div>
        </div>
      )}
    </div>
  );
}