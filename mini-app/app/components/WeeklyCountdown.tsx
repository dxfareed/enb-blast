'use client';

import { useState, useEffect, useCallback } from 'react';

function getNextThursday4PMUTC(): Date {
  const now = new Date();
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 16, 0, 0, 0));
  const targetDay = 1; // Thursday

  const daysUntilTarget = (targetDay - now.getUTCDay() + 7) % 7;
  
  target.setUTCDate(now.getUTCDate() + daysUntilTarget);

  if (now.getUTCDay() === targetDay && now.getTime() > target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target;
}

export default function WeeklyCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  const updateCountdown = useCallback(() => {
    const targetDate = getNextThursday4PMUTC();
    const now = new Date();
    const difference = targetDate.getTime() - now.getTime();

    if (difference <= 0) {
      setTimeLeft('Resetting now!');
      return;
    }

    const totalHours = Math.floor(difference / (1000 * 60 * 60));
    const totalMinutes = Math.floor(difference / (1000 * 60));
    
    if (totalHours < 1) {
      const minutes = totalMinutes % 60;
      setTimeLeft(`${minutes} min${minutes !== 1 ? 's' : ''}`);
    } else {
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      setTimeLeft(`${days}d, ${hours}h`);
    }
  }, []);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  return (
    <div className="countdown-text">
      {timeLeft}
    </div>
  );
}
