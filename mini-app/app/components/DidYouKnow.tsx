'use client';

import { useState, useEffect } from 'react';
import styles from './DidYouKnow.module.css';

type DidYouKnowProps = {
  facts: string[];
};

export default function DidYouKnow({ facts }: DidYouKnowProps) {
  const [fact, setFact] = useState('');

  useEffect(() => {
    // Set an initial fact
    setFact(facts[Math.floor(Math.random() * facts.length)]);

    const interval = setInterval(() => {
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      setFact(randomFact);
    }, 3000); // 1 second

    return () => clearInterval(interval);
  }, [facts]);

  return (
    <div className={styles.container}>
      <p className={styles.title}>Did you know?</p>
      <p className={styles.fact}>{fact}</p>
    </div>
  );
}
