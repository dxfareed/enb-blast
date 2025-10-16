'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import WeeklyCountdown from '@/app/components/WeeklyCountdown';
import Loader from '@/app/components/Loader';
import { ChevronDown } from 'lucide-react';

type LeaderboardUser = {
  fid: number;
  username: string;
  pfpUrl: string;
  weeklyPoints: string;
  isCurrentUser?: boolean;
  rank?: number;
};

const getRankStyling = (rank: number) => {
  if (rank === 1) return styles.rank1;
  if (rank === 2) return styles.rank2;
  if (rank === 3) return styles.rank3;
  if (rank >= 4 && rank <= 8) return styles.rankSuperBased;
  if (rank >= 9 && rank <= 15) return styles.rankBased;
  return styles.rankDefault;
};

const prizePoolAmount = 250000;

export default function LeaderboardPage() {
  const { userProfile } = useUser();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  
  // This state will hold the full user object from the API's `currentUser` property
  const [myRank, setMyRank] = useState<LeaderboardUser | null>(null);

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
      // We wait until we have the user's FID to make the API call
      if (!userProfile?.fid) {
        setIsLoading(true); // Keep showing loader until we have a FID
        return;
      }
      
      setIsLoading(true);
      try {
        // Make ONE API call to your existing endpoint, passing the user's FID
        const response = await fetch(`/api/leaderboard?fid=${userProfile.fid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        
        const data = await response.json();
        
        // Set the Top 100 list
        const rankedData = (data.topUsers || []).map((user: any, index: number) => ({ ...user, rank: index + 1 }));
        setLeaderboardData(rankedData);
        
        // Set the current user's data from the `currentUser` object in the API response
        if (data.currentUser) {
          setMyRank(data.currentUser);
        } else {
          setMyRank(null);
        }
        
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLeaderboard();
  }, [userProfile?.fid]); // This effect runs only when the FID is available

  const handleViewProfile = async (fid: number) => {
    try {
      await sdk.actions.viewProfile({ fid });
    } catch (error) {
      console.error('Failed to open profile:', error);
      // Optionally, show a toast message to the user
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className={styles.leaderboardContainer}>
      <div className={styles.headerContainer}>
        <h5 className={styles.title}>Rewards</h5>
        <div className={styles.subHeader}>
          <div className={styles.prizePool}>
            <span className={styles.cardLabel}>PRIZE POOL</span>
            <span className={styles.cardValue}>{prizePoolAmount.toLocaleString()} $CAP</span>
          </div>
          <div className={styles.countdown}>
            <span className={styles.cardLabel}>TIME LEFT</span>
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
                  <p className={styles.tierReward}>26k $CAP</p>
                </div>
                <div className={styles.tier}>
                  <p className={`${styles.tierRank} ${styles.superBasedText}`}>SuperBased 4 - 10</p>
                  <p className={styles.tierReward}>17k $CAP</p>
                </div>
                <div className={styles.tier}>
                  <p className={`${styles.tierRank} ${styles.basedText}`}>Based 11 - 15</p>
                  <p className={styles.tierReward}>8k $CAP</p>
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
              className={`${styles.userRow} ${user.username === userProfile?.username ? styles.currentUser : ''}`}
              onClick={() => handleViewProfile(user.fid)}
              style={{ cursor: 'pointer' }}
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

      {myRank && (
        <div className={styles.currentUserFooter}>
           {myRank.rank && (
              <div className={`${styles.rankCircle} ${getRankStyling(myRank.rank)}`}>
                  {myRank.rank}
              </div>
            )}
              <img
                src={myRank.pfpUrl || '/icon.png'}
                alt={`${myRank.username}'s profile picture`}
                className={styles.pfp}
                width={48}
                height={48}
              />
              <div className={styles.userInfo}>
                <p className={styles.username}>Your Rank</p>
              </div>
              <div className={styles.scoreInfo}>
                <p className={styles.score}>{parseInt(myRank.weeklyPoints, 10).toLocaleString()}</p>
                <p className={styles.scoreLabel}>points</p>
              </div>
        </div>
      )}
    </div>
  );
}