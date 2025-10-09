// app/components/TokenBalanceDisplay.tsx
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
      enabled: isConnected,
    },
  });

  useEffect(() => {
    if (isError) {
      console.log("Balance fetch error, retrying in 3 seconds...");
      const timer = setTimeout(() => {
        refetch();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isError, refetch]);

  // Use a shared style for loading/connecting states
  const statusStyle = `${styles.balanceContainer} ${styles.statusText}`;

  if (isConnecting) {
    return <div className={statusStyle}>Connecting...</div>;
  }

  if (!isConnected) {
    return <div className={statusStyle}>Not Connected</div>;
  }

  if (isLoading || isError) {
    return <div className={statusStyle}>Loading...</div>;
  }

  const formattedBalance = balanceData ? Number(balanceData.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    // MODIFIED: Use new class names for a text-based display
    <div className={styles.balanceContainer}>
      {/* Optional: Add the token icon here
      <Image src="/path/to/enb-token-icon.svg" alt="ENB Token" width={24} height={24} /> 
      */}
      <span className={styles.balanceAmount}>{formattedBalance}</span>
      <span className={styles.balanceSymbol}> ${balanceData?.symbol || 'ENB'}</span>
    </div>
  );
}