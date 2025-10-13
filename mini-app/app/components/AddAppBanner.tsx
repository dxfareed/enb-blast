'use client';

import { useState, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './AddAppBanner.module.css';
import { useUser } from '@/app/context/UserContext';

export default function AddAppBanner({ onAppAdded }: { onAppAdded: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [result, setResult] = useState("");
  const { userProfile } = useUser();

  const handleAddApp = useCallback(async () => {
    setIsAdding(true);
    setResult('');
    try {
      const response = await sdk.actions.addMiniApp();
      console.log('addMiniApp response:', response);

      if (response.notificationDetails) {
        setResult("Mini App added with notifications enabled!");
        await sdk.quickAuth.fetch('/api/user/notification-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationToken: response.notificationDetails }),
        });
        onAppAdded();
      } else {
        setResult("Mini App added without notifications");
        onAppAdded();
      }
    } catch (error) {
      console.error("Error attempting to add app:", error);
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsAdding(false);
    }
  }, [onAppAdded]);

  if (userProfile?.notificationToken) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <p className={styles.bannerText}>
        {result || "Add ENB Blast\u00a0\u00a0\u00a0"}
      </p>
      <button onClick={handleAddApp} disabled={isAdding} className={styles.addButton}>
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}


/* 
'use client';

import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './AddAppBanner.module.css';
import { useUser } from '@/app/context/UserContext';

export default function AddAppBanner({ onAppAdded }: { onAppAdded: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const { userProfile } = useUser();

  const handleAddApp = async () => {
    setIsAdding(true);
    try {
      const result = await sdk.actions.addMiniApp();
      if (result) {
        const newContext = await sdk.context;
        if (newContext.client.notificationDetails?.token) {
          await sdk.quickAuth.fetch('/api/user/notification-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationToken: newContext.client.notificationDetails }),
          });
        }
        onAppAdded();
      }
    } catch (error) {
      console.error("Error attempting to add app:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (userProfile?.notificationToken) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <p className={styles.bannerText}>Add ENB Blast&nbsp;&nbsp;&nbsp;</p>
      <button onClick={handleAddApp} disabled={isAdding} className={styles.addButton}>
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}

*/