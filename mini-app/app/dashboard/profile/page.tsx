'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import styles from './page.module.css';
import { useUser } from '@/app/context/UserContext';

type UserProfile = {
  username: string;
  pfpUrl: string;
  streak: number;
  level: number;
  totalClaimed: string;
};

export default function ProfilePage() {
  const { fid, isLoading: isUserLoading } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fid) {
      if (!isUserLoading) setIsLoading(false);
      return;
    }
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/user/profile?fid=${fid}`);
        if (!response.ok) throw new Error('Failed to fetch profile data');
        const data: UserProfile = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [fid, isUserLoading]);

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
            <p className={styles.levelLabel}>Level</p>
            <p className={styles.levelValue}>Level {profile.level}</p>
        </div>
      </div>
    </div>
  );
}