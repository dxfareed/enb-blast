'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { GAME_CONTRACT_ADDRESS } from '@/app/utils/constants';
import { ethers } from 'ethers';
import styles from './page.module.css';

const CLAIM_AMOUNT = 0.1; 

const GAME_CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "uint256", "name": "_amount", "type": "uint256" },
      { "internalType": "bytes", "name": "_signature", "type": "bytes" }
    ],
    "name": "claimTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "_account", "type": "address" }],
    "name": "getUserProfile",
    "outputs": [
      {
        "components": [
          { "internalType": "bool", "name": "isRegistered", "type": "bool" },
          { "internalType": "uint256", "name": "registrationDate", "type": "uint256" },
          { "internalType": "uint256", "name": "claimCount", "type": "uint256" },
          { "internalType": "uint256", "name": "totalClaimed", "type": "uint256" }
        ],
        "internalType": "struct ENBGame.UserProfile",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

export default function GamePage() {
  const { address } = useAccount();
  const { fid } = useUser();
  const [apiState, setApiState] = useState({ loading: false, error: null });

  const { data: userProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useReadContract({
    address: GAME_CONTRACT_ADDRESS,
    abi: GAME_CONTRACT_ABI,
    functionName: 'getUserProfile',
    args: [address],
    query: { enabled: !!address },
  });
   const queryClient = useQueryClient();

  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleClaim = async () => {
    if (!address) return alert('Please connect wallet');
    if (isProfileLoading) return;

    setApiState({ loading: true, error: null });
    try {
      const signatureResponse = await fetch('/api/claim/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, amount: CLAIM_AMOUNT }),
      });
      if (!signatureResponse.ok) throw new Error('Could not get signature from server.');
      const { signature } = await signatureResponse.json();

      const amountInWei = ethers.parseUnits(CLAIM_AMOUNT.toString(), 18);
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'claimTokens',
        args: [amountInWei, signature],
      });

    } catch (err) {
      setApiState({ loading: false, error: err.message });
    } finally {
      setApiState({ loading: false });
    }
  };
  
  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      refetchProfile();

      if (fid) {
        fetch('/api/claim/update-streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        }).catch(err => console.error("Streak update failed:", err));
      }
    }
  }, [isConfirmed, queryClient, fid, refetchProfile]);

  const isRegistered = userProfile ? userProfile.isRegistered : false;
  const isLoading = isProfileLoading || apiState.loading || isWritePending || isConfirming;
  const error = apiState.error || writeError;

  const getButtonText = () => {
    if (isProfileLoading) return 'Checking Eligibility...';
    if (apiState.loading) return 'Preparing Claim...';
    if (isWritePending) return 'Check Wallet...';
    if (isConfirming) return 'Confirming Transaction...';
    if (isConfirmed) return 'Claim Successful!';
    return `Claim ${CLAIM_AMOUNT} Tokens`;
  };

  return (
    <div className={styles.gameContainer}>
      <div className={styles.interactiveArea}>
        <p>Ready to claim your tokens?</p>
      </div>
      
      <div style={{width: '100%'}}>
        <button 
          onClick={handleClaim}
          disabled={!address || isLoading}
          className={styles.claimButton}
        >
          {getButtonText()}
        </button>

        <div className={styles.statusMessage}>
          {isConfirmed && !error && <p className={styles.successMessage}>Success! Your balance will update soon.</p>}
          {error && <p className={styles.errorMessage}>{error.shortMessage || error.message}</p>}
        </div>
      </div>
    </div>
  );
}