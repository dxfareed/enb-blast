// app/components/GameInfoModal.tsx
'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './GameInfoModal.module.css';

interface GameInfoModalProps {
  show: boolean;
  onClose: () => void;
}

// Data for the items shown in the modal
const gameItems = [
  {
    imgSrc: '/Enb_000.png',
    name: '+6 Points',
    effect: 'The standard collectible. Grab these to increase your score.',
  },
  {
    imgSrc: '/powerup_2.png',
    name: '+12 Points',
    effect: 'A rare collectible that gives a small score boost.',
  },
  {
    imgSrc: '/powerup_5.png',
    name: '+20 Points',
    effect: 'A very rare collectible that gives a medium score boost.',
  },
  {
    imgSrc: '/powerup_10.png',
    name: '+30 Points',
    effect: 'The rarest collectible for a huge score boost!',
  },
  {
    imgSrc: '/pumpkin.png',
    name: '+500 Points',
    effect: 'A rare seasonal collectible that gives a massive score boost!',
  },
  {
    imgSrc: '/bomb.png',
    name: 'Wormhole (Avoid!)',
    effect: 'Hitting this will reset your score to zero. Stay away!',
  },
];

const GameInfoModal = ({ show, onClose }: GameInfoModalProps) => {
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
  }, [onClose]);
  
  if (!show) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>
        <h3>Game Items Guide</h3>
        <p className={styles.subtitle}>Here are the items you'll encounter in the game:</p>
        <div className={styles.infoGrid}>
          {gameItems.map((item) => (
            <div key={item.name} className={styles.infoItem}>
              <img src={item.imgSrc} alt={item.name} className={styles.itemImage} />
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

export default GameInfoModal;