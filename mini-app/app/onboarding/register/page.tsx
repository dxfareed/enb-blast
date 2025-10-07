// app/onboarding/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseGwei } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';
import Loader from '@/app/components/Loader';
import styles from './register.module.css';
import animationStyles from '../../animations.module.css';
import { useUser } from '@/app/context/UserContext';

const ParticleBackground = dynamic(() => import('./particles'), { ssr: false });

// The correct, full ABI for the register function
const GAME_ABI = [{
  "inputs": [
    { "internalType": "uint256", "name": "_fid", "type": "uint256" },
    { "internalType": "address[]", "name": "_wallets", "type": "address[]" },
    { "internalType": "bytes", "name": "_signature", "type": "bytes" }
  ],
  "name": "register",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
}] as const;

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}`;

export default function RegisterPage() {
  const [isPopping, setIsPopping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  // We now use refetchUserProfile to get the final 'ACTIVE' status
  const { userProfile, fid, refetchUserProfile } = useUser();

  // Redirect the user if their profile is already ACTIVE
  useEffect(() => {
    if (userProfile && userProfile.registrationStatus === 'ACTIVE') {
      router.replace('/dashboard/game');
    }
  }, [userProfile, router]);

  const { data: hash, writeContract, isPending, error: writeContractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmationError } = useWaitForTransactionReceipt({ hash });

  // This combined loading state is correct
  useEffect(() => {
    setIsLoading(isPending || isConfirming);
  }, [isPending, isConfirming]);

  // [CORRECTED FLOW] This effect now handles the ACTIVATION step after a successful transaction
  useEffect(() => {
    async function activateUserOnSuccess() {
      if (isSuccess && hash) {
        setIsLoading(true); // Keep the loader on for this final step
        try {
          // Call your activate endpoint. sdk.quickAuth.fetch handles the auth token.
          const activateResponse = await sdk.quickAuth.fetch('/api/user/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash: hash }),
          });

          if (!activateResponse.ok) {
            const errorData = await activateResponse.json();
            throw new Error(errorData.message || 'Failed to activate user status.');
          }

          // After successful activation, refetch the profile to get the 'ACTIVE' status
          await refetchUserProfile();
          setToast({ message: 'Activation complete! Redirecting...', type: 'success' });
          setTimeout(() => router.push('/dashboard/game'), 1500);

        } catch (error) {
          setToast({ message: `Activation failed: ${(error as Error).message}`, type: 'error' });
        } finally {
          setIsLoading(false);
        }
      }
    }
    activateUserOnSuccess();
  }, [isSuccess, hash, router, refetchUserProfile]);

  useEffect(() => {
    const error = writeContractError || confirmationError;
    if (error) {
      const message = error.message.includes('User rejected') ? 'Transaction rejected.' : (error as any).shortMessage || error.message;
      setToast({ message: `Error: ${message}`, type: 'error' });
    }
  }, [writeContractError, confirmationError]);

  async function handleRegister() {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    if (!isConnected || !address || !fid) {
      setToast({ message: 'Wallet or Farcaster ID not available.', type: 'error' });
      return;
    }
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Step 1: Call the profile endpoint to get the signature
      const response = await sdk.quickAuth.fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get registration data.');
      }

      const { signature, wallets } = await response.json();

      // If no signature is returned, the user is already active on-chain.
      if (!signature) {
        await refetchUserProfile();
        setToast({ message: "You're already registered! Redirecting...", type: 'success' });
        setTimeout(() => router.push('/dashboard/game'), 1000);
        return;
      }
      const maxPriority = parseGwei('0.01');
      const maxFee = parseGwei('30');
      // Step 2: Use the signature to call the on-chain register function
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'register',
        args: [BigInt(fid), wallets, signature],
        //maxFeePerGas: maxFee,
        //maxPriorityFeePerGas: maxPriority,


      });

    } catch (error) {
      setToast({ message: `Error: ${(error as Error).message}`, type: 'error' });
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ParticleBackground />
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.button} ${isPopping ? animationStyles.popAnimation : ''}`}
          type="button"
          onClick={handleRegister}
          disabled={isLoading || !isConnected}
        >
          {isLoading ? <Loader /> : 'REGISTER'}
        </button>
      </div>
    </div>
  );
}