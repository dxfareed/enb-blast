'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import styles from './page.module.css';
import { useUser } from '@/app/context/UserContext';
import { useAccount, useReadContract } from 'wagmi';
import {
  TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
  TOKEN_MEMBERSHIP_CONTRACT_ABI,
  TOKEN_MEMBERSHIP_LEVELS
} from '@/app/utils/constants';

type UserProfile = {
  username: string;
  pfpUrl: string;
  streak: number;
  totalClaimed: string;
};

export default function ProfilePage() {
  const { fid } = useUser();
  const { address } = useAccount();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isApiLoading, setIsApiLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: membershipData, isLoading: isContractLoading } = useReadContract({
    address: TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
    abi: TOKEN_MEMBERSHIP_CONTRACT_ABI,
    functionName: 'userAccounts',
    args: [address],
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (!fid) {
      setIsApiLoading(false);
      return;
    }
    const fetchProfile = async () => {
      setIsApiLoading(true);
      try {
        const response = await fetch(`/api/user/profile?fid=${fid}`);
        if (!response.ok) throw new Error('Failed to fetch profile data');
        setProfile(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error');
      } finally {
        setIsApiLoading(false);
      }
    };
    fetchProfile();
  }, [fid]);

  const membershipLevelName = membershipData
    ? TOKEN_MEMBERSHIP_LEVELS[Number((membershipData as any)[4])] || "Unknown"
    : "Loading...";

  const isLoading = isApiLoading || (!!address && isContractLoading);

  if (isLoading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>Could not find user profile.</div>;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profilePicture}>
        <img
          src={profile.pfpUrl}
          alt={`${profile.username}'s profile picture`}
          width={128}
          height={128}
          style={{ borderRadius: '9999px', objectFit: 'cover' }}
        />
      </div>
      <h2 className={styles.username}>@{profile.username}</h2>
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.streakCard}`}>
          <p className={styles.statLabel}>Streak</p>
          <p className={styles.statValue}>🔥 {profile.streak}</p>
        </div>
        <div className={`${styles.statCard} ${styles.totalCard}`}>
          <p className={styles.statLabel}>Total Claimed</p>
          <p className={styles.statValue}>{Number(profile.totalClaimed).toLocaleString()}</p>
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