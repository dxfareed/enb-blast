'use client';

// Import useState and useEffect for our fix
import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import styles from './TokenBalanceDisplay.module.css';

const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

export default function TokenBalanceDisplay() {
  // --- THE FIX: PART 1 ---
  // This state will be false on the server and true only after mounting on the client
  const [hasMounted, setHasMounted] = useState(false);
  const { address, isConnected } = useAccount();

  const { data: balanceData, isLoading } = useBalance({
    address: address,
    token: USDC_CONTRACT_ADDRESS,
    watch: true,
  });

  // --- THE FIX: PART 2 ---
  // This effect runs only once on the client, after the component has mounted
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // --- THE FIX: PART 3 ---
  // Before the component has mounted, render a static placeholder.
  // This ensures the server and client render the same thing initially.
  if (!hasMounted) {
    return <div className={styles.tokenBadge}>...</div>;
  }

  // After mounting, we can safely render our dynamic, client-side UI
  if (!isConnected) {
    return <div className={styles.tokenBadge}>Not Connected</div>;
  }

  if (isLoading) {
    return <div className={styles.tokenBadge}>Loading...</div>;
  }

  const formattedBalance = balanceData ? Number(balanceData.formatted).toFixed(2) : '0.00';

  return (
    <div className={styles.tokenBadge}>
      {formattedBalance} {balanceData?.symbol || 'USDC'}
    </div>
  );
}