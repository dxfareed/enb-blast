'use client';

import { useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { TOKEN_ADDRESS } from '@/app/utils/constants';
import styles from './TokenBalanceDisplay.module.css';

export default function TokenBalanceDisplay() {
  const { address, isConnected, isConnecting } = useAccount();

  const { data: balanceData, isLoading, isError, refetch } = useBalance({
    address: address,
    token: TOKEN_ADDRESS,
    query: {
      refetchInterval: 5000,
      enabled: isConnected, // Only fetch if connected
    },
  });

  // Effect to auto-retry on error
  useEffect(() => {
    if (isError) {
      console.log("Balance fetch error, retrying in 3 seconds...");
      const timer = setTimeout(() => {
        refetch();
      }, 3000); // 3-second delay

      return () => clearTimeout(timer); // Cleanup timer
    }
  }, [isError, refetch]);

  if (isConnecting) {
    return <div className={styles.tokenBadge}>Connecting...</div>;
  }

  if (!isConnected) {
    return <div className={styles.tokenBadge}>Not Connected</div>;
  }

  // Show loading state while fetching or retrying after an error
  if (isLoading || isError) {
    return <div className={styles.tokenBadge}>Loading...</div>;
  }

  const formattedBalance = balanceData ? Number(balanceData.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <div className={styles.tokenBadge}>
      {formattedBalance} ${balanceData?.symbol || 'ENB'}
    </div>
  );
}