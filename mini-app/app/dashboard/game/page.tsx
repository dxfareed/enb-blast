'use client';

import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { ethers } from 'ethers';
import GameEngine from '@/app/components/GameEngine';
import styles from './page.module.css';

const GAME_CONTRACT_ADDRESS = '0x854cec65437d6420316b2eb94fecaaf417690227';
const GAME_CONTRACT_ABI = [{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"claimTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}];

export default function GamePage() {
  const { address } = useAccount();
  const { fid } = useUser();
  const queryClient = useQueryClient();
  const [apiState, setApiState] = useState({ loading: false, error: null });
  const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const { data: hash, writeContract, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const handleClaim = async () => {
    if (!address || finalScore <= 0) return;
    const claimAmount = finalScore / 10;
    setApiState({ loading: true, error: null });
    try {
      const signatureResponse = await fetch('/api/claim/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, amount: claimAmount }),
      });
      if (!signatureResponse.ok) throw new Error('Could not get signature from server.');
      const { signature } = await signatureResponse.json();

      const amountInWei = ethers.parseUnits(claimAmount.toString(), 18);
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
  
  const handleMultiplier = () => {
    console.log("Multiplier button clicked!");
    alert(`You would try to double your score of ${finalScore}! Feature coming soon.`);
  };

  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      if (fid) {
        fetch('/api/claim/update-streak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid }),
        }).catch(err => console.error("Streak update failed:", err));
      }
    }
  }, [isConfirmed, fid, queryClient]);

  const isLoading = apiState.loading || isWritePending || isConfirming;
  const error = apiState.error || writeError;

  const getButtonText = () => {
    if (apiState.loading) return 'Preparing...';
    if (isWritePending) return 'Check Wallet...';
    if (isConfirming) return 'Confirming...';
    if (isConfirmed) return 'Success!';
    return `Claim ${(finalScore / 10).toFixed(1)}`;
  };
  
  const handleGameWin = (scoreFromGame: number) => {
    setIsClaimUnlocked(true);
    setFinalScore(scoreFromGame); 
  };

  return (
   <div className={styles.gameContainer}>
      <GameEngine onGameWin={handleGameWin} />
      
      <div className={styles.actionContainer}>
        {isClaimUnlocked ? (
          <div className={styles.actionButtonsContainer}>
            <button 
              onClick={handleClaim}
              disabled={isLoading}
              className={styles.claimButton}
            >
              {getButtonText()}
            </button>
            <button
              onClick={handleMultiplier}
              disabled={isLoading}
              className={`${styles.claimButton} ${styles.secondaryButton}`}
            >
              2x
            </button>
          </div>
        ) : (
          <button disabled className={styles.claimButton}>
            Survive to Unlock Claim
          </button>
        )}
        <div className={styles.statusMessage}>
          {isConfirmed && !error && <p className={styles.successMessage}>Success! Your balance will update soon.</p>}
          {error && <p className={styles.errorMessage}>{error.shortMessage || error.message}</p>}
        </div>
      </div>
    </div>
  );
}