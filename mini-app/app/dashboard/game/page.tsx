'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { ethers } from 'ethers';
import { RefreshCw } from 'lucide-react';
import GameEngine, { GameEngineHandle } from '@/app/components/GameEngine';
import Toast from '@/app/components/Toast';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';

const GAME_CONTRACT_ADDRESS = '0x854cec65437d6420316b2eb94fecaaf417690227';
const GAME_CONTRACT_ABI = [{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"claimTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}];

export default function GamePage() {
  const { address } = useAccount();
  const { fid } = useUser();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isMultiplierUsed, setIsMultiplierUsed] = useState(false);
  const [isMultiplierLoading, setIsMultiplierLoading] = useState(false);
  const [isSignatureLoading, setIsSignatureLoading] = useState(false);
  const gameEngineRef = useRef<GameEngineHandle>(null);

  const { data: hash, writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash });

  const handleClaim = async () => {
    if (!address || finalScore <= 0) return;
    const claimAmount = finalScore / 10;
    setIsSignatureLoading(true);
    
    try {
      const signatureResponse = await sdk.quickAuth.fetch('/api/claim/generate-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address, 
          amount: claimAmount,
          points: finalScore,
        }),
      });

      if (!signatureResponse.ok) {
        const errorBody = await signatureResponse.json();
        throw new Error(errorBody.message || 'Could not get signature from server.');
      }
      const { signature } = await signatureResponse.json();

      const amountInWei = ethers.parseUnits(claimAmount.toString(), 18);
      writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'claimTokens',
        args: [amountInWei, signature],
      });
    } catch (err) {
      setToast({ message: err.message, type: 'error' });
    } finally {
      setIsSignatureLoading(false);
    }
  };
  
  const handleMultiplier = async () => {
    sdk.haptics.impactOccurred('heavy');
    setIsMultiplierLoading(true);

    try {
      const castText = `I just scored ${finalScore} in ENB Pop! Can you beat my score?`;
      const appUrl = 'https://block-cir-cayman-tiles.trycloudflare.com/';

      const result = await sdk.actions.composeCast({
        text: castText,
        embeds: [appUrl],
      });

      // The result.cast returns null if the user cancels the cast
      if (result.cast) {
        setFinalScore(prev => prev * 2);
        setIsMultiplierUsed(true);
      } else {
        // Handle the case where the user cancels the cast
        setToast({ message: "Cast was cancelled.", type: 'info' });
      }

    } catch (error) {
      console.error("Cast failed:", error);
      setToast({ message: "An error occurred while casting.", type: 'error' });
    } finally {
      setIsMultiplierLoading(false);
    }
  };

  const handleTryAgain = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.resetGame();
    }
    setIsClaimUnlocked(false);
    setFinalScore(0);
    setIsMultiplierUsed(false);
    if (isConfirmed) {
      resetWriteContract();
    }
  };

  useEffect(() => {
    if (isConfirmed) {
      setToast({ message: "Successfully claimed!", type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    }
  }, [isConfirmed, queryClient]);

  useEffect(() => {
    const error = writeError || confirmationError;
    if (error) {
      setToast({ message: error.shortMessage || error.message, type: 'error' });
      resetWriteContract();
    }
  }, [writeError, confirmationError, resetWriteContract]);

  const isClaimLoading = isWritePending || isConfirming;
  const isAnyActionLoading = isClaimLoading || isMultiplierLoading || isSignatureLoading;

  const getButtonText = () => {
    if (isSignatureLoading) return 'Preparing...';
    if (isWritePending) return 'Check Wallet...';
    if (isConfirming) return 'Confirming...';
    if (isConfirmed) return 'Success!';
    return `Claim ${(finalScore / 10).toFixed(1)} $ENB`;
  };
  
  const handleGameWin = (scoreFromGame: number) => {
    setIsClaimUnlocked(true);
    setFinalScore(scoreFromGame); 
  };

  return (
   <div className={styles.gameContainer}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <GameEngine ref={gameEngineRef} onGameWin={handleGameWin} />
      
      <div className={styles.actionContainer}>
        {isClaimUnlocked ? (
          <div className={styles.actionButtonsContainer}>
            <div className={styles.topButtonsWrapper}>
              <button 
                onClick={handleClaim}
                disabled={isAnyActionLoading || isConfirmed}
                className={`${styles.claimButton} ${styles.claimButtonGreen}`}
              >
                {getButtonText()}
              </button>
              <button
                onClick={handleTryAgain}
                className={`${styles.claimButton} ${styles.tryAgainButtonRed}`}
              >
                <RefreshCw size={24} />
              </button>
            </div>
            
            {!isMultiplierUsed && (
              <button
                onClick={handleMultiplier}
                disabled={isAnyActionLoading || isConfirmed}
                className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
              >
                {isMultiplierLoading ? 'Preparing...' : '2x'}
              </button>
            )}
          </div>
        ) : (
          <button disabled className={styles.claimButton}>
            Survive to Unlock Claim
          </button>
        )}
        <div className={styles.statusMessage}>
          {/* This space is intentionally left for layout consistency, 
              ** messages are now handled by toasts. */}
        </div>
      </div>
    </div>
  );
}