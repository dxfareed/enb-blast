'use client';

import { useState, useEffect } from 'react';
import { Star, BarChart2, Droplets } from 'lucide-react';
import styles from './page.module.css';
import { useUser } from '@/app/context/UserContext';
import { useAccount, useReadContract } from 'wagmi';
import {
  TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
  TOKEN_MEMBERSHIP_CONTRACT_ABI,
  TOKEN_MEMBERSHIP_LEVELS
} from '@/app/utils/constants';
import Loader from '@/app/components/Loader';

type UserProfile = {
  username: string;
  pfpUrl: string;
  streak: number;
  totalPoints: string;
  totalClaimed: string;
  weeklyRank?: number; 
};

export default function ProfilePage() {
  const { userProfile, isLoading: isUserLoading } = useUser();
  const { address } = useAccount();

  const { data: membershipData, isLoading: isContractLoading } = useReadContract({
    address: TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
    abi: TOKEN_MEMBERSHIP_CONTRACT_ABI,
    functionName: 'userAccounts',
    args: [address],
    query: { enabled: !!address },
  });

  const membershipLevelName = membershipData
    ? TOKEN_MEMBERSHIP_LEVELS[Number((membershipData as any)[4])] || "Unknown"
    : "Loading...";

  const isLoading = isUserLoading || (!!address && isContractLoading);

  if (isLoading) return <Loader />;
  if (!userProfile) return <div>Could not find user profile.</div>;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profilePicture}>
        <img
          src={userProfile.pfpUrl || '/default-pfp.png'}
          alt={`${userProfile.username}'s profile picture`}
          width={128}
          height={128}
          style={{ borderRadius: '9999px', objectFit: 'cover' }}
        />
      </div>
      <h2 className={styles.username}>@{userProfile.username}</h2>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.streakCard}`}>
          <p className={styles.statLabel}>Streak</p>
          <p className={styles.statValue}>🔥 {userProfile.streak}</p>
        </div>
        <div className={`${styles.statCard} ${styles.pointsCard}`}>
          <p className={styles.statLabel}>Total Points</p>
          <p className={styles.statValue}>{Number(userProfile.totalPoints).toLocaleString()}</p>
        </div>
        <div className={`${styles.statCard} ${styles.rankCard}`}>
          <p className={styles.statLabel}>Weekly Rank</p>
          <p className={styles.statValue}><BarChart2 size={28} /> #{userProfile.weeklyRank}</p>
        </div>
        <div className={`${styles.statCard} ${styles.claimedCard}`}>
          <p className={styles.statLabel}>Total Claimed</p>
          <p className={styles.statValue}>{/* <Droplets size={28} /> */} {Number(userProfile.totalClaimed).toFixed(2)}</p>
        </div>
      </div>

      <div className={styles.levelCard}>
        <div className={styles.levelIconWrapper}>
          <Star size={24} />
        </div>
        <div>
          <p className={styles.levelLabel}>Membership Level</p>
          <p className={styles.levelValue}>{membershipLevelName}</p>
        </div>
      </div>
    </div>
  );
}
