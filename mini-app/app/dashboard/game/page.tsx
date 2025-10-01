'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { ethers } from 'ethers';
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
    const [isClaimFinalized, setIsClaimFinalized] = useState(false);
    const gameEngineRef = useRef<GameEngineHandle>(null);
    const [claimButtonText, setClaimButtonText] = useState('');
    const [isMuted, setIsMuted] = useState(false);

    const { data: hash, writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();

    const toggleMute = () => {
        setIsMuted(prevState => !prevState);
    };
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash });

    const handleClaim = async () => {
        if (!address || finalScore <= 0) return;
        const claimAmount = finalScore / 10;
        setIsSignatureLoading(true);
        try {
            const signatureResponse = await sdk.quickAuth.fetch('/api/claim/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: address, amount: claimAmount }),
            });
            if (!signatureResponse.ok) {
                if (signatureResponse.status === 500) throw new Error('Server timeout, please try again.');
                if (signatureResponse.status === 401) throw new Error('Authentication error. Please reconnect.');
                if (signatureResponse.status === 404) throw new Error('User not found. Please register first.');
                if (signatureResponse.status === 429) throw new Error('Daily claim limit reached.');

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

    const handleShareScoreFrame = async () => {
        sdk.haptics.impactOccurred('heavy');
        setIsMultiplierLoading(true); // Reusing this state for sharing loading
        try {
            await refetchUserProfile(); // Refetch to get the latest user data

            const appUrl = process.env.NEXT_PUBLIC_URL || '';
            const username = userProfile?.username || '@johndoe';
            const pfpUrl = userProfile?.pfpUrl || 'https://pbs.twimg.com/profile_images/1734354549496836096/-laoU9C9_400x400.jpg';
            const streak = userProfile?.streak || 0;
            const claimed = userProfile?.totalClaimed || 0;
            const weeklyPoints = userProfile?.weeklyPoints || 0;
            const fid = userProfile?.fid;

            let rank = 'N/A';
            if (fid) {
                try {
                    const response = await fetch(`/api/leaderboard?fid=${fid}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.rank) {
                            rank = data.rank.toString();
                        }
                    }
                } catch (error) {
                    console.error("Error fetching rank:", error);
                }
            }

            const frameUrl = `${appUrl}/share-frame?score=${finalScore}&username=${username}&pfpUrl=${pfpUrl}&streak=${streak}&claimed=${claimed}&weeklyPoints=${weeklyPoints}&rank=${rank}&fid=${fid}`;
            const castText = `I just scored ${finalScore} in ENB Pop! Can you beat my score? Play now!`;
            
            const result = await sdk.actions.composeCast({
                text: castText,
                embeds: [frameUrl], // Embed our dynamic frame page
            });

            if (result.cast) {
                setToast({ message: "Score shared successfully!", type: 'success' });
            } else {
                setToast({ message: "Sharing was cancelled.", type: 'error' });
            }
        } catch (error) {
            console.error("Sharing failed:", error);
            setToast({ message: "An error occurred while sharing your score.", type: 'error' });
        } finally {
            setIsMultiplierLoading(false);
        }
    };

    const handleGameWin = useCallback((scoreFromGame: number) => {
        setIsClaimUnlocked(true);
        setFinalScore(scoreFromGame);
        setClaimButtonText(`Claim ${(scoreFromGame / 10).toFixed(1)} $ENB`);
    }, []);

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
            return;
        }

        if (isConfirmed && !isClaimFinalized) {
            setToast({ message: 'Claim successful!', type: 'success' });
            setIsClaimFinalized(true);

            setTimeout(() => {
                refetchUserProfile();
                queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
                queryClient.invalidateQueries({ queryKey: ['userHistory'] });
            }, 5000);
        }
    }, [writeError, confirmationError, resetWriteContract, isConfirmed, isClaimFinalized, refetchUserProfile, queryClient]);

    return (
        <div className={styles.gameContainer}>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <GameEngine ref={gameEngineRef} onGameWin={handleGameWin} displayScore={finalScore} isMuted={isMuted} onToggleMute={toggleMute} />
            <div className={styles.actionContainer}>
                {isClaimUnlocked ? (
                    <div className={styles.actionButtonsContainer}>
                        {finalScore > 0 ? (
                            !isConfirmed ? (
                                <>
                                    <div className={styles.topButtonsWrapper}>
                                        <button
                                            onClick={handleClaim}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isConfirmed}
                                            className={`${styles.claimButton} ${styles.claimButtonGreen}`}
                                        >
                                            {isSignatureLoading ? 'Preparing...' :
                                                isWritePending ? 'Check Wallet...' :
                                                    isConfirming ? 'Confirming on-chain...' :
                                                        claimButtonText}
                                        </button>
                                        {/* Multiplier button replaced with Share Score button */}
                                        <button
                                            onClick={handleShareScoreFrame}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading}
                                            className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
                                        >
                                            {isMultiplierLoading ? 'Sharing...' : 'Share Score'}
                                        </button>
                                    </div>
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