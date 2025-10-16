"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import styles from "./page.module.css";
import Image from "next/image";
import { getWeekIdentifier } from "@/app/utils/time";
import { sdk } from '@farcaster/miniapp-sdk';

interface CurrentUserStats {
  fid: string;
  username: string;
  pfpUrl: string;
  weeklyPoints: string;
  rank: number;
  totalClaimed: string;
}

export default function WeeklyLeaderboardPage() {
  const router = useRouter();
  const { fid } = useUser();
  const [currentUser, setCurrentUser] = useState<CurrentUserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShared, setHasShared] = useState(false);

  useEffect(() => {
    const weekIdentifier = getWeekIdentifier().toISOString();
    localStorage.setItem('lastSeenWeeklyLeaderboard', weekIdentifier);
  }, []);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!fid) {
        setIsLoading(false);
        setError("User not found. Please log in.");
        return;
      }
      
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/leaderboard?fid=${fid}`);
        if (!response.ok) {
          throw new Error("Failed to fetch your weekly stats");
        }
        const data = await response.json();
        if (data.currentUser) {
            setCurrentUser(data.currentUser);
        } else {
            setError("You weren't on the leaderboard last week. Keep playing!");
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [fid]);

  const handleContinue = () => {
    router.replace("/dashboard/game");
  };

  const handleShare = async () => {
    if (currentUser) {
      const params = new URLSearchParams({
        fid: currentUser.fid,
        username: currentUser.username,
        pfpUrl: currentUser.pfpUrl,
        rank: currentUser.rank.toString(),
        weeklyPoints: currentUser.weeklyPoints,
        totalClaimed: currentUser.totalClaimed || '0',
      });
  
      const shareUrl = `/share-frame/leaderboard?${params.toString()}`;
      const fullUrl = `${process.env.NEXT_PUBLIC_URL}${shareUrl}`;
      const text = "Check out my weekly recap on ENB Blast!";
      
      try {
        const result = await sdk.actions.composeCast({
          text: text,
          embeds: [fullUrl],
        });

        // Check if the cast was successfully published
        if (result?.cast) {
            setHasShared(true);
        }

      } catch (error) {
        console.error('Error sharing weekly recap frame:', error);
        // Optionally, add an error toast notification here
      }
    }
  };

  const getRankClass = (rank: number) => {
    if (rank === 1 || rank === 2 || rank === 3) return styles.rank1;
    if (rank <= 15) return styles.rankSuperBased;
    if (rank <= 100) return styles.rankBased;
    return styles.rankDefault;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Your Weekly Recap</h1>
      </div>

      {isLoading && <div className={styles.loader}></div>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && currentUser && (
        <div className={styles.userCard}>
            <Image
                src={currentUser.pfpUrl || '/icon.png'}
                alt={currentUser.username || 'User'}
                width={72}
                height={72}
                className={styles.pfp}
            />
            <h2 className={styles.username}>{currentUser.username}</h2>

            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Rank</span>
                    <span className={`${styles.statValue} ${styles.rankText}`}>{currentUser.rank}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Weekly Points</span>
                    <span className={styles.statValue}>{parseInt(currentUser.weeklyPoints).toLocaleString()}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Total Earned</span>
                    <span className={`${styles.statValue} ${styles.earnedValue}`}>
                        {parseFloat(currentUser.totalClaimed || '0').toLocaleString()} $ENB
                    </span>
                </div>
            </div>
        </div>
      )}
       
      <div className={styles.buttonContainer}>
        {!hasShared ? (
            <button onClick={handleShare} className={styles.shareButton} disabled={!currentUser}>
                Share Recap
            </button>
        ) : (
            <button onClick={handleContinue} className={styles.continueButton}>
                Continue to Game
            </button>
        )}
      </div>
    </div>
  );
}