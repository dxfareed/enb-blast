'use client'
import dynamic from 'next/dynamic';
import styles from './styles.module.css';

const ParticleBackground = dynamic(() => import('./ParticleBackground'), {
  ssr: false,
});

export default function AnimationPage() {
  return (
    <main className={styles.main}>
      <ParticleBackground />
    </main>
  );
}