'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, createRef } from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import gameStyles from '@/app/dashboard/game/game.module.css';
import Avatar from './Avatar';
import { useUser } from '@/app/context/UserContext';
import { useTour } from '@/app/context/TourContext';
import HighlightTooltip from './HighlightTooltip';
import DidYouKnow from './DidYouKnow';
import { BASE_BLOCKCHAIN_FACTS } from '@/app/utils/constants';

const GAME_DURATION = 30;

const INITIAL_SPAWN_RATE = 300;
const INITIAL_BOMB_SPEED = 5.5;
const INITIAL_PICTURE_SPEED = 5.2;
const INITIAL_BOMB_CHANCE = 0.21;

const FINAL_SPAWN_RATE = 250;
const FINAL_BOMB_SPEED = 8.5;
const FINAL_PICTURE_SPEED = 9;
const FINAL_BOMB_CHANCE = 0.48;

const PICTURE_URL = "/Enb_000.png";
const BASE_PICTURE_VALUE = 2;

const POWER_UP_POINT_2_URL = "/powerup_2.png";
const POWER_UP_POINT_2_VALUE = 3;
const POWER_UP_POINT_2_CHANCE = 0.08;

const POWER_UP_POINT_5_URL = "/powerup_5.png";
const POWER_UP_POINT_5_VALUE = 4;
const POWER_UP_POINT_5_CHANCE = 0.0109;

const POWER_UP_POINT_10_URL = "/powerup_10.png";
const POWER_UP_POINT_10_VALUE = 5;
const POWER_UP_POINT_10_CHANCE = 0.008;

const POWER_UP_PUMPKIN_URL = "/pumpkin.png";
const POWER_UP_PUMPKIN_VALUE = 250;
const POWER_UP_PUMPKIN_CHANCE = 0.0008;

export type GameEvent = {
  type: 'collect';
  itemType: ItemType;
  timestamp: number;
} | {
  type: 'bomb_hit';
  timestamp: number;
};

type GameEngineProps = {
  onGameWin: (events: GameEvent[]) => void;
  onStartGame: () => Promise<boolean>;
  displayScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  claimCooldownEnds: string | null;
  countdown: string;
  claimsLeft: number | null;
  maxClaims: number | null;
  // Props for new overlay buttons
  handleClaim: () => void;
  handleShareScoreFrame: () => void;
  handleTryAgain: () => void;
  isClaimDisabled: boolean;
  isSignatureLoading: boolean;
  isWritePending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  claimButtonText: string;
  isClaimStatusLoading: boolean;
  claimStatusError: boolean;
  isStartingGame: boolean;
  isEndingGame: boolean;
};

export type GameEngineHandle = { resetGame: () => void; };

type ItemType = 'bomb' | 'picture' | 'powerup_point_2' | 'powerup_point_5' | 'powerup_point_10' | 'powerup_pumpkin';
type Item = {
  id: number; type: ItemType; x: number; y: number; speed: number;
  ref: React.RefObject<HTMLDivElement>;
};
type GameState = 'idle' | 'playing' | 'won' | 'lost';
let nextItemId = 0;

function isColliding(rect1: DOMRect, rect2: DOMRect): boolean {
  if (!rect1 || !rect2) return false;
  return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
}

