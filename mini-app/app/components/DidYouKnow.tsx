'use client';

import { useState, useEffect } from 'react';
import styles from './DidYouKnow.module.css';
import { INFLYNCE_FACTS } from '@/app/utils/constants';

type DidYouKnowProps = {
  facts: string[];
};

export default function DidYouKnow({ facts }: DidYouKnowProps) {
  const [fact, setFact] = useState('');
  const [isInflunceFact, setIsInflunceFact] = useState(false);

  useEffect(() => {
    const setRandomFact = () => {
      const randomFact = facts[Math.floor(Math.random() * facts.length)];
      setFact(randomFact);
      setIsInflunceFact(INFLYNCE_FACTS.includes(randomFact));
    };

    // Set an initial fact
    setRandomFact();

    const interval = setInterval(setRandomFact, 4500); // 3 seconds

    return () => clearInterval(interval);
  }, [facts]);

  return (
    <div className={styles.container}>
      <p className={isInflunceFact ? styles.orangeTitle : styles.title}>
        {isInflunceFact ? 'Inflynce Facts' : 'Did you know?'}
      </p>
      <p className={styles.fact}>{fact}</p>
    </div>
  );
}
