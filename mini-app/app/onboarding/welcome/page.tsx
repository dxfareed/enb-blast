'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import animationStyles from '../../animations.module.css';
import welcomeStyles from './welcome.module.css';

export default function WelcomePage() {
  const { context } = useMiniKit();
  const router = useRouter();

  async function checkUserRegistration(fid: number | string) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const response = await fetch(`/api/user/profile?fid=${fid}`);
      if (response.ok) {
        console.log('User is registered, go to game');
        router.push('dashboard/game');
      } else {
        console.log("user is not registered, go to register");
        router.push('/onboarding/register');
      }
    } catch (error){
      console.log('Failed to check user registration:', error);
      router.push('/onboarding/register');
    }
  }

  useEffect(() => {
    const fid = context?.user?.fid;
    if (fid) {
      checkUserRegistration(fid);
    }
  }, [context?.user?.fid]);

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
    </main>
  );
}