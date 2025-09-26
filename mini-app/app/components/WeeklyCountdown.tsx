'use client';

import { useState, useEffect, useCallback } from 'react';

// This helper function calculates the exact Date object for the next reset
function getNextTuesday5PM(): Date {
  const now = new Date();
  const target = new Date(now.getTime());
  const targetDay = 2; // Tuesday (0=Sun, 1=Mon, 2=Tue, ...)
  const targetHour = 17; // 5 PM

  const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
  
  target.setDate(now.getDate() + daysUntilTarget);
  target.setHours(targetHour, 0, 0, 0);

  // If it's Tuesday but already past 5 PM, the target is next week's Tuesday
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
    
    // As requested: switch display logic based on time remaining
    if (totalHours < 1) {
      const minutes = totalMinutes % 60;
      setTimeLeft(`Resets in ${minutes} minute${minutes !== 1 ? 's' : ''}`);
    } else {
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      setTimeLeft(`Resets in ${days}d, ${hours}h`);
    }
  }, []);

  useEffect(() => {
    // Run once immediately on mount
    updateCountdown();
    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    // Cleanup the interval when the component unmounts
    return () => clearInterval(interval);
  }, [updateCountdown]);

  return (
    <div className="countdown-text">
      {timeLeft}
    </div>
  );
}