// app/onboarding/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';
import Loader from '@/app/components/Loader';
import styles from './register.module.css';
import modalStyles from './pendingModal.module.css';
import animationStyles from '../../animations.module.css';
import { useUser } from '@/app/context/UserContext';
import { useAccount } from 'wagmi';

const ParticleBackground = dynamic(() => import('./particles'), { ssr: false });



export default function RegisterPage() {
  const [isPopping, setIsPopping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { userProfile, refetchUserProfile } = useUser();

  useEffect(() => {
    if (userProfile) {
      if (userProfile.registrationStatus === 'ACTIVE') {
        router.replace('/dashboard/game');
        return;
      }

      if (userProfile.registrationStatus === 'PENDING') {
        if (isConnected && address) {
          handleRegister();
        } else {
          setShowPendingModal(true);
        }
      }
    }
  }, [userProfile, router, isConnected, address]);

  async function handleRegister() {
    if (showPendingModal) {
      setShowPendingModal(false);
    }

    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    if (!isConnected || !address) {
      setToast({ message: 'Please connect your wallet.', type: 'error' });
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await sdk.quickAuth.fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed.');
      }

      await refetchUserProfile();
      setToast({ message: "Registration successful! Let's go!", type: 'success' });
      router.push('/dashboard/game');

    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Neynar score too low')) {
        setToast({ message: 'Your account reputation is too low to qualify at this time.', type: 'error' });
      } else {
        setToast({ message: `Error: ${errorMessage}`, type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ParticleBackground />

      {showPendingModal && (
        <div className={modalStyles.modalOverlay}>
          <div className={modalStyles.modalContent}>
            <h2 className={modalStyles.modalTitle}>Quick Update!</h2>
            <p className={modalStyles.modalMessage}>
              Hey <i>{userProfile?.username}</i>, We've updated our systems to better
              reward more <b style={{color:"purple", fontSize:"20px"}}>$ENB</b> and more rewarding surpises to everyone.
              Let's get you properly registered!
            </p>
            <button onClick={handleRegister} className={modalStyles.modalButton} disabled={isLoading}>
              {isLoading ? <Loader /> : "LET'S G0O"}
            </button>
          </div>
        </div>
      )}

      {!showPendingModal && (
        <div className={styles.buttonContainer}>
          <button
            className={`${styles.button} ${isPopping ? animationStyles.popAnimation : ''}`}
            type="button"
            onClick={handleRegister}
            disabled={isLoading || !isConnected}
          >
            {isLoading ? <Loader /> : "START"}
          </button>
        </div>
      )}
    </div>
  );
}