'use client';

import { useState, useEffect } from 'react';
import { Star, BarChart2, Droplets, Share } from 'lucide-react';
import styles from './page.module.css';
import { useUser } from '@/app/context/UserContext';
import { useAccount, useReadContract } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk'; // Added sdk import
import {
  TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
  TOKEN_MEMBERSHIP_CONTRACT_ABI,
  TOKEN_MEMBERSHIP_LEVELS
} from '@/app/utils/constants';
import Loader from '@/app/components/Loader';
import AppListModal from '@/app/components/AppListModal'; // Importing the AppListModal component

type UserProfile = {
  username: string;
  pfpUrl: string;
  streak: number;
  totalPoints: string;
  totalClaimed: string;
  weeklyRank?: number;
  fid: number;
};

export default function ProfilePage() {
  const { userProfile, isLoading: isUserLoading, refetchUserProfile } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    // If the user profile is not loaded and we are not currently loading,
    // it might be a new user who just navigated here. Let's try fetching.
    if (!userProfile && !isUserLoading) {
      refetchUserProfile();
    }
  }, [userProfile, isUserLoading, refetchUserProfile]);

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

  const handleShare = async () => {
    if (!userProfile) {
      console.error("User profile is not loaded yet.");
      return
    };

    const appUrl = process.env.NEXT_PUBLIC_URL || '';
    const shareUrl = new URL(`${appUrl}/share-frame`);

    shareUrl.searchParams.append('fid', String(userProfile.fid));
    shareUrl.searchParams.append('username', userProfile.username || '');
    shareUrl.searchParams.append('pfpUrl', userProfile.pfpUrl || '');
    shareUrl.searchParams.append('streak', String(userProfile.streak));
    shareUrl.searchParams.append('claimed', userProfile.totalClaimed);
    shareUrl.searchParams.append('weeklyPoints', userProfile.totalPoints); // Use totalPoints for weeklyPoints in frame
    if (userProfile.weeklyRank !== undefined) {
      shareUrl.searchParams.append('rank', String(userProfile.weeklyRank));
    }

    const finalShareUrl = shareUrl.toString();
    const castText = `Check out my ENB Blast Stats!`; // Generic text for profile share

    try {
      await sdk.actions.composeCast({
        text: castText,
        embeds: [finalShareUrl],
      });
      console.log('Profile frame shared successfully!');
      // Optionally, add a toast notification here
    } catch (error) {
      console.error('Error sharing profile frame:', error);
      // Optionally, add an error toast notification here
    }
  };

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
      <h2 className={styles.username}>@{userProfile.username}
        <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: '8px' }} title="Share Profile">
          <Share size={19} color="rgba(31, 105, 241, 1)" />
        </button>
      </h2>
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
      <div className={styles.exploreFooter} onClick={() => setIsModalOpen(true)}>
        <p>Explore more ENB Apps</p>
      </div>
      {isModalOpen && <AppListModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
