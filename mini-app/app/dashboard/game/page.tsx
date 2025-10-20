'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/app/context/UserContext';
import GameEngine, { GameEngineHandle, GameEvent } from '@/app/components/GameEngine';
import Toast from '@/app/components/Toast';
import styles from './page.module.css';
import { sdk } from '@farcaster/miniapp-sdk';
import { useMiniApp } from '@neynar/react';
import AddAppBanner from '@/app/components/AddAppBanner';
import ApologyModal from '@/app/components/ApologyModal';
import { formatPoints } from '@/app/utils/format';
import NewHighScoreAnimation from '@/app/components/NewHighScoreAnimation';

export default function GamePage() {
    const router = useRouter();
    const [showApologyModal, setShowApologyModal] = useState(false);
    const [showHighScoreAnimation, setShowHighScoreAnimation] = useState(false);
    const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const hasSeenModal = localStorage.getItem('hasSeenApologyModal');
        if (!hasSeenModal) {
            const timer = setTimeout(() => {
                setShowApologyModal(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleCloseApologyModal = () => {
        setShowApologyModal(false);
        localStorage.setItem('hasSeenApologyModal', 'true');
    };

    const { userProfile, fid, refetchUserProfile } = useUser();
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        if (userProfile) {
            setHighScore(userProfile.highScore || 0);
        }
    }, [userProfile]);

    useEffect(() => {
        if (userProfile && userProfile.registrationStatus !== 'ACTIVE') {
            router.push('/onboarding/register');
        }
    }, [userProfile, router]);

    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info', duration?: number } | null>(null);
    const [inGameScore, setInGameScore] = useState(0);
    const [pumpkinsCollected, setPumpkinsCollected] = useState(0);

    const handleScoreUpdate = (score: number) => {
        setInGameScore(score);
    };
    const gameEngineRef = useRef<GameEngineHandle>(null);
    const [isMuted, setIsMuted] = useState(false);
    const { context } = useMiniApp();
    const [showAddAppBanner, setShowAddAppBanner] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isStartingGame, setIsStartingGame] = useState(false);
    const [isEndingGame, setIsEndingGame] = useState(false);
    const [isGameWon, setIsGameWon] = useState(false);

    const handleStartGame = async () => {
        setIsStartingGame(true);
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await sdk.quickAuth.fetch('/api/game/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });

                if (response.ok) {
                    const { sessionId } = await response.json();
                    setSessionId(sessionId);
                    setIsStartingGame(false);
                    return true; // Indicate success
                }

                if (response.status >= 500) {
                    attempts++;
                    setToast({ message: `Server timeout. Reconnecting...`, type: 'info', duration: 700 });
                    if (attempts >= maxAttempts) {
                        throw new Error('Failed to start game session after multiple attempts.');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                throw new Error((await response.json()).message || 'Failed to start game session.');

            } catch (err) {
                setToast({ message: (err as Error).message, type: 'error' });
                setIsStartingGame(false);
                return false; // Indicate failure
            }
        }
        setIsStartingGame(false);
        return false;
    };

    useEffect(() => {
        if (context && context.client?.added === false) {
            setShowAddAppBanner(true);
        }
    }, [context]);

    const toggleMute = () => { setIsMuted(prevState => !prevState); };

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
            const fid = userProfile.fid;

            const frameUrl = `${appUrl}/share-frame?score=${inGameScore}&username=${username}&pfpUrl=${pfpUrl}&fid=${fid}&revalidate=true`;
            
            const pumpkinText = pumpkinsCollected > 0 ? ' plus a Halloween 🎃 Coin' : '';
            const castText = `I just scored ${inGameScore} points${pumpkinText} in the ENB Blast! Can you beat my score?`;

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

    const handleGameWin = useCallback(async (events: GameEvent[]) => {
        console.log('Game ended. Events:', JSON.stringify(events, null, 2));
        if (!sessionId) {
            setToast({ message: 'No active game session.', type: 'error' });
            return;
        }
        setIsEndingGame(true);
        setIsGameWon(true); // Show "Game Over" screen immediately
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await sdk.quickAuth.fetch('/api/game/end', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, events }),
                });

                const responseData = await response.json();
                console.log('Server response:', responseData);

                if (response.ok) {
                    const { pumpkinsCollected, isNewHighScore } = responseData;
                    setPumpkinsCollected(pumpkinsCollected);
                    
                    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
                    const updatedProfile = await refetchUserProfile();
                    if (isNewHighScore && updatedProfile?.highScore) {
                        setHighScore(updatedProfile.highScore);
                        setShowHighScoreAnimation(true);
                    }
                    
                    setIsEndingGame(false);
                    return; 
                }

                if (response.status >= 500) {
                    attempts++;
                    setToast({ message: `Server timeout. Reconnecting...`, type: 'info', duration: 700 });
                    if (attempts >= maxAttempts) {
                        throw new Error('Failed to save score after multiple attempts.');
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                throw new Error(responseData.message || 'Failed to end game session.');

            } catch (err) {
                setToast({ message: (err as Error).message, type: 'error' });
                setIsEndingGame(false);
                return; 
            }
        }
        setIsEndingGame(false);
    }, [sessionId, queryClient, refetchUserProfile]);

    const handleTryAgain = () => {
        if (gameEngineRef.current) gameEngineRef.current.resetGame();
        setInGameScore(0);
        setPumpkinsCollected(0);
        setIsGameWon(false);
    };

    return (
        <div className={styles.gameContainer}>
            {showApologyModal && <ApologyModal onClose={handleCloseApologyModal} />}
            {showAddAppBanner && <AddAppBanner onAppAdded={() => setShowAddAppBanner(false)} />}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} duration={toast.duration} />}
            <GameEngine
                ref={gameEngineRef}
                onGameWin={handleGameWin}
                onStartGame={handleStartGame}
                onScoreUpdate={handleScoreUpdate}
                displayScore={inGameScore}
                highScore={highScore}
                isMuted={isMuted}
                onToggleMute={toggleMute}
                handleShareScoreFrame={handleShareScoreFrame}
                handleTryAgain={handleTryAgain}
                isStartingGame={isStartingGame}
                isEndingGame={isEndingGame}
                isGameWon={isGameWon}
                onAnimationComplete={() => setShowHighScoreAnimation(false)}
            />
        </div>
    );
}
