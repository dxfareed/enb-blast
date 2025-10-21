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
        numberOfPieces={400}
        recycle={false}
        run={true}
        onConfettiComplete={onAnimationComplete}
        gravity={0.3}
        initialVelocityX={{ min: -10, max: 10 }}
        initialVelocityY={{ min: 15, max: 30 }}
        colors={['#ffc700', '#ffdd57', '#ffefa1', '#ffffff', '#f39c12', '#e67e22']}
      />
      <div className={styles.newHighScoreText}>New High Score!</div>
    </div>
  );
};

export default NewHighScoreAnimation;