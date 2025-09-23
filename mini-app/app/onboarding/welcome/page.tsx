'use client';

import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { sdk } from '@farcaster/miniapp-sdk';
import animationStyles from '../../animations.module.css';
import welcomeStyles from './welcome.module.css';

export default function WelcomePage() {
  const [fid, setFid] = useState<number | null>(null);
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
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const response = await fetch(`/api/user/profile?fid=${fid}`);
      if (response.ok) {
        console.log('User is registered, go to game');
        router.push('/dashboard/game');
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
    </main>
  );
}