const GameEngine = forwardRef<GameEngineHandle, GameEngineProps>(({ 
  onGameWin, 
  onStartGame,
  displayScore, 
  isMuted, 
  onToggleMute, 
  claimCooldownEnds, 
  countdown, 
  claimsLeft,
  maxClaims,
  handleClaim,
  handleShareScoreFrame,
  handleTryAgain,
  isClaimDisabled,
  isSignatureLoading,
  isWritePending,
  isConfirming,
  isConfirmed,
  claimButtonText,
  isClaimStatusLoading,
  claimStatusError,
  isStartingGame,
  isEndingGame
}, ref) => {
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [floatingScores, setFloatingScores] = useState<{ id: number; points: number; x: number; y: number; }[]>([]);
  const [isBombHit, setIsBombHit] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ x: 150, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGameOverSoundPlayed, setIsGameOverSoundPlayed] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const isProcessingBombHit = useRef(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(score);
  const gameEventsRef = useRef<GameEvent[]>([]);
  const lastSpawnTimeRef = useRef(0);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const bombSoundRef = useRef<HTMLAudioElement | null>(null);
  const backgroundSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatSoundRef = useRef<HTMLAudioElement | null>(null);

  const gameParamsRef = useRef({
    bombSpeed: INITIAL_BOMB_SPEED,
    pictureSpeed: INITIAL_PICTURE_SPEED,
    spawnRate: INITIAL_SPAWN_RATE,
    bombChance: INITIAL_BOMB_CHANCE,
  });

  const { userProfile } = useUser();
  const { activeTourStep, tourSteps } = useTour();
  const avatarPfp = userProfile?.pfpUrl || PICTURE_URL;

  const isGameLocked = claimCooldownEnds !== null || claimsLeft === 0 || claimStatusError;

  useEffect(() => {
    const imageUrls = [
      '/bomb.png', PICTURE_URL, POWER_UP_POINT_5_URL, POWER_UP_POINT_10_URL,
      POWER_UP_POINT_2_URL, avatarPfp
    ];
    imageUrls.forEach(url => {
      if (url) { new Image().src = url; }
    });
  }, [avatarPfp]);

  const isInvincibleRef = useRef(isInvincible);

  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { isInvincibleRef.current = isInvincible; }, [isInvincible]);

  useEffect(() => {
    coinSoundRef.current = new Audio('/sounds/coin.wav');
    coinSoundRef.current.load();
    coinSoundRef.current.volume = 0.7;
    bombSoundRef.current = new Audio('/sounds/bomb.wav');
    bombSoundRef.current.load();
    bombSoundRef.current.volume = 0.5;
    backgroundSoundRef.current = new Audio('/sounds/background.mp3');
    backgroundSoundRef.current.load();
    backgroundSoundRef.current.loop = true;
    backgroundSoundRef.current.volume = 0.3;
    gameOverSoundRef.current = new Audio('/sounds/game-over.wav');
    gameOverSoundRef.current.load();
    gameOverSoundRef.current.volume = 0.6;
    heartbeatSoundRef.current = new Audio('/sounds/heartbeat.wav');
    heartbeatSoundRef.current.load();
    heartbeatSoundRef.current.volume = 0.8;
  }, []);

  const resetGame = useCallback(() => {
    setGameState('idle');
    setItems([]);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsBombHit(false);
    setFloatingScores([]);
    setIsDragging(false);
    setIsGameOverSoundPlayed(false);
    gameEventsRef.current = [];
    gameParamsRef.current = {
      bombSpeed: INITIAL_BOMB_SPEED,
      pictureSpeed: INITIAL_PICTURE_SPEED,
      spawnRate: INITIAL_SPAWN_RATE,
      bombChance: INITIAL_BOMB_CHANCE,
    };
  }, []);

  useImperativeHandle(ref, () => ({ resetGame }));

  const startGame = async () => {
    resetGame();
    const success = await onStartGame();
    if (success) {
      setGameState('playing');
      if (coinSoundRef.current?.paused) { coinSoundRef.current.play().catch(() => {}).then(() => coinSoundRef.current?.pause()); }
      if (bombSoundRef.current?.paused) { bombSoundRef.current.play().catch(() => {}).then(() => bombSoundRef.current?.pause()); }
      if (gameOverSoundRef.current?.paused) { gameOverSoundRef.current.play().catch(() => {}).then(() => gameOverSoundRef.current?.pause()); }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !gameAreaRef.current || !avatarRef.current) return;
    const gameRect = gameAreaRef.current.getBoundingClientRect();
    const avatarRect = avatarRef.current.getBoundingClientRect();
    const avatarHalfWidth = avatarRect.width / 2;
    const avatarHalfHeight = avatarRect.height / 2;
    let newX = e.clientX - gameRect.left;
    let newY = e.clientY - gameRect.top;
    newX = Math.max(avatarHalfWidth, Math.min(newX, gameRect.width - avatarHalfWidth));
    newY = Math.max(avatarHalfHeight, Math.min(newY, gameRect.height - avatarHalfHeight));
    setAvatarPosition({ x: newX, y: newY });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (isInvincible) {
      heartbeatSoundRef.current?.play().catch(e => console.error("Heartbeat audio play failed:", e));
      if (backgroundSoundRef.current) backgroundSoundRef.current.volume = 0.08;
      if (coinSoundRef.current) coinSoundRef.current.volume = 0.7;
    } else {
      if (heartbeatSoundRef.current) {
        heartbeatSoundRef.current.pause();
        heartbeatSoundRef.current.currentTime = 0;
      }
      if (backgroundSoundRef.current) backgroundSoundRef.current.volume = 0.3;
      if (coinSoundRef.current) coinSoundRef.current.volume = 1.0;
    }
  }, [isInvincible]);

  useEffect(() => {
    if (gameState === 'playing' && !isMuted) {
      backgroundSoundRef.current?.play().catch(e => console.error("Background audio play failed:", e));
    } else {
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.pause();
        backgroundSoundRef.current.currentTime = 0;
      }
    }
    if (gameState !== 'playing') {
      isProcessingBombHit.current = false;
    }
  }, [gameState, isMuted]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          clearInterval(timerInterval);
          setGameState('won');
          return 0;
        }
        const timeElapsed = GAME_DURATION - newTime;
        const progress = Math.min(timeElapsed / (GAME_DURATION - 15), 1);
        gameParamsRef.current = {
          bombSpeed: INITIAL_BOMB_SPEED + (FINAL_BOMB_SPEED - INITIAL_BOMB_SPEED) * progress,
          pictureSpeed: INITIAL_PICTURE_SPEED + (FINAL_PICTURE_SPEED - INITIAL_PICTURE_SPEED) * progress,
          spawnRate: INITIAL_SPAWN_RATE - (INITIAL_SPAWN_RATE - FINAL_SPAWN_RATE) * progress,
          bombChance: INITIAL_BOMB_CHANCE + (FINAL_BOMB_CHANCE - INITIAL_BOMB_CHANCE) * progress,
        };
        return newTime;
      });
    }, 1000);

    let animationFrameId: number;
    const gameLoop = (timestamp: number) => {
      if (!lastSpawnTimeRef.current) lastSpawnTimeRef.current = timestamp;
      const shouldSpawn = timestamp - lastSpawnTimeRef.current > gameParamsRef.current.spawnRate;
      if (shouldSpawn) lastSpawnTimeRef.current = timestamp;

      setItems(prevItems => {
        let currentItems = [...prevItems];
        if (shouldSpawn) {
          const rand = Math.random();
          const { bombChance } = gameParamsRef.current;
          let itemType: ItemType = 'picture';
          if (rand < bombChance) itemType = 'bomb';
          else if (rand < bombChance + POWER_UP_PUMPKIN_CHANCE) itemType = 'powerup_pumpkin';
          else if (rand < bombChance + POWER_UP_PUMPKIN_CHANCE + POWER_UP_POINT_10_CHANCE) itemType = 'powerup_point_10';
          else if (rand < bombChance + POWER_UP_PUMPKIN_CHANCE + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE) itemType = 'powerup_point_5';
          else if (rand < bombChance + POWER_UP_PUMPKIN_CHANCE + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE + POWER_UP_POINT_2_CHANCE) itemType = 'powerup_point_2';
          const speed = itemType === 'bomb' ? gameParamsRef.current.bombSpeed : gameParamsRef.current.pictureSpeed;
          currentItems.push({ id: nextItemId++, type: itemType, x: Math.random() * 90 + 5, y: -10, speed, ref: createRef() });
        }
        let processedItems = currentItems
          .map(item => ({ ...item, y: item.y + (item.type === 'bomb' ? gameParamsRef.current.bombSpeed : gameParamsRef.current.pictureSpeed) }))
          .filter(item => item.y < 500);
        if (avatarRef.current) {
          const avatarRect = avatarRef.current.getBoundingClientRect();
          let bombCollisionItem: Item | null = null;
          const remainingItems = processedItems.filter(item => {
            if (!item.ref.current || !isColliding(avatarRect, item.ref.current.getBoundingClientRect())) return true;
            
            if (item.type === 'bomb') {
              if (!isInvincibleRef.current) {
                bombCollisionItem = item;
              }
            } else {
              gameEventsRef.current.push({ type: 'collect', itemType: item.type, timestamp: Date.now() });
              if (coinSoundRef.current) {
                coinSoundRef.current.currentTime = 0;
                coinSoundRef.current.play().catch(e => console.error(e));
              }
              if (!isInvincibleRef.current) sdk.haptics.impactOccurred('soft');
              let points = BASE_PICTURE_VALUE;
              if (item.type === 'powerup_point_2') points = POWER_UP_POINT_2_VALUE;
              if (item.type === 'powerup_point_5') points = POWER_UP_POINT_5_VALUE;
              if (item.type === 'powerup_point_10') points = POWER_UP_POINT_10_VALUE;
              if (item.type === 'powerup_pumpkin') {
                points = POWER_UP_PUMPKIN_VALUE;
              }
              setScore(prev => prev + points);
              const newFloatingScore = { id: nextItemId++, points, x: item.x, y: item.y };
              setFloatingScores(prev => [...prev, newFloatingScore]);
              setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== newFloatingScore.id)), 1600);
            }
            return false;
          });

          if (bombCollisionItem) {
            if (isProcessingBombHit.current) return [];
            isProcessingBombHit.current = true;
            
            gameEventsRef.current.push({ type: 'bomb_hit', timestamp: Date.now() });
            bombSoundRef.current?.play().catch(e => console.error(e));
            sdk.haptics.impactOccurred('heavy');
            setIsBombHit(true);
            setTimeout(() => setIsBombHit(false), 500);
            
            const { x, y } = bombCollisionItem;
            setScore(prev => {
              const newScore = prev <= 100 ? Math.floor(prev * 0.5) : Math.floor(prev * 0.4);
              const pointsDeducted = prev - newScore;
              if (pointsDeducted > 0) {
                const newFloatingScore = { id: nextItemId++, points: -pointsDeducted, x, y };
                setFloatingScores(prevScores => [...prevScores, newFloatingScore]);
                setTimeout(() => setFloatingScores(prevScores => prevScores.filter(s => s.id !== newFloatingScore.id)), 1600);
              }
              return newScore;
            });

            setIsInvincible(true);
            setTimeout(() => {
              setIsInvincible(false);
              isProcessingBombHit.current = false;
            }, 3000);
            return [];
          }
          return remainingItems;
        }
        return processedItems;
      });
      animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => {
      clearInterval(timerInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'won' && !isGameOverSoundPlayed) {
      onGameWin(gameEventsRef.current);
      gameOverSoundRef.current?.play().catch(e => console.error(e));
      setIsGameOverSoundPlayed(true);
    }
  }, [gameState, onGameWin, isGameOverSoundPlayed]);

  const renderItem = (item: Item) => {
    switch (item.type) {
      case 'bomb': return <img src="/bomb.png" alt="Bomb" className={gameStyles.itemImage} />;
      case 'picture': return <img src={PICTURE_URL} alt="Target" className={gameStyles.itemImage} />;
      case 'powerup_point_5': return <img src={POWER_UP_POINT_5_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_10': return <img src={POWER_UP_POINT_10_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_2': return <img src={POWER_UP_POINT_2_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_pumpkin': return <img src={POWER_UP_PUMPKIN_URL} alt="Power Up" className={gameStyles.itemImage} />;
      default: return null;
    }
  };

  const isSoundButtonTourActive = tourSteps[activeTourStep]?.id === 'sound-toggle';
  const soundButtonTourStep = tourSteps.find(step => step.id === 'sound-toggle');

  return (
    <>
      <div className={gameStyles.gameStats}>
        <span onClick={() => { setScore(0); setItems([]); }} style={{ cursor: 'pointer' }}>Score: <strong>{score.toLocaleString()}</strong></span>
        <span>Time Left: <strong>{timeLeft}s</strong></span>
      </div>
      <div
        ref={gameAreaRef}
        className={`${gameStyles.gameArea} ${isBombHit ? gameStyles.bombHitEffect : ''} ${(gameState === 'won' || gameState === 'lost') ? gameStyles.gameOverBlur : ''}`}
        onClick={gameState === 'idle' && !isGameLocked && !isClaimStatusLoading ? startGame : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {isGameLocked && (
          <div className={gameStyles.overlay}>
            {claimStatusError ? (
              <>
                <h2>Error</h2>
                <p>Could not check your game limit.<br/>Please try again later.</p>
              </>
            ) : (
              <>
                <h2>Game on Cooldown</h2>
                {claimCooldownEnds ? (
                  <p>Next claim in: <br/><strong>{countdown}</strong></p>
                ) : (
                  <p>You have no claims left today.</p>
                )}
              </>
            )}
          </div>
        )}

        {gameState === 'idle' && !isGameLocked && (
          <>
            <HighlightTooltip
              text={soundButtonTourStep?.text || ''}
              show={isSoundButtonTourActive}
              position="bottom"
              alignment="right"
              className={`${gameStyles.muteButtonContainer} ${gameStyles.soundButtonTooltipWrapper}`}
            >
              <div className={gameStyles.muteButtonContainer} onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }} className={gameStyles.muteButton}>
                  {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                </button>
              </div>
            </HighlightTooltip>
            <div className={gameStyles.overlay}>
              {isStartingGame ? (
                <>
                  <div className={gameStyles.spinner}></div>
                  <p>Starting game...</p>
                  <DidYouKnow facts={BASE_BLOCKCHAIN_FACTS} />
                </>
              ) : isClaimStatusLoading ? (
                <>
                  <h2 className={gameStyles.loadingText}>Checking claim status...</h2>
                  <p>Please wait a moment.</p>
                </>
              ) : (
                <>
                  <h2>blast ENBS</h2>
                  <p>
                    Drag your avatar to collect.<br />Avoid the Wormhole ENBs!
                    <br /><br />
                    {claimsLeft !== null && maxClaims !== null && (
                      <>
                        Claims left: {claimsLeft}/{maxClaims}
                        <br /><br />
                      </>
                    )}
                    Click to Start
                  </p>
                </>
              )}
            </div>
          </>
        )}

        {gameState === 'lost' && !isGameLocked && (
          <div className={gameStyles.overlay}>
            <h2>Game Over!</h2>
            <p>Your final score: {displayScore}</p>
            <div className={gameStyles.overlayButtonContainer}>
              {claimsLeft !== null && maxClaims !== null && (
                <p className={gameStyles.claimsLeftText}>
                  Claims left: {claimsLeft}/{maxClaims}
                </p>
              )}
              <button onClick={handleTryAgain} className={`${gameStyles.overlayButton} ${gameStyles.tryAgainButtonRed}`}>
                Try Again
              </button>
              {displayScore > 0 && (
                <button onClick={handleShareScoreFrame} className={`${gameStyles.overlayButton} ${gameStyles.shareButton}`}>
                  Share Score
                </button>
              )}
            </div>
          </div>
        )}
        {gameState === 'won' && !isGameLocked && (
          <div className={gameStyles.overlay}>
            {isEndingGame ? (
              <>
                <div className={gameStyles.spinner}></div>
                <p>Saving score...</p>
              </>
            ) : (
              <>
                <h2>Game Over!</h2>
                <p>Your final score: {(displayScore).toLocaleString()}</p>
                <div className={gameStyles.overlayButtonContainer}>
                  {displayScore > 0 ? (
                    <>
                      {claimsLeft !== null && maxClaims !== null && (
                        <p className={gameStyles.claimsLeftText}>
                          Claims left: {claimsLeft}/{maxClaims}
                        </p>
                      )}
                      {!isConfirmed ? (
                        <button
                          onClick={handleClaim}
                          disabled={isClaimDisabled}
                          className={`${gameStyles.overlayButton} ${gameStyles.claimButtonGreen}`}
                        >
                          {claimCooldownEnds ? `On Cooldown` :
                            claimsLeft === 0 ? 'No Claims Left' :
                              isSignatureLoading ? 'Preparing...' :
                                isWritePending ? 'Check Wallet...' :
                                  isConfirming ? 'Confirming...' :
                                    claimButtonText}
                        </button>
                      ) : (
                        <button onClick={handleTryAgain} className={`${gameStyles.overlayButton} ${gameStyles.tryAgainButtonRed}`}>
                          Play Again
                        </button>
                      )}
                      <button onClick={handleShareScoreFrame} className={`${gameStyles.overlayButton} ${gameStyles.shareButton}`}>
                        Share Score
                      </button>
                    </>
                  ) : (
                    <>
                      {claimsLeft !== null && maxClaims !== null && (
                        <p className={gameStyles.claimsLeftText}>
                          Claims left: {claimsLeft}/{maxClaims}
                        </p>
                      )}
                      <button onClick={handleTryAgain} className={`${gameStyles.overlayButton} ${gameStyles.tryAgainButtonRed}`}>
                        Try Again
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        
        {gameState === 'playing' && <Avatar ref={avatarRef} position={avatarPosition} pfpUrl={avatarPfp} isInvincible={isInvincible} />}

        {items.map(item => (
          <div
            key={item.id}
            ref={item.ref}
            className={gameStyles.item}
            style={{ top: `${item.y}px`, left: `${item.x}%` }}
          >
            {renderItem(item)}
          </div>
        ))}
        {floatingScores.map(score => (
          <div
            key={score.id}
            className={`${gameStyles.floatingScore} ${score.points < 0 ? gameStyles.floatingScoreNegative : ''}`}
            style={{ 
              top: `${score.y}px`, 
              left: `${score.x}px`
            }}
          >
            {score.points > 0 ? `+${score.points}` : score.points}
          </div>
        ))}
      </div>
    </>
  );
});

GameEngine.displayName = 'GameEngine';
export default GameEngine;