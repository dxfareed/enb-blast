'use client';

import { useState } from 'react';
import ParticleBackground from './particles';
import styles from './register.module.css';
import animationStyles from '../../animations.module.css';

export default function RegisterPage() {
  const [isPopping, setIsPopping] = useState(false);

  function handleClick() {
    setIsPopping(true);
    console.log('Button clicked');
   // alert('Register button clicked');
    
    setTimeout(() => {
      setIsPopping(false);
    }, 500);
  }

  return (
    <div className={styles.container}>
      <ParticleBackground />
      <div className={styles.buttonContainer}>
        <button 
          className={`${styles.button} ${isPopping ? animationStyles.popAnimation : ''}`}
          type="button"
          onClick={handleClick}
        >
          REGISTER
        </button>
      </div>
    </div>
  );
}
