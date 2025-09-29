'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useConnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';
import styles from './register.module.css';
import animationStyles from '../../animations.module.css';

const ParticleBackground = dynamic(() => import('./particles'), {
  ssr: false,
});

const GAME_ABI = [{
  name: 'register',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [],
  outputs: [],
}] as const;

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`;

export default function RegisterPage() {
  console.log('RegisterPage mounted');
  const [isPopping, setIsPopping] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { address, isConnected } = useAccount();
  const [user_fid, setUserFid] = useState<number | null>(null);
  const router = useRouter();
  const { connect, connectors } = useConnect();
  
  const { 
    writeContract, 
    isPending: isSendingTransaction, 
    isSuccess: isTransactionSent, 
    error: writeContractError 
  } = useWriteContract();

  useEffect(() => {
    console.log('Attempting to get Farcaster user context...');
    async function getFarcasterUser() {
      try {
        const { user } = await sdk.context;
        if (user) {
          console.log('Farcaster user found:', user);
          setUserFid(user.fid);
        } else {
          console.log('No Farcaster user found in context.');
        }
      } catch (err) {
        console.error('Error getting Farcaster user:', err);
      }
    }
    getFarcasterUser();
  }, []);

  useEffect(() => {
    if (isTransactionSent) {
      setLoadingMessage('SUCCESS! REDIRECTING...');
      // Add a small delay so user can see the success message
      setTimeout(() => {
        router.push('/dashboard/game');
      }, 1000);
    }
  }, [isTransactionSent, router]);

  useEffect(() => {
    if (writeContractError) {
      console.error('Error from useWriteContract:', writeContractError);
      const message = 'shortMessage' in writeContractError ? writeContractError.shortMessage : writeContractError.message;
      setToast({ message: `On-chain registration failed: ${message}`, type: 'error' });
      setLoadingMessage('');
    }
  }, [writeContractError]);

  async function handleClick() {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    console.log('[REGISTRATION] Button clicked.');
    if (!isConnected || !address) {
      setToast({ message: 'Please connect your wallet first.', type: 'error' });
      return;
    }
    if (!user_fid) {
      setToast({ message: 'Farcaster user not found. Please open this in a Farcaster client.', type: 'error' });
      return;
    }

    if (loadingMessage) return; // Prevent multiple clicks

    try {
      // Step 1: Create profile in the database
      setLoadingMessage('CREATING PROFILE...');
      
      const profileResponse = await sdk.quickAuth.fetch('/api/user/profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fid: user_fid, walletAddress: address }),
      });

      if (!profileResponse.ok) {
        if (profileResponse.status === 500) throw new Error('Server timeout, please try again.');
        if (profileResponse.status === 401) throw new Error('Authentication error. Are you in a Farcaster client?');
        if (profileResponse.status === 400) throw new Error('Invalid data. Please try again.');

        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to create profile.');
      }
      console.log('[REGISTRATION] Profile created successfully.');

      // Step 2: Register on-chain
      setLoadingMessage('PLEASE CONFIRM IN WALLET...');
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'register',
      });

    } catch (error) {
      console.error('[REGISTRATION] Failed:', error);
      setToast({ message: `Registration failed: ${(error as Error).message}`, type: 'error' });
      setLoadingMessage('');
    }
  }

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      console.error('No wagmi connectors found.');
    }
  }
  
  const getLoadingState = () => {
    if (isSendingTransaction) return 'SENDING TRANSACTION...';
    return loadingMessage || 'REGISTER';
  }

  const isLoading = !!loadingMessage;

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ParticleBackground />
      <div className={styles.buttonContainer}>
        {!isConnected ? (
          <button
            className={styles.button}
            type="button"
            onClick={handleConnect}
          >
            Connect Wallet
          </button>
        ) : (
          <button
            className={`${styles.button} ${isPopping ? animationStyles.popAnimation : ''}`}
            type="button"
            onClick={handleClick}
            disabled={isLoading}
          >
            {getLoadingState()}
          </button>
        )}
      </div>
    </div>
  );
}