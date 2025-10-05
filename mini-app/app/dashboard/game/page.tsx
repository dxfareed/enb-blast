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
import { useMiniApp } from '@neynar/react';
import AddAppBanner from '@/app/components/AddAppBanner';

const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;
const GAME_CONTRACT_ABI = [{ "inputs": [{ "internalType": "uint256", "name": "_amount", "type": "uint256" }, { "internalType": "bytes", "name": "_signature", "type": "bytes" }], "name": "claimTokens", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];

export default function GamePage() {
    const { address } = useAccount();
    const { userProfile, refetchUserProfile } = useUser();
    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [isMultiplierUsed, setIsMultiplierUsed] = useState(false);
    const [isMultiplierLoading, setIsMultiplierLoading] = useState(false);
    const [isSignatureLoading, setIsSignatureLoading] = useState(false);
    const [isClaimFinalized, setIsClaimFinalized] = useState(false);
    const gameEngineRef = useRef<GameEngineHandle>(null);
    const [claimButtonText, setClaimButtonText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const { context } = useMiniApp();
    const [showAddAppBanner, setShowAddAppBanner] = useState(false);
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const calculateCountdown = () => {
            if (userProfile && userProfile.claimsToday >= 5) {
                const now = new Date();
                const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
                const diff = midnightUTC.getTime() - now.getTime();

                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
                } else {
                    setCountdown('00:00');
                }
            }
        };

        calculateCountdown(); // Initial calculation
        intervalId = setInterval(calculateCountdown, 60000); // Update every minute

        return () => clearInterval(intervalId); // Cleanup on component unmount
    }, [userProfile]);


    useEffect(() => {
        if (context && context.client?.added === false) {
            console.log(context)
            setShowAddAppBanner(true);
        }
    }, [context]);

    const { data: hash, writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();

    const toggleMute = () => {
        setIsMuted(prevState => !prevState);
    };
    useEffect(() => {
        if (userProfile?.lastMultiplierUsedAt) {
            const lastUsedDate = new Date(userProfile.lastMultiplierUsedAt);
            const now = new Date();
            if (
                lastUsedDate.getUTCFullYear() === now.getUTCFullYear() &&
                lastUsedDate.getUTCMonth() === now.getUTCMonth() &&
                lastUsedDate.getUTCDate() === now.getUTCDate()
            ) {
                setIsMultiplierUsed(true);
            }
        }
    }, [userProfile]);

    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash });

    const handleClaim = async () => {
        if (!address || finalScore <= 0) return;
        if (userProfile && userProfile.claimsToday >= 5) {
            setToast({ message: 'Daily claim limit reached.', type: 'error' });
            return;
        }
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

                const errorBody = await signatureResponse.json();
                throw new Error(errorBody.message || 'Could not get signature.');
            }
            const { signature } = await signatureResponse.json();
            writeContract({
                //@ts-ignore
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
        if (isMultiplierUsed || isMultiplierLoading) return;

        sdk.haptics.impactOccurred('heavy');
        setIsMultiplierLoading(true);

        try {
            if (!userProfile?.fid) {
                await refetchUserProfile();
                if (!userProfile?.fid) throw new Error("User profile could not be loaded.");
            }

            const multipliedScore = finalScore * 2;
            const appUrl = process.env.NEXT_PUBLIC_URL || '';
            const username = userProfile.username || '@johndoe';
            const pfpUrl = userProfile.pfpUrl || 'https://pbs.twimg.com/profile_images/1734354549496836096/-laoU-C9_400x400.jpg';
            const streak = userProfile.streak || 0;
            const claimed = userProfile.totalClaimed || 0;
            const weeklyPoints = userProfile.weeklyPoints || 0;
            const fid = userProfile.fid;

            // Fetch rank before composing cast
            const leaderboardData = await fetch(`/api/leaderboard?fid=${userProfile.fid}`)
                .then(res => res.ok ? res.json() : null)
                .catch(error => {
                    console.error("Leaderboard fetch failed:", error);
                    return null;
                });
            const rank = leaderboardData?.rank?.toString() || 'N/A';

            const frameUrl = `${appUrl}/share-frame?score=${multipliedScore}&username=${username}&pfpUrl=${pfpUrl}&streak=${streak}&claimed=${claimed}&weeklyPoints=${weeklyPoints}&rank=${rank}&fid=${fid}`;
            const castText = `I just scored ${multipliedScore} points and earned ${multipliedScore / 10} $ENB from the ENB BLAST mini app.\nGo claim yours now!`;

            const result = await sdk.actions.composeCast({
                text: castText,
                embeds: [frameUrl],
            });

            if (result.cast) {
                const multiplierResponse = await sdk.quickAuth.fetch('/api/game/use-multiplier', {
                    method: 'POST',
                });

                if (!multiplierResponse.ok) {
                    const errorData = await multiplierResponse.json();
                    // If this fails, we don't apply the multiplier locally
                    throw new Error(errorData.message || 'Could not activate multiplier.');
                }

                // Now that backend is updated, update frontend state
                setFinalScore(multipliedScore);
                setIsMultiplierUsed(true);
                setClaimButtonText(`Claim ${(multipliedScore / 10).toFixed(1)} $ENB`);
                setToast({ message: "Success! Score shared & doubled!", type: 'success' });
                await refetchUserProfile(); // Refetch to get the latest multiplier status
            } else {
                setToast({ message: "Sharing cancelled. Multiplier was not used.", type: 'info' });
            }
        } catch (error) {
            console.error("Sharing failed:", error);
            setToast({ message: (error as Error).message || `An error occurred. Multiplier not applied.`, type: 'error' });
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
        const confirmClaim = async () => {
            if (!hash || isClaimFinalized) return;
            setIsClaimFinalized(true);

            try {
                const response = await sdk.quickAuth.fetch('/api/claim/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txHash: hash, points: finalScore }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to confirm claim on the server.');
                }

                setToast({ message: 'Claim successful!', type: 'success' });

                // On successful confirmation, refetch the user's data.
                await refetchUserProfile();

                // Invalidate other queries to refresh related data.
                queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
                queryClient.invalidateQueries({ queryKey: ['userHistory'] });

            } catch (err) {
                setToast({ message: (err as Error).message, type: 'error' });
            }
        };

        if (isConfirmed) {
            confirmClaim();
        }
    }, [isConfirmed, isClaimFinalized, hash, finalScore, refetchUserProfile, queryClient, writeError, confirmationError, resetWriteContract]);

    return (
        <div className={styles.gameContainer}>
            {showAddAppBanner && <AddAppBanner onAppAdded={() => setShowAddAppBanner(false)} />}
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
                                            //@ts-ignore
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isConfirmed || (userProfile && userProfile.claimsToday >= 5)}
                                            className={`${styles.claimButton} ${styles.claimButtonGreen}`}
                                        >
                                            {userProfile && userProfile.claimsToday >= 5 ? 'Limit Reached' :
                                                isSignatureLoading ? 'Preparing...' :
                                                    isWritePending ? 'Check Wallet...' :
                                                        isConfirming ? 'Confirming...' :
                                                            claimButtonText}
                                        </button>                                        <button
                                            onClick={handleShareScoreFrame}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isMultiplierUsed}
                                            className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
                                        >
                                            {isMultiplierLoading ? '2xing' : isMultiplierUsed ? '2x\'\ed!' : '2x'}
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
                    userProfile && userProfile.claimsToday >= 5 ? (
                        <button disabled className={styles.claimButton}>
                            Daily Limit Reset in {countdown}
                        </button>
                    ) : (
                        <button disabled className={styles.claimButton}>Survive to Unlock Claim</button>
                    )
                )}
                {/* <button onClick={addMiniApp} className={styles.notificationButton}>
                    <Bell size={20} color="white" />
                    <span>Enable Notifications</span>
                </button> */}
                <div className={styles.statusMessage}>
                    {userProfile && typeof userProfile.claimsToday === 'number' && (<p>Claims left: {5 - userProfile.claimsToday}</p>)}
                </div>
            </div>
        </div>
    );
}
