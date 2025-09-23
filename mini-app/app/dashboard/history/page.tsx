'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import { ExternalLink } from 'lucide-react';

type Claim = {
  id: string;
  txHash: string;
  amount: string;
  timestamp: string;
};

export default function HistoryPage() {
  const { fid } = useUser();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fid) {
      setIsLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/user/history?fid=${fid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch claim history');
        }
        const data: Claim[] = await response.json();
        setClaims(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [fid]);

  const renderContent = () => {
    if (isLoading) {
      return <p>Loading history...</p>;
    }
    if (error) {
      return <p>Error: {error}</p>;
    }
    if (claims.length === 0) {
      return <p>You have no claim history yet.</p>;
    }
    return (
      <div className={styles.claimsList}>
        {claims.map((claim) => (
          <div key={claim.id} className={styles.claimItem}>
            <div className={styles.claimInfo}>
              <p className={styles.claimLabel}>Claimed Tokens</p>
              <p className={styles.claimTimestamp}>
                {new Date(claim.timestamp).toLocaleString()}
              </p>
              <a 
                href={`https://basescan.org/tx/${claim.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
              >
                View Transaction <ExternalLink size={14} />
              </a>
            </div>
            <p className={styles.amount}>+ {Number(claim.amount).toLocaleString()}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.historyContainer}>
      <h1 className={styles.title}>Claim History</h1>
      {renderContent()}
    </div>
  );
}