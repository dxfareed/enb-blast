'use client';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useTransaction, useConnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
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
  console.log('RegisterPage mounted');
  const [isPopping, setIsPopping] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const { address, isConnected } = useAccount();
  const [user_fid, setUserFid] = useState<number | null>(null);
  const router = useRouter();
  const { writeContract, data: hash, error: writeContractError } = useWriteContract();
  const { connect, connectors } = useConnect();

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

  const { isLoading: isWaitingForTransaction, isSuccess, error: transactionError } = useTransaction({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  const [hasRegistered, setHasRegistered] = useState(false);

  useEffect(() => {
    if (isSuccess && hash && !hasRegistered && user_fid) {
      setHasRegistered(true);
      setIsVerifying(false);
      setIsCreatingProfile(true);
      
      console.log('[PROFILE CREATION] Starting...');
      console.log('[PROFILE CREATION] Transaction successful, hash:', hash);
      console.log('[PROFILE CREATION] FID:', user_fid);
      console.log('[PROFILE CREATION] Connected wallet address:', address);

      const profileData = {
        fid: user_fid,
        hash,
        walletAddress: address,
      };

      console.log('[PROFILE CREATION] Attempting to create user profile with:', profileData);

      fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      })
        .then(async response => {
          const responseText = await response.text();
          console.log('[PROFILE CREATION] Raw API Response:', responseText);

          let data;
          try {
            data = JSON.parse(responseText);
            console.log('[PROFILE CREATION] Parsed API Response:', data);
          } catch (e) {
            console.error('[PROFILE CREATION] Failed to parse API response:', e);
            throw new Error('Invalid API response format');
          }

          if (!response.ok) {
            throw new Error(`Failed to create user profile: ${data.message || response.statusText}`);
          }
          return data;
        })
        .then((data) => {
          console.log('[PROFILE CREATION] Registration complete! User data:', data);
          setIsCreatingProfile(false);
          router.push('/dashboard/game');
        })
        .catch(error => {
          console.error('[PROFILE CREATION] Error creating user profile:', error);
          alert(`Registration failed: ${error.message}`);
          setHasRegistered(false);
          setIsCreatingProfile(false);
        });
    }
  }, [isSuccess, hash, hasRegistered, user_fid, address, router]);

  useEffect(() => {
    if (writeContractError) {
      console.error('Error from useWriteContract:', writeContractError);
      alert(`Failed to send transaction: ${writeContractError.message}`);
      setIsRegistering(false);
    }
  }, [writeContractError]);

  useEffect(() => {
    if (transactionError) {
      console.error('Error from useTransaction:', transactionError);
      alert(`Transaction failed: ${transactionError.message}`);
      setIsRegistering(false);
    }
  }, [transactionError]);

  async function handleClick() {
    setIsPopping(true);
    setTimeout(() => setIsPopping(false), 500);

    console.log('[REGISTRATION] Button clicked.');
    console.log('[REGISTRATION] Wallet connected:', isConnected);
    console.log('[REGISTRATION] Wallet address:', address);
    console.log('[REGISTRATION] User FID:', user_fid);

    if (!isConnected || !address) {
      console.log('[REGISTRATION] Wallet not connected, aborting.');
      alert('Please connect your wallet first.');
      return;
    }
    if (!user_fid) {
      console.log('[REGISTRATION] FID not found, aborting.');
      alert('Farcaster user not found. Please open this in a Farcaster client.');
      return;
    }

    if (!isRegistering) {
      console.log('[REGISTRATION] Starting contract registration...');
      setIsRegistering(true);
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_ABI,
        functionName: 'register',
      });
    }
  }

  const handleConnect = () => {
    console.log('Connect button clicked.');
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else {
      console.error('No wagmi connectors found.');
    }
  }

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
