import React, { useEffect } from 'react';
import Confetti from 'react-confetti';
import styles from './NewHighScoreAnimation.module.css';

interface NewHighScoreAnimationProps {
  onAnimationComplete: () => void;
  width: number;
  height: number;
}

const NewHighScoreAnimation: React.FC<NewHighScoreAnimationProps> = ({ onAnimationComplete, width, height }) => {
  return (
    <div className={styles.newHighScoreContainer}>
      <Confetti
        width={width}
        height={height}
        numberOfPieces={500}
        recycle={false}
        run={true}
        onConfettiComplete={onAnimationComplete}
      />
      <div className={styles.newHighScoreText}>New High Score!</div>
    </div>
  );
};

export default NewHighScoreAnimation;