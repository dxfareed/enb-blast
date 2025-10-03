'use client';

import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './AddAppBanner.module.css';
import { useUser } from '@/app/context/UserContext';

export default function AddAppBanner() {
  const [isAdding, setIsAdding] = useState(false);
  const { userProfile } = useUser();

  const handleAddApp = async () => {
    setIsAdding(true);
    try {
      const result = await sdk.actions.addFrame();
    } catch (error) {
      console.error("Error attempting to add app:", error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className={styles.banner}>
      <p className={styles.bannerText}>Add this app to what's next!</p>
      <button onClick={handleAddApp} disabled={isAdding} className={styles.addButton}>
        {isAdding ? 'Adding...' : 'Add App'}
      </button>
    </div>
  );
}
