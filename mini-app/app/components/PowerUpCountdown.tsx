
'use client';

import { useState, useEffect } from 'react';

type PowerUpCountdownProps = {
  expiration: string;
};

const PowerUpCountdown = ({ expiration }: PowerUpCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const expirationDate = new Date(expiration);
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiration]);

  return (
    <div style={{ marginTop: '10px', color: '#fff', fontSize: '14px' }}>
      activated til: <b>{timeLeft}</b>
    </div>
  );
};

export default PowerUpCountdown;
