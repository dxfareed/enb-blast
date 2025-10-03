'use client';

import { forwardRef } from 'react';
import styles from './Avatar.module.css';

type AvatarProps = {
  position: { x: number; y: number; };
  pfpUrl: string;
  isInvincible?: boolean;
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({ position, pfpUrl, isInvincible }, ref) => {
  return (
    <div 
      ref={ref}
      className={`${styles.avatar} ${isInvincible ? styles.invincibleEffect : ''}`} 
      style={{
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      <img src={pfpUrl} alt="User Avatar" className={styles.avatarImage} />
    </div>
  );
});

Avatar.displayName = 'Avatar';
export default Avatar;