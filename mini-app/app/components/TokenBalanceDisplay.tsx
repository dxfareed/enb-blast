'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { TOKEN_ADDRESS } from '@/app/utils/constants';
import styles from './TokenBalanceDisplay.module.css';

export default function TokenBalanceDisplay() {
  const [hasMounted, setHasMounted] = useState(false);
  const { address, isConnected } = useAccount();

  const { data: balanceData, isLoading } = useBalance({
    address: address,
    token: TOKEN_ADDRESS,
    query: {
      refetchInterval: 5000,
    },
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className={styles.tokenBadge}>...</div>;
  }

  if (!isConnected) {
    return <div className={styles.tokenBadge}>Not Connected</div>;
  }

  if (isLoading) {
    return <div className={styles.tokenBadge}>Loading...</div>;
  }

  const formattedBalance = balanceData ? Number(balanceData.formatted).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

  return (
    <div className={styles.tokenBadge}>
      {formattedBalance} ${balanceData?.symbol || 'USDC'}
    </div>
  );
}