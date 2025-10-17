'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

// Based on your Prisma schema
type UserProfile = {
  id: string;
  walletAddress: string;
  fid: number;
  username: string | null;
  pfpUrl: string | null;
  streak: number;
  level: number;
  highScore: number;
  totalClaimed: string; // Decimal is stringified
  totalPoints: string;   // BigInt is stringified
  weeklyPoints: string;  // BigInt is stringified
  claimsToday: number;
  lastClaimDate: string | null; // DateTime is stringified
  lastClaimedAt: string | null; // DateTime is stringified
  lastMultiplierUsedAt: string | null; // DateTime is stringified
  registrationStatus: 'PENDING' | 'ACTIVE';
  createdAt: string;     // DateTime is stringified
  weeklyRank: number;
  verifiedWallets: string[]; 
  notificationToken: string | null;
};

type UserContextType = {
  fid: number | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  refetchUserProfile: () => Promise<UserProfile | null>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = useCallback(async (currentFid: number, onSuccess?: () => void) => {
    try {
      const response = await fetch(`/api/user/profile?fid=${currentFid}`);
      if (response.ok) {
        const profileData = await response.json();
        setUserProfile(profileData);
        if (onSuccess) {
          onSuccess();
        }
        return profileData;
      } else {
        console.error("Failed to fetch user profile:", response.statusText);
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUserProfile(null);
    }
    return null;
  }, []);

  useEffect(() => {
    async function getFarcasterUser() {
      setIsLoading(true);
      try {
        const { user } = await sdk.context;
        if (user && user.fid) {
          setFid(user.fid);
          await fetchUserProfile(user.fid);
        }
      } catch (error) {
        console.error("Failed to get Farcaster user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getFarcasterUser();
  }, [fetchUserProfile]);

  const refetchUserProfile = useCallback(async () => {
    if (fid) {
      return await fetchUserProfile(fid);
    }
    return null;
  }, [fid, fetchUserProfile]);

  const value = { fid, userProfile, isLoading, refetchUserProfile };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

type UseUserOptions = {
  onSuccess?: () => void;
};

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}