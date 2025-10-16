"use client";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { UserProvider } from '@/app/context/UserContext';
import { MiniAppProvider } from "@neynar/react";
import { sdk } from "@farcaster/miniapp-sdk";

import { usePathname, useRouter } from "next/navigation";
import { getWeekIdentifier } from "./utils/time";

const queryClient = new QueryClient();

function WeeklyLeaderboardRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const now = new Date();
    const currentWeekIdentifier = getWeekIdentifier(now);
    const lastSeenIdentifier = localStorage.getItem('lastSeenWeeklyLeaderboard');

    // Check if it's time to show the leaderboard
    // It's Thursday 16:00 UTC or later, and we haven't seen this week's board
    if (now >= currentWeekIdentifier && lastSeenIdentifier !== currentWeekIdentifier.toISOString()) {
       // And we are not already on that page
      if (pathname !== '/weekly-leaderboard') {
        router.replace('/weekly-leaderboard');
      }
    }
  }, [pathname, router]);

  return null;
}

export function RootProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true)
    sdk.actions.ready({disableNativeGestures: true});
  }, []);
  
  // sdk.actions.addMiniApp()
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniAppProvider>
          <UserProvider>
            <WeeklyLeaderboardRedirect />
            {mounted && children}
          </UserProvider>
        </MiniAppProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}