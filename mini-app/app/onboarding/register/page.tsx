'use client';
import { useState } from 'react';
import { useAccount, useWriteContract, useTransaction } from 'wagmi';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useRouter } from 'next/navigation';
import ParticleBackground from './particles';
import styles from './register.module.css';
import animationStyles from '../../animations.module.css';

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
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { address, isConnected } = useAccount();
  const { context } = useMiniKit();
  const router = useRouter();
  const user_fid = context?.user.fid;
  const { writeContract, data: hash } = useWriteContract();

  const { isLoading: isWaitingForTransaction, isSuccess } = useTransaction({
    hash,
  });

  if (!user_fid) {
    console.log('No FID found');
    return;
  }
  const [hasRegistered, setHasRegistered] = useState(false);

  if (isSuccess && hash && !hasRegistered) {
    setHasRegistered(true);
    setIsVerifying(false); // Stop verifying state
    setIsCreatingProfile(true); // Start creating profile state
    
    console.log('Transaction successful, hash:', hash);
    console.log('FID:', user_fid);
    console.log('Connected wallet address:', address);

    console.log('Attempting to create user profile with:', {
      fid: user_fid,
      hash,
      walletAddress: address,
      contractAddress: GAME_CONTRACT_ADDRESS
    });

    fetch('/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fid: user_fid,
        hash,
        walletAddress: address,
      }),
    })
      .then(async response => {
        const responseText = await response.text();
        console.log('Raw API Response:', responseText);

        let data;
        try {
          data = JSON.parse(responseText);
          console.log('Parsed API Response:', data);
        } catch (e) {
          console.error('Failed to parse API response:', e);
          throw new Error('Invalid API response format');
        }

        if (!response.ok) {
          throw new Error(`Failed to create user profile: ${data.message || response.statusText}`);
        }
        return data;
      })
      .then((data) => {
        console.log('Registration complete! User data:', data);
        setIsCreatingProfile(false); // Stop creating profile state
        router.push('/dashboard/game');
      })
      .catch(error => {
        console.error('Error creating user profile:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        alert(`Registration failed: ${error.message}`);
        setHasRegistered(false);
        setIsCreatingProfile(false); // Stop creating profile state on error
      });
  }

  async function handleClick() {
    setIsPopping(true);
    console.log('Starting registration process');

    if (!isConnected || !address) {
      console.log('Wallet not connected');
      return;
    } else if (!isRegistering) {
      console.log('Starting contract registration');
      setIsRegistering(true);
      try {
        console.log('Sending contract transaction to:', GAME_CONTRACT_ADDRESS);
        writeContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_ABI,
          functionName: 'register',
        });
      } catch (error) {
        console.error('Error in contract registration:', error);
        alert('Failed to register on contract: ' + (error as Error).message);
      } finally {
        setIsRegistering(false);
      }
    }

    setTimeout(() => {
      setIsPopping(false);
    }, 500);
  }

  // Determine the current loading state and message
  const getLoadingState = () => {
    if (isRegistering) return 'SENDING TRANSACTION...';
    if (isWaitingForTransaction) return 'WAITING FOR CONFIRMATION...';
    if (isVerifying) return 'VERIFYING TRANSACTION...';
    if (isCreatingProfile) return 'CREATING PROFILE...';
    return 'REGISTER';
  };

  const isLoading = isRegistering || isWaitingForTransaction || isVerifying || isCreatingProfile;

  return (
    <div className={styles.container}>
      <ParticleBackground />
      <div className={styles.buttonContainer}>
        {!isConnected ? (
          <ConnectWallet />
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
