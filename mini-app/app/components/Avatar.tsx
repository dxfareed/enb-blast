'use client';

import { forwardRef } from 'react';
import styles from './Avatar.module.css';

type AvatarProps = {
  position: { x: number; y: number; };
  pfpUrl: string;
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({ position, pfpUrl }, ref) => {
  return (
    <div 
      ref={ref}
      className={styles.avatar} 
      style={{ 
        // Using transform for smoother GPU-accelerated movement
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      <img src={pfpUrl} alt="User Avatar" className={styles.avatarImage} />
    </div>
  );
});

Avatar.displayName = 'Avatar';
export default Avatar;