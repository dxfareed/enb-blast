'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useFeeData } from 'wagmi';
import { useUser } from '@/app/context/UserContext';
import { parseGwei, parseEther } from 'viem';
import GameEngine, { GameEngineHandle } from '@/app/components/GameEngine';
import Toast from '@/app/components/Toast';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniApp } from '@neynar/react';
import AddAppBanner from '@/app/components/AddAppBanner';
import { GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, TOKEN_ADDRESS } from '@/app/utils/constants';
import { getTokenMarqueeData } from '@/lib/dexscreener';

export default function GamePage() {
    const { address } = useAccount();
    const { userProfile, fid, refetchUserProfile } = useUser();
    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [isClaimUnlocked, setIsClaimUnlocked] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [pumpkinsCollected, setPumpkinsCollected] = useState(0);
    const [isSignatureLoading, setIsSignatureLoading] = useState(false);
    const [isClaimFinalized, setIsClaimFinalized] = useState(false);
    const [showShareButton, setShowShareButton] = useState(false);
    const [playAgainCooldown, setPlayAgainCooldown] = useState(false);
    const [shareProgress, setShareProgress] = useState(0);
    const gameEngineRef = useRef<GameEngineHandle>(null);
    const [claimButtonText, setClaimButtonText] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const { context } = useMiniApp();
    const { data: feeData } = useFeeData();
    const [showAddAppBanner, setShowAddAppBanner] = useState(false);
    const [tokenPrice, setTokenPrice] = useState<number | null>(null);

    useEffect(() => {
        const fetchTokenPrice = async () => {
            const data = await getTokenMarqueeData(TOKEN_ADDRESS);
            if (data) {
                setTokenPrice(data.priceUsd);
            }
        };
        fetchTokenPrice();
    }, []);

    const [claimsLeft, setClaimsLeft] = useState<number | null>(null);
    const [maxClaims, setMaxClaims] = useState<number | null>(null);
    const [claimCooldownEnds, setClaimCooldownEnds] = useState<string | null>(null);
    const [countdown, setCountdown] = useState('');
    const [isClaimStatusLoading, setIsClaimStatusLoading] = useState(true);

    useEffect(() => {
        async function fetchClaimStatus() {
            if (fid) {
                try {
                    const statusResponse = await sdk.quickAuth.fetch('/api/claim/status');
                    if (statusResponse.ok) {
                        const { claimsLeft, isOnCooldown, resetsAt, maxClaims } = await statusResponse.json();
                        setClaimsLeft(claimsLeft);
                        setMaxClaims(maxClaims);
                        if (isOnCooldown) {
                            setClaimCooldownEnds(resetsAt);
                        }
                    } else {
                        console.warn("Could not fetch real-time claim status.");
                    }
                } catch (error) {
                    console.error("Failed to fetch claim status:", error);
                } finally {
                    setIsClaimStatusLoading(false);
                }
            }
        }
        fetchClaimStatus();
    }, [fid]);

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
                    refetchUserProfile();
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

    const handleClaim = async () => {
        if (!address || finalScore <= 0) return;

        if (feeData?.gasPrice) {
            const highGasThreshold = parseGwei('0.15');
            if (feeData.gasPrice > highGasThreshold) {
                setToast({
                    message: 'Network is busy and gas is high. Please try again later.',
                    type: 'info',
                });
                return;
            }
        }
        
        const claimAmount = finalScore;
        setIsSignatureLoading(true);
        try {
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

            const maxPriority = parseGwei('0.05');
            const maxFee = parseGwei('0.1');

            const { signature, nonce } = await signatureResponse.json();
            if (typeof nonce === 'undefined') {
                throw new Error("Invalid response from server: nonce is missing.");
            }

            writeContract({
                //@ts-ignore
                address: GAME_CONTRACT_ADDRESS,
                abi: GAME_CONTRACT_ABI,
                functionName: 'claimTokens',
                args: [parseEther(claimAmount.toString()), BigInt(nonce), signature],
                maxFeePerGas: maxFee,
                maxPriorityFeePerGas: maxPriority,
            });
        } catch (err) {
            setToast({ message: (err as Error).message, type: 'error' });
        } finally {
            setIsSignatureLoading(false);
        }
    };

    const handleShareScoreFrame = async () => {
        sdk.haptics.impactOccurred('heavy');
        try {
            if (!userProfile?.fid) {
                await refetchUserProfile();
                if (!userProfile?.fid) throw new Error("User profile could not be loaded.");
            }
            const appUrl = process.env.NEXT_PUBLIC_URL || '';
            const username = userProfile.username || '@johndoe';
            const pfpUrl = userProfile.pfpUrl || 'https://pbs.twimg.com/profile_images/1734354549496836096/-laoU-C9_400x400.jpg';
            const streak = userProfile.streak || 0;
            const claimed = userProfile.totalClaimed || 0;
            const weeklyPoints = userProfile.weeklyPoints || 0;
            const fid = userProfile.fid;

            const rank = userProfile.weeklyRank?.toString() || 'N/A';

            const frameUrl = `${appUrl}/share-frame?score=${finalScore}&username=${username}&pfpUrl=${pfpUrl}&streak=${streak}&claimed=${claimed}&weeklyPoints=${weeklyPoints}&rank=${rank}&fid=${fid}&revalidate=true`;
            /* 
            I just scored 546 points and earned 546.0 $ENB worth  $0.067 from ENB Blast round 
Go claim yours now!
            */
            const claimAmount = finalScore;
            const pumpkinText = pumpkinsCollected > 0 ? ' plus a Halloween 🎃 Coin' : '';

            let castText = `I just scored ${finalScore} points${pumpkinText} and earned ${claimAmount.toFixed(1)} $ENB from the ENB Blast.\nGo claim yours now!`;
            if (tokenPrice) {
                const usdValue = (claimAmount * tokenPrice).toFixed(3);
                castText = `I just scored ${finalScore} points${pumpkinText} and earned ${claimAmount.toFixed(1)} $ENB worth $${usdValue} from ENB Blast Round.\nGo claim yours now!`;
            }

            const result = await sdk.actions.composeCast({ text: castText, embeds: [frameUrl] });

            if (result.cast) {
                setToast({ message: "Success! Score shared!", type: 'success' });
            } else {
                setToast({ message: "Sharing cancelled.", type: 'info' });
            }
        } catch (error) {
            setToast({ message: (error as Error).message || `An error occurred.`, type: 'error' });
        }
    };

    const handleGameWin = useCallback((scoreFromGame: number, pumpkinsFromGame: number) => {
        setIsClaimUnlocked(true);
        setFinalScore(scoreFromGame);
        setPumpkinsCollected(pumpkinsFromGame);
        setClaimButtonText(`Claim ${(scoreFromGame).toLocaleString()} $ENB`);
    }, []);

    const handleTryAgain = () => {
        if (gameEngineRef.current) gameEngineRef.current.resetGame();
        setIsClaimUnlocked(false);
        setFinalScore(0);
        setPumpkinsCollected(0);
        setClaimButtonText('');
        if (isConfirmed) resetWriteContract();
        setIsClaimFinalized(false);
        setShowShareButton(false);
    };

    useEffect(() => {
        const error = writeError || confirmationError;
        if (error) {
            const message = 'shortMessage' in error ? error.shortMessage : error.message;
            setToast({ message, type: 'error' });
            resetWriteContract();
            return;
        }

        let progressInterval: NodeJS.Timeout;
        let cooldownTimeout: NodeJS.Timeout;

        const confirmClaim = async () => {
            if (!hash || isClaimFinalized) return;

            // Optimistically update the claims count
            setClaimsLeft(prev => (prev !== null ? Math.max(0, prev - 1) : null));

            setIsClaimFinalized(true);
            try {
                const response = await sdk.quickAuth.fetch('/api/claim/confirm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ txHash: hash }),
                });

                if (!response.ok) {
                    throw new Error((await response.json()).message || 'Failed to confirm claim on the server.');
                }
                setToast({ message: 'Claim successful!', type: 'success' });
                
                setShowShareButton(true);
                setPlayAgainCooldown(true);
                setShareProgress(0);

                progressInterval = setInterval(() => {
                    setShareProgress(prev => {
                        if (prev >= 100) {
                            clearInterval(progressInterval);
                            return 100;
                        }
                        return prev + 1;
                    });
                }, 50); // Update every 50ms for a 5s duration

                cooldownTimeout = setTimeout(() => {
                    setShowShareButton(false);
                    setPlayAgainCooldown(false);
                    clearInterval(progressInterval);
                }, 7000);

                await refetchUserProfile();
                queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
            } catch (err) {
                setToast({ message: (err as Error).message, type: 'error' });
            }
        };

        if (isConfirmed) {
            confirmClaim();
        }

        return () => {
            clearInterval(progressInterval);
            clearTimeout(cooldownTimeout);
        };
    }, [isConfirmed, isClaimFinalized, hash, refetchUserProfile, queryClient, writeError, confirmationError, resetWriteContract]);

    const isClaimDisabled = isWritePending || isConfirming || isSignatureLoading || isConfirmed || !!claimCooldownEnds || claimsLeft === 0;

    return (
        <div className={styles.gameContainer}>
            {showAddAppBanner && <AddAppBanner onAppAdded={() => setShowAddAppBanner(false)} />}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <GameEngine
                ref={gameEngineRef}
                onGameWin={handleGameWin}
                displayScore={finalScore}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                claimCooldownEnds={claimCooldownEnds}
                countdown={countdown}
                claimsLeft={claimsLeft}
                maxClaims={maxClaims}
                handleClaim={handleClaim}
                handleShareScoreFrame={handleShareScoreFrame}
                handleTryAgain={handleTryAgain}
                isClaimDisabled={isClaimDisabled}
                isSignatureLoading={isSignatureLoading}
                isWritePending={isWritePending}
                isConfirming={isConfirming}
                isConfirmed={isConfirmed}
                claimButtonText={claimButtonText}
                isClaimStatusLoading={isClaimStatusLoading}
            />

        </div>
    );
}