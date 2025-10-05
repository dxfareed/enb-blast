'use client';

import { useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
//import { useMiniApp } from '@neynar/react';
import styles from './AddAppBanner.module.css';

export default function AddAppBanner({ onAppAdded }: { onAppAdded: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  //const { context, added} = useMiniApp();
  const handleAddApp = async () => {
    setIsAdding(true);
    try {
      const result = await sdk.actions.addFrame();
      if (result) {
        const newContext = await sdk.context;
        //console.log("New context after adding app:", newContext);
        if (newContext.client.notificationDetails?.token) {
          await sdk.quickAuth.fetch('/api/user/notification-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notificationToken: newContext.client.notificationDetails.token }),
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

  return (
    <div className={styles.banner}>
      <p className={styles.bannerText}>Add ENB Blast&nbsp;&nbsp;&nbsp;</p>
      <button onClick={handleAddApp} disabled={isAdding} className={styles.addButton}>
        {isAdding ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}
