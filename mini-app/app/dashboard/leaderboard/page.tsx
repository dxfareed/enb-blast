'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import WeeklyCountdown from '@/app/components/WeeklyCountdown';
import { DollarSign } from 'lucide-react';
import Loader from '@/app/components/Loader';

type LeaderboardUser = {
  username: string;
  pfpUrl: string;
  weeklyPoints: string;
  isCurrentUser?: boolean;
  rank?: number;
};

const getRankStyling = (rank: number) => {
  switch (rank) {
    case 1: return styles.rank1;
    case 2: return styles.rank2;
    case 3: return styles.rank3;
    default: return styles.rankDefault;
  }
};

const prizePoolAmount = 100000;

export default function LeaderboardPage() {
  const { userProfile } = useUser();
  const username = userProfile?.username;
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        const data: LeaderboardUser[] = await response.json();
        const rankedData = data.map((user, index) => ({ ...user, rank: index + 1 }));
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
            {/* <DollarSign size={16}/>ENB */}
          </div>
          <div className={styles.countdown}>
            <WeeklyCountdown />
          </div>
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