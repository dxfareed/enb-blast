// app/onboarding/register/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseGwei } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Toast from '@/app/components/Toast';
import Loader from '@/app/components/Loader';
import styles from './register.module.css';
import modalStyles from './pendingModal.module.css';
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
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { userProfile, fid, refetchUserProfile } = useUser();

  // Redirect user or show pending modal based on status
  useEffect(() => {
    if (userProfile) {
      if (userProfile.registrationStatus === 'ACTIVE') {
        router.replace('/dashboard/game');
      } else if (userProfile.registrationStatus === 'PENDING') {
        setShowPendingModal(true);
      }
    }
  }, [userProfile, router]);

  const { data: hash, writeContract, isPending, error: writeContractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: confirmationError } = useWaitForTransactionReceipt({ hash });

  // Combined loading state
  useEffect(() => {
    setIsLoading(isPending || isConfirming);
  }, [isPending, isConfirming]);

  // Handle user activation after successful transaction
  useEffect(() => {
    async function activateUserOnSuccess() {
      if (isSuccess && hash) {
        setIsLoading(true);
        try {
          const activateResponse = await sdk.quickAuth.fetch('/api/user/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash: hash }),
          });

          if (!activateResponse.ok) {
            const errorData = await activateResponse.json();
            throw new Error(errorData.message || 'Failed to activate user status.');
          }

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

  // Handle contract errors
  useEffect(() => {
    const error = writeContractError || confirmationError;
    if (error) {
      const message = error.message.includes('User rejected') ? 'Transaction rejected.' : (error as any).shortMessage || error.message;
      setToast({ message: `Error: ${message}`, type: 'error' });
    }
  }, [writeContractError, confirmationError]);

  async function handleRegister() {
    // Hide modal if it was open
    if (showPendingModal) {
      setShowPendingModal(false);
    }

    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    if (!isConnected || !address || !fid) {
      setToast({ message: 'Wallet or Farcaster ID not available.', type: 'error' });
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
        throw new Error(errorData.message || 'Failed to get registration data.');
      }

      const { signature, wallets } = await response.json();

      if (!signature) {
        await refetchUserProfile();
        setToast({ message: "You're already registered! Redirecting...", type: 'success' });
        setTimeout(() => router.push('/dashboard/game'), 100);
        return;
      }
      const maxPriority = parseGwei('0.05');
      const maxFee = parseGwei('0.1');


      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'register',
        args: [BigInt(fid), wallets, signature],
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPriority,
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