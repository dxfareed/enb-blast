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
    try {
      setToast(null);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch(`/api/user/profile?fid=${fid}`);
      if (response.ok) {
        const user = await response.json();
        if (user.registrationStatus === 'ACTIVE') {
          console.log('User is registered and active, go to game');
          router.push('/dashboard/game');
        } else {
          console.log('User is pending, go to register');
          router.push('/onboarding/register');
        }
      } else if (response.status === 500) {
        setToast({ message: 'Server timeout. Please try again in a moment.', type: 'error' });
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        console.log("User is not registered or other error, redirecting to register");
        router.push('/onboarding/register');
      }
    } catch (error) {
      console.error('Failed to check user registration:', error);
      setToast({ message: 'Network error. Please check your internet connection.', type: 'error' });
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