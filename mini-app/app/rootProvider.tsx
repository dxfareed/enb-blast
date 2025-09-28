"use client";
import { ReactNode, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { UserProvider } from '@/app/context/UserContext';
import { sdk } from "@farcaster/miniapp-sdk";

const queryClient = new QueryClient();

export function RootProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true)
    sdk.actions.ready();
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          {mounted && children}
        </UserProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}