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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timeoutId = setTimeout(() => {
      const now = new Date();
      const currentWeekIdentifier = getWeekIdentifier(now);
      const lastSeenIdentifier = localStorage.getItem(
        'lastSeenWeeklyLeaderboard_v6'
      );

      console.log('--- WeeklyLeaderboardRedirect (delayed) ---');
      console.log('Pathname:', pathname);
      console.log('Now:', now.toISOString());
      console.log('Current Week Identifier:', currentWeekIdentifier.toISOString());
      console.log('Last Seen Identifier:', lastSeenIdentifier);

      const shouldShowLeaderboard =
        now >= currentWeekIdentifier &&
        lastSeenIdentifier !== currentWeekIdentifier.toISOString();

      console.log('Should show leaderboard?', shouldShowLeaderboard);

      if (shouldShowLeaderboard) {
        if (pathname !== '/weekly-leaderboard') {
          console.log('Redirecting to /weekly-leaderboard');
          router.replace('/weekly-leaderboard');
        } else {
          console.log('Already on /weekly-leaderboard, not redirecting.');
        }
      } else {
          console.log('Condition not met, not redirecting.');
      }
      console.log('---------------------------------');
    }, 6000); // 500ms delay to allow state to stabilize

    return () => clearTimeout(timeoutId);
  }, [pathname, router, mounted]);

  return null;
}

export function RootProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true)
    sdk.actions.ready({ disableNativeGestures: true });
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