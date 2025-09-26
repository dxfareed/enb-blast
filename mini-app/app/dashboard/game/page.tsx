'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { ethers } from 'ethers';
import { RefreshCw } from 'lucide-react';
import GameEngine, { GameEngineHandle } from '@/app/components/GameEngine';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';

const GAME_CONTRACT_ADDRESS = '0x854cec65437d6420316b2eb94fecaaf417690227';
const GAME_CONTRACT_ABI = [{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"claimTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}];

export default function GamePage() {
  const { address } = useAccount();
  const { fid } = useUser();
  const queryClient = useQueryClient();
  const [apiState, setApiState] = useState({ loading: false, error: null });
  const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isMultiplierUsed, setIsMultiplierUsed] = useState(false); // New state
  const gameEngineRef = useRef<GameEngineHandle>(null);

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
  
  const handleMultiplier = async () => {
    sdk.haptics.impactOccurred('heavy');
    setApiState({ loading: true, error: null });

    try {
      const castText = `I just scored ${finalScore} in ENB Pop! Can you beat my score?`;
      const appUrl = 'https://warpcast.com/~/channel/enb'; 
      await sdk.cast({ text: `${castText}\n\n${appUrl}` });

      setFinalScore(prev => prev * 2);
      setIsMultiplierUsed(true);
    } catch (error) {
      console.error("Cast failed or was cancelled by user:", error);
      alert("Failed to open cast composer.");
    } finally {
      setApiState({ loading: false, error: null });
    }
  };

  const handleTryAgain = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.resetGame();
    }
    setIsClaimUnlocked(false);
    setFinalScore(0);
    setIsMultiplierUsed(false);
  };

  useEffect(() => {
    if (isConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    }
  }, [isConfirmed, queryClient]);

  const isLoading = apiState.loading || isWritePending || isConfirming;
  const error = apiState.error || writeError;

  const getButtonText = () => {
    if (apiState.loading) return 'Preparing...';
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
      <GameEngine ref={gameEngineRef} onGameWin={handleGameWin} />
      
      <div className={styles.actionContainer}>
        {isClaimUnlocked ? (
          <div className={styles.actionButtonsContainer}>
            <div className={styles.topButtonsWrapper}>
              <button 
                onClick={handleClaim}
                disabled={isLoading}
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
                disabled={isLoading}
                className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
              >
                2x
              </button>
            )}
          </div>
        ) : (
          <button disabled className={styles.claimButton}>
            Survive to Unlock Claim
          </button>
        )}
        <div className={styles.statusMessage}>
          {isConfirmed && !error && <p className={styles.successMessage}>Success!</p>}
          {error && <p className={styles.errorMessage}>{error.shortMessage || error.message}</p>}
        </div>
      </div>
    </div>
  );
}