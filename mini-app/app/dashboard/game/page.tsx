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
const GAME_CONTRACT_ABI = [{ "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "bytes", "name": "_signature", "type": "bytes" }], "name": "claimTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];

export default function GamePage() {
    const { address } = useAccount();
    const { userProfile, refetchUserProfile } = useUser();
    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [isMultiplierUsed, setIsMultiplierUsed] = useState(false);
    const [isMultiplierLoading, setIsMultiplierLoading] = useState(false);
    const [isSignatureLoading, setIsSignatureLoading] = useState(false);
    const gameEngineRef = useRef<GameEngineHandle>(null);
    const [claimButtonText, setClaimButtonText] = useState('');
    const [isConfirmingOnBackend, setIsConfirmingOnBackend] = useState(false);
    const [isClaimFinalized, setIsClaimFinalized] = useState(false);

    const { data: hash, writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash });

    const handleClaim = async (scoreToClaim: number) => {
        if (!address || scoreToClaim <= 0) return;
        const claimAmount = scoreToClaim / 10;
        setIsSignatureLoading(true);
        try {
            const signatureResponse = await sdk.quickAuth.fetch('/api/claim/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address, amount: claimAmount }),
            });
            if (!signatureResponse.ok) {
                const errorBody = await signatureResponse.json();
                throw new Error(errorBody.message || 'Could not get signature.');
            }
            const { signature } = await signatureResponse.json();
            writeContract({
                address: GAME_CONTRACT_ADDRESS,
                abi: GAME_CONTRACT_ABI,
                functionName: 'claimTokens',
                args: [ethers.parseUnits(claimAmount.toString(), 18), signature],
            });
        } catch (err) {
            setToast({ message: (err as Error).message, type: 'error' });
        } finally {
            setIsSignatureLoading(false);
        }
    };

    const handleMultiplier = async () => {
        sdk.haptics.impactOccurred('heavy');
        setIsMultiplierLoading(true);
        try {
            const castText = `I just scored ${finalScore} in ENB Pop! Can you beat my score?`;
            const appUrl = process.env.NEXT_PUBLIC_URL || '';
            const result = await sdk.actions.composeCast({ text: castText, embeds: [appUrl] });

            if (result.cast) {
                const newScore = finalScore * 2;
                const newClaimAmount = (newScore / 10).toFixed(1);
                setFinalScore(newScore);
                setClaimButtonText(`Claim ${newClaimAmount} $ENB`);
                setIsMultiplierUsed(true);
                setToast({ message: `Success! Claim doubled to ${newClaimAmount} $ENB.`, type: 'success' });
            } else {
                setToast({ message: "Cast was cancelled.", type: 'error' });
            }
        } catch (error) {
            console.error("Cast failed:", error);
            setToast({ message: "An error occurred while casting.", type: 'error' });
        } finally {
            setIsMultiplierLoading(false);
        }
    };

    useEffect(() => {
        if (isConfirmed && hash) {
            const confirmClaimOnBackend = async () => {
                setIsConfirmingOnBackend(true);
                try {
                    const confirmResponse = await sdk.quickAuth.fetch('/api/claim/confirm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ txHash: hash, points: finalScore }),
                    });
                    if (!confirmResponse.ok) {
                        const errorBody = await confirmResponse.json();
                        throw new Error(errorBody.message || "Failed to confirm claim with server.");
                    }
                    setToast({ message: "Successfully claimed!", type: 'success' });
                    queryClient.invalidateQueries({ queryKey: ['balance'] });
                    refetchUserProfile();
                } catch (error) {
                    setToast({ message: (error as Error).message, type: 'error' });
                } finally {
                    setIsConfirmingOnBackend(false);
                    setIsClaimFinalized(true);
                }
            };
            confirmClaimOnBackend();
        }
    }, [isConfirmed, hash, finalScore, queryClient, refetchUserProfile]);

    const handleGameWin = (scoreFromGame: number) => {
        setIsClaimUnlocked(true);
        setFinalScore(scoreFromGame);
        setClaimButtonText(`Claim ${(scoreFromGame / 10).toFixed(1)} $ENB`);
    };

    const handleTryAgain = () => {
        if (gameEngineRef.current) gameEngineRef.current.resetGame();
        setIsClaimUnlocked(false);
        setFinalScore(0);
        setIsMultiplierUsed(false);
        setClaimButtonText('');
        if (isConfirmed) resetWriteContract();
        setIsClaimFinalized(false);
    };

    useEffect(() => {
        const error = writeError || confirmationError;
        if (error) {
            setToast({ message: 'shortMessage' in error ? error.shortMessage : error.message, type: 'error' });
            resetWriteContract();
        }
    }, [writeError, confirmationError, resetWriteContract]);

    return (
        <div className={styles.gameContainer}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <GameEngine ref={gameEngineRef} onGameWin={handleGameWin} />
            <div className={styles.actionContainer}>
                {isClaimUnlocked ? (
                    <div className={styles.actionButtonsContainer}>
                        {finalScore > 0 ? (
                            !isClaimFinalized ? (
                                <>
                                    <div className={styles.topButtonsWrapper}>
                                        <button
                                            onClick={() => handleClaim(finalScore)}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isConfirmingOnBackend || isConfirmed}
                                            className={`${styles.claimButton} ${styles.claimButtonGreen}`}
                                        >
                                            {isSignatureLoading ? 'Preparing...' :
                                             isWritePending ? 'Check Wallet...' :
                                             isConfirming ? 'Confirming on-chain...' :
                                             isConfirmingOnBackend ? 'Finalizing claim...' :
                                             claimButtonText}
                                        </button>
                                    </div>
                                    {!isMultiplierUsed && !isConfirmed && (
                                        <button
                                            onClick={handleMultiplier}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isConfirmingOnBackend}
                                            className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
                                        >
                                            {isMultiplierLoading ? 'Preparing...' : '2x'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button onClick={handleTryAgain} className={`${styles.claimButton} ${styles.tryAgainButtonRed}`}>
                                    Play Again
                                </button>
                            )
                        ) : (
                            <button onClick={handleTryAgain} className={`${styles.claimButton} ${styles.tryAgainButtonRed}`}>
                                Try Again
                            </button>
                        )}
                    </div>
                ) : (
                    <button disabled className={styles.claimButton}>Survive to Unlock Claim</button>
                )}
                <div className={styles.statusMessage}>
                    {userProfile && typeof userProfile.claimsToday === 'number' && (<p>Claims left: {5 - userProfile.claimsToday}</p>)}
                </div>
            </div>
        </div>
    );
}