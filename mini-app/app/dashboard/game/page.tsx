'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { parseGwei, parseEther } from 'viem'; // [FIX] Use parseEther from viem for consistency
import GameEngine, { GameEngineHandle } from '@/app/components/GameEngine';
import Toast from '@/app/components/Toast';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniApp } from '@neynar/react';
import AddAppBanner from '@/app/components/AddAppBanner';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI } from '@/app/utils/constants';

export default function GamePage() {
    const { address } = useAccount();
    const { userProfile, fid, refetchUserProfile } = useUser();
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

    // [FIX] These state variables will be driven by the new, accurate /api/claim/status endpoint
    const [claimsLeft, setClaimsLeft] = useState<number | null>(null);
    const [claimCooldownEnds, setClaimCooldownEnds] = useState<string | null>(null);
    const [countdown, setCountdown] = useState('');

    // [FIX] This useEffect now proactively fetches the user's REAL on-chain claim status on page load.
    useEffect(() => {
        async function fetchClaimStatus() {
            if (fid) {
                try {
                    const statusResponse = await sdk.quickAuth.fetch('/api/claim/status');
                    if (statusResponse.ok) {
                        const { claimsLeft, isOnCooldown, resetsAt } = await statusResponse.json();
                        setClaimsLeft(claimsLeft);
                        if (isOnCooldown) {
                            setClaimCooldownEnds(resetsAt);
                        }
                    } else {
                        console.warn("Could not fetch real-time claim status.");
                    }
                } catch (error) {
                    console.error("Failed to fetch claim status:", error);
                }
            }
        }
        fetchClaimStatus();
    }, [fid]);

    // [FIX] This countdown logic is now simpler and more accurate, driven by the server's `resetsAt` timestamp.
    useEffect(() => {
        const calculateCountdown = () => {
            const cooldownEnd = claimCooldownEnds ? new Date(claimCooldownEnds) : null;
            if (cooldownEnd && cooldownEnd > new Date()) {
                const now = new Date();
                const diff = cooldownEnd.getTime() - now.getTime();
                if (diff > 0) {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
                } else {
                    setCountdown('00:00:00');
                    setClaimCooldownEnds(null);
                    refetchUserProfile(); // Refresh data now that cooldown is over
                }
            } else {
                setCountdown('');
            }
        };
        calculateCountdown();
        const intervalId = setInterval(calculateCountdown, 1000);
        return () => clearInterval(intervalId);
    }, [claimCooldownEnds, refetchUserProfile]);

    useEffect(() => {
        if (context && context.client?.added === false) {
            setShowAddAppBanner(true);
        }
    }, [context]);

    const { data: hash, writeContract, isPending: isWritePending, error: writeError, reset: resetWriteContract } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed, error: confirmationError } = useWaitForTransactionReceipt({ hash });

    const toggleMute = () => { setIsMuted(prevState => !prevState); };

    useEffect(() => {
        if (userProfile?.lastMultiplierUsedAt) {
            const lastUsedDate = new Date(userProfile.lastMultiplierUsedAt);
            const now = new Date();
            if (lastUsedDate.getUTCFullYear() === now.getUTCFullYear() && lastUsedDate.getUTCMonth() === now.getUTCMonth() && lastUsedDate.getUTCDate() === now.getUTCDate()) {
                setIsMultiplierUsed(true);
            }
        }
    }, [userProfile]);

    const handleClaim = async () => {
        if (!address || finalScore <= 0) return;
        const claimAmount = finalScore / 10;
        setIsSignatureLoading(true);
        try {
            // [FIX] The API no longer needs walletAddress, it uses the authenticated FID.
            const signatureResponse = await sdk.quickAuth.fetch('/api/claim/signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: claimAmount }),
            });
            if (!signatureResponse.ok) {
                const errorBody = await signatureResponse.json();
                if (signatureResponse.status === 429 && errorBody.resetsAt) {
                    setClaimCooldownEnds(errorBody.resetsAt);
                }
                throw new Error(errorBody.message || 'Could not get signature.');
            }

            const maxPriority = parseGwei('1');
            const maxFee = parseGwei('30');

            // [CRITICAL FIX] Get both the signature AND the nonce from the API response.
            const { signature, nonce } = await signatureResponse.json();
            if (typeof nonce === 'undefined') {
                throw new Error("Invalid response from server: nonce is missing.");
            }

            writeContract({
                //@ts-ignore
                address: GAME_CONTRACT_ADDRESS,
                abi: GAME_CONTRACT_ABI,
                functionName: 'claimTokens',
                // [CRITICAL FIX] Pass all three required arguments: amount, nonce, and signature.
                //@ts-ignore
                args: [parseEther(claimAmount.toString()), BigInt(nonce), signature],
                //maxFeePerGas: maxFee,
                //maxPriorityFeePerGas: maxPriority,
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

            const rank = userProfile.weeklyRank?.toString() || 'N/A';

            const frameUrl = `${appUrl}/share-frame?score=${multipliedScore}&username=${username}&pfpUrl=${pfpUrl}&streak=${streak}&claimed=${claimed}&weeklyPoints=${weeklyPoints}&rank=${rank}&fid=${fid}&revalidate=true`;
            const castText = `I just scored ${multipliedScore} points and earned ${multipliedScore / 10} $ENB from the ENB BLAST mini app.\nGo claim yours now!`;

            const result = await sdk.actions.composeCast({ text: castText, embeds: [frameUrl] });

            if (result.cast) {
                await sdk.quickAuth.fetch('/api/game/use-multiplier', { method: 'POST' });
                setFinalScore(multipliedScore);
                setIsMultiplierUsed(true);
                setClaimButtonText(`Claim ${(multipliedScore / 10).toFixed(1)} $ENB`);
                setToast({ message: "Success! Score shared & doubled!", type: 'success' });
                await refetchUserProfile();
            } else {
                setToast({ message: "Sharing cancelled. Multiplier was not used.", type: 'info' });
            }
        } catch (error) {
            setToast({ message: (error as Error).message || `An error occurred.`, type: 'error' });
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
            const message = 'shortMessage' in error ? error.shortMessage : error.message;
            setToast({ message, type: 'error' });
            resetWriteContract();
            return;
        }
        const confirmClaim = async () => {
            if (!hash || isClaimFinalized) return;
            setIsClaimFinalized(true);
            try {
                // The /api/claim/confirm call is correct and does not need changes.
                const response = await sdk.quickAuth.fetch('/api/claim/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txHash: hash }),
                });

                if (!response.ok) {
                    throw new Error((await response.json()).message || 'Failed to confirm claim on the server.');
                }
                setToast({ message: 'Claim successful!', type: 'success' });
                await refetchUserProfile();
                queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            } catch (err) {
                setToast({ message: (err as Error).message, type: 'error' });
            }
        };
        if (isConfirmed) {
            confirmClaim();
        }
    }, [isConfirmed, isClaimFinalized, hash, refetchUserProfile, queryClient, writeError, confirmationError, resetWriteContract]);

    // [FIX] The disabled logic is now simpler and more accurate.
    const isClaimDisabled = isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isConfirmed || !!claimCooldownEnds || claimsLeft === 0;

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
                                            disabled={isClaimDisabled}
                                            className={`${styles.claimButton} ${styles.claimButtonGreen}`}
                                        >
                                            {claimCooldownEnds ? `On Cooldown` :
                                                claimsLeft === 0 ? 'No Claims Left' :
                                                    isSignatureLoading ? 'Preparing...' :
                                                        isWritePending ? 'Check Wallet...' :
                                                            isConfirming ? 'Confirming...' :
                                                                claimButtonText}
                                        </button>
                                        {!isMultiplierUsed && <button
                                            onClick={handleShareScoreFrame}
                                            disabled={isWritePending || isConfirming || isMultiplierLoading || isSignatureLoading || isMultiplierUsed}
                                            className={`${styles.claimButton} ${styles.multiplierButtonPurple}`}
                                        >
                                            {isMultiplierLoading ? '2x...' : isMultiplierUsed ? '2xed!' : '2x'}
                                        </button>}
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
                    claimCooldownEnds ? (
                        <button disabled className={styles.claimButton}>
                            Cooldown: {countdown}
                        </button>
                    ) : (
                        <button disabled className={styles.claimButton}>Survive to Unlock Claim</button>
                    )
                )}
                <div className={styles.statusMessage}>
                    {/* [FIX] This status message now uses the accurate, real-time state. */}
                    {claimsLeft !== null && !claimCooldownEnds && (<p>Claims left today: {claimsLeft}</p>)}
                </div>
            </div>
        </div>
    );
}