'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sdk } from '@farcaster/miniapp-sdk';
import animationStyles from '../../animations.module.css';
import welcomeStyles from './welcome.module.css';
import Toast from '@/app/components/Toast';
import { ToastState } from '@/app/dashboard/tasks/page';

export default function WelcomePage() {
  const [fid, setFid] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const router = useRouter();

  useEffect(() => {
    async function getFarcasterUser() {
      const { user } = await sdk.context;
      if (user) {
        setFid(user.fid);
      }
    }
    getFarcasterUser();
  }, []);

  async function checkUserRegistration(fid: number | string) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        if (attempts === 0) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        const response = await fetch(`/api/user/profile?fid=${fid}`);

        if (response.ok) {
          const user = await response.json();
          if (user.registrationStatus === 'ACTIVE') {
            console.log('User is registered and active, go to game');
            //router.push('/weekly-leaderboard');
            router.push('/dashboard/game');
          } else {
            console.log('User is pending, go to register');
            router.push('/onboarding/register');
          }
          return; // Success, exit the function
        }

        if (response.status >= 500) {
          throw new Error('Server error'); // Trigger the catch block for retry logic
        } else {
          // For non-server errors (e.g., 404), redirect without retrying
          console.log("User not found or other client error, redirecting to register");
          router.push('/onboarding/register');
          return;
        }
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} to check user registration failed:`, error);

        if (attempts < maxAttempts) {
          setToast({ message: 'Server timeout. Reconnecting...', type: 'info' });
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retrying
        } else {
          setToast({ message: 'Server is unavailable. Please try again later.', type: 'error' });
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        }
      }
    }
  }

  useEffect(() => {
    if (fid) {
      checkUserRegistration(fid);
    }
  }, [fid]);

  return (
    <main className={welcomeStyles.container}>
      <div className={`w-48 h-48 rounded-full flex items-center justify-center overflow-hidden ${animationStyles.heartbeat}`}>
        <img
          src="/Enb_000.png"
          alt="Pop Game"
          className="object-cover w-full h-full"
          width={120}
          height={120}
        />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </main>);
}