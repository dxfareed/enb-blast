"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/app/context/UserContext";
import styles from "./page.module.css";
import Image from "next/image";
import { getWeekIdentifier } from "@/app/utils/time";
import { sdk } from '@farcaster/miniapp-sdk';
import { formatPoints } from '@/app/utils/format';
import { TOKEN_NAME } from "@/lib/rewardTiers";
import { withRetry } from "@/lib/retry";

interface WeeklyStats {
  fid: string;
  username: string;
  pfpUrl: string;
  weeklyPoints: string;
  rank: number;
  rewardEarned: string;
  rewardToken: string;
}

export default function WeeklyLeaderboardPage() {
  const router = useRouter();
  const { fid, isLoading: isUserLoading } = useUser();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasShared, setHasShared] = useState(false);

  useEffect(() => {
    const weekIdentifier = getWeekIdentifier().toISOString();
    const hasSharedForWeek = localStorage.getItem('hasSharedWeeklyRecap_v6') === weekIdentifier;

    if (hasSharedForWeek) {
      router.replace("/dashboard/game");
    } else {
      localStorage.setItem('lastSeenWeeklyLeaderboard_v6', weekIdentifier);
    }
  }, [router]);

  useEffect(() => {
    const fetchWeeklyStats = async () => {
      if (!fid) {
        setIsLoading(false);
        setError("User not found. Please log in.");
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const operation = async () => {
          const response = await fetch(`/api/leaderboard/history?fid=${fid}`);
          if (response.status >= 500) {
            // Throw to trigger retry for server errors
            throw new Error(`Server error: ${response.status}. Retrying...`);
          }
          return response;
        };

        const response = await withRetry(operation);

        if (!response.ok) {
          // Handle non-retryable client errors
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch your weekly stats");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    if (!isUserLoading) {
      fetchWeeklyStats();
    }
  }, [fid, isUserLoading]);

  const handleContinue = () => {
    router.replace("/dashboard/game");
  };

  const handleShare = async () => {
    if (stats) {
      const params = new URLSearchParams({
        fid: stats.fid,
        username: stats.username,
        pfpUrl: stats.pfpUrl,
        rank: stats.rank.toString(),
        weeklyPoints: stats.weeklyPoints,
        rewardEarned: stats.rewardEarned,
      });
  
      const shareUrl = `/share-frame/leaderboard?${params.toString()}`;
      const fullUrl = `${process.env.NEXT_PUBLIC_URL}${shareUrl}`;
      const text = "Check out my weekly recap on ENB Blast!";
      
      try {
        const result = await sdk.actions.composeCast({
          text: text,
          embeds: [fullUrl],
        });

        if (result?.cast) {
            const weekIdentifier = getWeekIdentifier().toISOString();
            localStorage.setItem('hasSharedWeeklyRecap_v6', weekIdentifier);
            setHasShared(true);
        }

      } catch (error) {
        console.error('Error sharing weekly recap frame:', error);
      }
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>Your Weekly Recap</h1>
      </div>

      {isLoading && <div className={styles.loader}></div>}
      {error && <p className={styles.error}>{error}</p>}

      {!isLoading && !error && stats && (
        <div className={styles.userCard}>
            <Image
                src={stats.pfpUrl || '/icon.png'}
                alt={stats.username || 'User'}
                width={72}
                height={72}
                className={styles.pfp}
            />
            <h2 className={styles.username}>{stats.username}</h2>

            <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Rank</span>
                    <span className={`${styles.statValue} ${styles.rankText}`}>{stats.rank}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Weekly Points</span>
                    <span className={styles.statValue}>{formatPoints(parseInt(stats.weeklyPoints))}</span>
                </div>
                <div className={styles.statItem}>
                    <span className={styles.statLabel}>Reward Earned</span>
                    <span className={`${styles.statValue} ${styles.earnedValue}`}>
                        {formatPoints(parseFloat(stats.rewardEarned))} {stats.rewardToken}
                    </span>
                </div>
            </div>
        </div>
      )}
       
      <div className={styles.buttonContainer}>
        {hasShared || error ? (
          <button onClick={handleContinue} className={styles.continueButton}>
            Continue to Game
          </button>
        ) : (
          <button onClick={handleShare} className={styles.shareButton} disabled={!stats}>
            Share Recap
          </button>
        )}
      </div>
    </div>
  );
}
