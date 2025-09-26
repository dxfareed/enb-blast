'use client';

import { useState, useEffect, useCallback } from 'react';

function getNextTuesday5PM(): Date {
  const now = new Date();
  const target = new Date(now.getTime());
  const targetDay = 2;
  const targetHour = 17;

  const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
  
  target.setDate(now.getDate() + daysUntilTarget);
  target.setHours(targetHour, 0, 0, 0);

  if (now.getDay() === targetDay && now.getTime() > target.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target;
}

export default function WeeklyCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  const updateCountdown = useCallback(() => {
    const targetDate = getNextTuesday5PM();
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
      setTimeLeft(`Resets in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
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
