'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

type UserContextType = {
  fid: number | null;
  isLoading: boolean;
};
const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getFarcasterUser() {
      try {
        const { user } = await sdk.context;
        if (user) {
          setFid(user.fid);
        }
      } catch (error) {
        console.error("Failed to get Farcaster user:", error);
      } finally {
        setIsLoading(false);
      }
    }
    getFarcasterUser();
  }, []);

  const value = { fid, isLoading };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}