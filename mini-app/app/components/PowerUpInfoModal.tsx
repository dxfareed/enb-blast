// app/components/PowerUpInfoModal.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import styles from './PowerUpInfoModal.module.css';
import { useUser } from '@/app/context/UserContext';

const powerUpItems = [
  {
    imgSrc: '/shield.jpg',
    name: 'Shield',
    effect: 'Protects you from one wormhole collision.',
  },
  {
    imgSrc: '/magnet.jpg',
    name: 'Magnets',
    effect: 'Automatically collects nearby points for a short time.',
  },
  {
    imgSrc: '', // Placeholder for emoji
    name: 'Time Boost',
    effect: 'Slows down the game for 10 more seconds.',
  },
];

const PowerUpInfoModal = () => {
  const { userProfile, isLoading } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only run logic when user data has finished loading
    if (!isLoading) {
      const hasSeenModal = localStorage.getItem('powerUpInfoModalShown');

      // Show the modal only if the user has NEVER had a power-up and hasn't seen the modal.
      if (!hasSeenModal && userProfile && !userProfile.powerupExpiration) {
        setShow(true);
        localStorage.setItem('powerUpInfoModalShown', 'true');
      }
    }
  }, [userProfile, isLoading]);

  const onClose = () => {
    setShow(false);
  };

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);
  
  if (!show) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>
        <h3>Special Powerups Guide</h3>
        <p className={styles.subtitle}>Mint these special items to boost your score</p>
        <div className={styles.infoGrid}>
          {powerUpItems.map((item) => (
            <div key={item.name} className={styles.infoItem}>
              {item.imgSrc ? (
                <img src={item.imgSrc} alt={item.name} className={styles.itemImage} />
              ) : (
                <span className={styles.itemImage} style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⏰</span>
              )}
              <div className={styles.itemDescription}>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemEffect}>{item.effect}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PowerUpInfoModal;
