'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useConnect, useWaitForTransactionReceipt } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';
import Loader from '@/app/components/Loader'; // Import the new Loader component
import styles from './register.module.css';
import animationStyles from '../../animations.module.css';
import { useUser } from '@/app/context/UserContext';

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
  const [isPopping, setIsPopping] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Simplified loading state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { connect, connectors } = useConnect();
  const { userProfile, fid } = useUser();
  
  useEffect(() => {
    if (userProfile && userProfile.registrationStatus === 'ACTIVE') {
      router.replace('/dashboard/game');
    }
  }, [userProfile, router]);
  
  const { 
    data: hash,
    writeContract, 
    isPending: isSendingTransaction, 
    error: writeContractError 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: confirmationError 
  } = useWaitForTransactionReceipt({ hash });

  // Centralized loading effect
  useEffect(() => {
    if (isSendingTransaction || isConfirming) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [isSendingTransaction, isConfirming]);

  useEffect(() => {
    async function activateUser() {
      if (isConfirmed && hash) {
        setIsLoading(true); // Keep loader active during activation
        try {
          const activateResponse = await sdk.quickAuth.fetch('/api/user/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash: hash }),
          });

          if (!activateResponse.ok) {
            const errorData = await activateResponse.json();
            throw new Error(errorData.message || 'Failed to activate user.');
          }

          // Optionally show a success toast before redirecting
          setToast({ message: 'Success! Redirecting...', type: 'success' });
          setTimeout(() => {
            router.push('/dashboard/game');
          }, 1000);

        } catch (error) {
          setToast({ message: `Activation failed: ${(error as Error).message}`, type: 'error' });
        } finally {
          setIsLoading(false); // Stop loading
        }
      }
    }
    activateUser();
  }, [isConfirmed, hash, router]);

  useEffect(() => {
    const error = writeContractError || confirmationError;
    if (error) {
      const message = 'shortMessage' in error ? error.shortMessage : error.message;
      setToast({ message: `Registration failed: ${message}`, type: 'error' });
      setIsLoading(false); // Stop loading on error
    }
  }, [writeContractError, confirmationError]);

  async function handleClick() {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    if (!isConnected || !address) {
      setToast({ message: 'Please connect your wallet first.', type: 'error' });
      return;
    }
    if (!fid) {
      setToast({ message: 'Farcaster user not found. Please open this in a Farcaster client.', type: 'error' });
      return;
    }

    if (isLoading) return;

    setIsLoading(true); // Start loading immediately

    try {
      const profileResponse = await sdk.quickAuth.fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid: fid, walletAddress: address }),
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.message || 'Failed to create profile.');
      }

      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'register',
      });

    } catch (error) {
      setToast({ message: `Registration failed: ${(error as Error).message}`, type: 'error' });
      setIsLoading(false); // Stop loading on error
    }
  }

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      console.error('No wagmi connectors found.');
    }
  }

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
            {isLoading ? <Loader /> : 'REGISTER'}
          </button>
        )}
      </div>
    </div>
  );
}