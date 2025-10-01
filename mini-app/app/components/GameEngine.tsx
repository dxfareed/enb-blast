'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, createRef } from 'react';
import { RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import gameStyles from '@/app/dashboard/game/game.module.css';
import Avatar from './Avatar';
import { useUser } from '@/app/context/UserContext';
import { useTour } from '@/app/context/TourContext';
import HighlightTooltip from './HighlightTooltip';

const GAME_DURATION = 30;

const INITIAL_SPAWN_RATE = 310; // ms between spawns
const INITIAL_BOMB_SPEED = 2.4; // pixels per frame
const INITIAL_PICTURE_SPEED = 2.2; // pixels per frame
const INITIAL_BOMB_CHANCE = 0.08; // 10% chance

// Final game parameters at the end of the timer for scaling
const FINAL_SPAWN_RATE = 250; // ms between spawns
const FINAL_BOMB_SPEED = 4.5; // pixels per frame
const FINAL_PICTURE_SPEED = 5.4; // pixels per frame
const FINAL_BOMB_CHANCE = 0.25; // 40% chance

// Power-up configuration
const PICTURE_URL = "/Enb_000.png";
const POWER_UP_POINT_5_URL = "https://pbs.twimg.com/profile_images/1734354549496836096/-laoU9C9_400x400.jpg";
const POWER_UP_POINT_5_VALUE = 5;
const POWER_UP_POINT_5_CHANCE = 0.01;
const POWER_UP_POINT_10_URL = "https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg";
const POWER_UP_POINT_10_VALUE = 10;
const POWER_UP_POINT_10_CHANCE = 0.005;
const POWER_UP_POINT_2_URL = "https://pbs.twimg.com/profile_images/1878738447067652096/tXQbWfpf_400x400.jpg";
const POWER_UP_POINT_2_VALUE = 2;
const POWER_UP_POINT_2_CHANCE = 0.03;

type GameEngineProps = {
  onGameWin: (finalScore: number) => void;
  displayScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
};
export type GameEngineHandle = { resetGame: () => void; };

type ItemType = 'bomb' | 'picture' | 'powerup_point_2' | 'powerup_point_5' | 'powerup_point_10';
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

const GameEngine = forwardRef<GameEngineHandle, GameEngineProps>(({ onGameWin, displayScore, isMuted, onToggleMute }, ref) => {
  // --- STATE MANAGEMENT ---
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [floatingScores, setFloatingScores] = useState<{ id: number; points: number; x: number; y: number; }[]>([]);
  const [isBombHit, setIsBombHit] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ x: 150, y: 300 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGameOverSoundPlayed, setIsGameOverSoundPlayed] = useState(false);
  //const [showTooltip, setShowTooltip] = useState(false);

  // --- REFS ---
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef(score);
  const lastSpawnTimeRef = useRef(0);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const bombSoundRef = useRef<HTMLAudioElement | null>(null);
  const backgroundSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

  const gameParamsRef = useRef({
    bombSpeed: INITIAL_BOMB_SPEED,
    pictureSpeed: INITIAL_PICTURE_SPEED,
    spawnRate: INITIAL_SPAWN_RATE,
    bombChance: INITIAL_BOMB_CHANCE,
  });

  const { userProfile } = useUser();
  const { activeTourStep, tourSteps } = useTour();
  const avatarPfp = userProfile?.pfpUrl || PICTURE_URL;

  useEffect(() => { scoreRef.current = score; }, [score]);

  useEffect(() => {
    coinSoundRef.current = new Audio('/sounds/coin.wav');
    coinSoundRef.current.load();
    coinSoundRef.current.volume = 1.0;
    bombSoundRef.current = new Audio('/sounds/bomb.wav');
    bombSoundRef.current.load();
    bombSoundRef.current.volume = 1.0;
    backgroundSoundRef.current = new Audio('/sounds/background.mp3');
    backgroundSoundRef.current.load();
    backgroundSoundRef.current.loop = true;
    backgroundSoundRef.current.volume = 0.3;
    gameOverSoundRef.current = new Audio('/sounds/game-over.wav');
    gameOverSoundRef.current.load();
    gameOverSoundRef.current.volume = 1.0;
  }, []);

  // --- GAME CONTROL FUNCTIONS ---
  const resetGame = useCallback(() => {
    console.log("%c--- RESETTING GAME STATE ---", "color: orange; font-weight: bold;");
    setGameState('idle');
    setItems([]);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsBombHit(false);
    setFloatingScores([]);
    setIsDragging(false);
    setIsGameOverSoundPlayed(false);

    // Explicitly reset game parameters to their initial values.
    gameParamsRef.current = {
      bombSpeed: INITIAL_BOMB_SPEED,
      pictureSpeed: INITIAL_PICTURE_SPEED,
      spawnRate: INITIAL_SPAWN_RATE,
      bombChance: INITIAL_BOMB_CHANCE,
    };
  }, []);

  useImperativeHandle(ref, () => ({ resetGame }));

  const startGame = () => {
    resetGame();
    setGameState('playing');

    // Unlock audio on first user gesture
    if (coinSoundRef.current && coinSoundRef.current.paused) {
      coinSoundRef.current.play().catch(() => { });
      coinSoundRef.current.pause();
    }
    if (bombSoundRef.current && bombSoundRef.current.paused) {
      bombSoundRef.current.play().catch(() => { });
      bombSoundRef.current.pause();
    }
    if (backgroundSoundRef.current && backgroundSoundRef.current.paused) {
      backgroundSoundRef.current.play().catch(() => { });
      backgroundSoundRef.current.pause();
    }
    if (gameOverSoundRef.current && gameOverSoundRef.current.paused) {
      gameOverSoundRef.current.play().catch(() => { });
      gameOverSoundRef.current.pause();
    }
  };

  // --- POINTER HANDLERS for AVATAR ---
  const handlePointerDown = (e: React.PointerEvent) => {
    if (gameState !== 'playing') return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !gameAreaRef.current || !avatarRef.current) return; // Ensure avatarRef is available
    const gameRect = gameAreaRef.current.getBoundingClientRect();
    const avatarRect = avatarRef.current.getBoundingClientRect();

    const avatarHalfWidth = avatarRect.width / 2;
    const avatarHalfHeight = avatarRect.height / 2;

    let newX = e.clientX - gameRect.left;
    let newY = e.clientY - gameRect.top;

    // Clamp X coordinate
    newX = Math.max(avatarHalfWidth, Math.min(newX, gameRect.width - avatarHalfWidth));
    // Clamp Y coordinate
    newY = Math.max(avatarHalfHeight, Math.min(newY, gameRect.height - avatarHalfHeight));

    setAvatarPosition({ x: newX, y: newY });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (gameState === 'playing' && !isMuted) {
      backgroundSoundRef.current?.play().catch(e => console.error("Background audio play failed:", e));
    } else {
      if (backgroundSoundRef.current) {
        backgroundSoundRef.current.pause();
        backgroundSoundRef.current.currentTime = 0;
      }
    }
  }, [gameState, isMuted]);

  useEffect(() => {
    // This effect only runs when the game starts ('playing') and cleans up when it stops.
    // The dependency array is intentionally limited to `[gameState]` to prevent re-runs.
    if (gameState !== 'playing') {
      return;
    }

    console.log(`%c--- NEW GAME STARTED ---`, "color: green; font-weight: bold;");

    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          clearInterval(timerInterval);
          setGameState('won'); // Changing state triggers effect cleanup.
          return 0;
        }

        const timeElapsed = GAME_DURATION - newTime;
        const progress = Math.min(timeElapsed / (GAME_DURATION - 10), 1);

        const newBombSpeed = INITIAL_BOMB_SPEED + (FINAL_BOMB_SPEED - INITIAL_BOMB_SPEED) * progress;
        const newSpawnRate = INITIAL_SPAWN_RATE - (INITIAL_SPAWN_RATE - FINAL_SPAWN_RATE) * progress;
        const newBombChance = INITIAL_BOMB_CHANCE + (FINAL_BOMB_CHANCE - INITIAL_BOMB_CHANCE) * progress;

        gameParamsRef.current = {
          ...gameParamsRef.current,
          bombSpeed: newBombSpeed,
          pictureSpeed: INITIAL_PICTURE_SPEED + (FINAL_PICTURE_SPEED - INITIAL_PICTURE_SPEED) * progress,
          spawnRate: newSpawnRate,
          bombChance: newBombChance,
        };

        return newTime;
      });
    }, 1000);

    let animationFrameId: number;
    const gameLoop = (timestamp: number) => {
      if (!lastSpawnTimeRef.current) lastSpawnTimeRef.current = timestamp;

      if (timestamp - lastSpawnTimeRef.current > gameParamsRef.current.spawnRate) {
        lastSpawnTimeRef.current = timestamp;
        const rand = Math.random();
        let itemType: ItemType = 'picture';
        const { bombChance } = gameParamsRef.current;

        if (rand < bombChance) { itemType = 'bomb'; }
        else if (rand < bombChance + POWER_UP_POINT_10_CHANCE) { itemType = 'powerup_point_10'; }
        else if (rand < bombChance + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE) { itemType = 'powerup_point_5'; }
        else if (rand < bombChance + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE + POWER_UP_POINT_2_CHANCE) { itemType = 'powerup_point_2'; }

        const speed = itemType === 'bomb' ? gameParamsRef.current.bombSpeed : gameParamsRef.current.pictureSpeed;
        const newItem: Item = { id: nextItemId++, type: itemType, x: Math.random() * 90 + 5, y: -10, speed, ref: createRef<HTMLDivElement>() };
        setItems(prev => [...prev, newItem]);
      }

      setItems(prevItems =>
        prevItems
          .map(item => ({ ...item, y: item.y + (item.type === 'bomb' ? gameParamsRef.current.bombSpeed : gameParamsRef.current.pictureSpeed) }))
          .filter(item => item.y < 450)
      );

      if (avatarRef.current) {
        const avatarRect = avatarRef.current.getBoundingClientRect();
        setItems(currentItems => {
          let hitBomb = false;
          const remainingItems = currentItems.filter(item => {
            if (!item.ref.current || !isColliding(avatarRect, item.ref.current.getBoundingClientRect())) return true;

            if (item.type === 'bomb') {
              hitBomb = true;
            } else {
              if (!isMuted && coinSoundRef.current) {
                console.log("Playing coin sound");
                coinSoundRef.current.currentTime = 0;
                coinSoundRef.current.play().catch(error => console.error("Audio play failed:", error));
              }
              sdk.haptics.impactOccurred('soft');
              let points = 1;
              if (item.type === 'powerup_point_2') points = POWER_UP_POINT_2_VALUE;
              if (item.type === 'powerup_point_5') points = POWER_UP_POINT_5_VALUE;
              if (item.type === 'powerup_point_10') points = POWER_UP_POINT_10_VALUE;
              setScore(prev => prev + points);
              const newFloatingScore = { id: nextItemId++, points, x: item.x, y: item.y };
              setFloatingScores(prev => [...prev, newFloatingScore]);
              setTimeout(() => setFloatingScores(prev => prev.filter(s => s.id !== newFloatingScore.id)), 500);
            }
            return false;
          });

          if (hitBomb) {
            if (!isMuted && bombSoundRef.current) {
              console.log("Playing bomb sound");
              bombSoundRef.current.currentTime = 0;
              bombSoundRef.current.play().catch(error => console.error("Audio play failed:", error));
            }
            sdk.haptics.impactOccurred('heavy');
            setIsBombHit(true);
            setTimeout(() => setIsBombHit(false), 2000);
            setScore(0);
            return []; // Clear all items on hit
          }
          return remainingItems;
        });
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // Start the unified loop
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      console.log(`%c--- CLEANING UP GAME LOOPS ---`, "color: red; font-weight: bold;");
      clearInterval(timerInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'won' && !isGameOverSoundPlayed) {
      onGameWin(scoreRef.current);
      if (!isMuted && gameOverSoundRef.current) {
        gameOverSoundRef.current.play().catch(e => console.error(e));
      }
      setIsGameOverSoundPlayed(true);
    }
  }, [gameState, onGameWin, isMuted, isGameOverSoundPlayed]);

  const renderItem = (item: Item) => {
    switch (item.type) {
      case 'bomb': return <img src="/bomb.png" alt="Bomb" className={gameStyles.itemImage} />;
      case 'picture': return <img src={PICTURE_URL} alt="Target" className={gameStyles.itemImage} />;
      case 'powerup_point_5': return <img src={POWER_UP_POINT_5_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_10': return <img src={POWER_UP_POINT_10_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_2': return <img src={POWER_UP_POINT_2_URL} alt="Power Up" className={gameStyles.itemImage} />;
      default: return null;
    }
  };

    const isSoundButtonTourActive = tourSteps[activeTourStep]?.id === 'sound-toggle';
  const soundButtonTourStep = tourSteps.find(step => step.id === 'sound-toggle');

  return (
    <>
      <div className={gameStyles.gameStats}>
        <span onClick={() => { setScore(0); setItems([]); }} style={{ cursor: 'pointer' }}>Score: <strong>{score}</strong></span>
        <span>Time Left: <strong>{timeLeft}s</strong></span>
      </div>
      <div
        ref={gameAreaRef}
        className={`${gameStyles.gameArea} ${isBombHit ? gameStyles.bombHitEffect : ''}`}
        onClick={gameState === 'idle' ? startGame : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {gameState === 'idle' && (
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

        )}
        {gameState === 'idle' && (
          <div className={gameStyles.overlay}>
            <h2>blast ENBS</h2>
            <p>Drag your avatar to collect.<br />Avoid the Wormhole ENBs!<br /><br />Click to Start</p>
          </div>
        )}
        {gameState === 'lost' && <div className={gameStyles.overlay} onClick={resetGame}><h2>Game Over!</h2><p><RotateCcw size={48} /></p></div>}
        {gameState === 'won' && <div className={gameStyles.overlay}><h2>Game Over!</h2><p>Your final score: {displayScore}<br />Claim is unlocked below.</p></div>}

        {gameState === 'playing' && <Avatar ref={avatarRef} position={avatarPosition} pfpUrl={avatarPfp} />}

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
            className={gameStyles.floatingScore}
            style={{ top: `${score.y}px`, left: `${score.x}px` }}
          >
            +{score.points}
          </div>
        ))}
      </div>
    </>
  );
});

GameEngine.displayName = 'GameEngine';
export default GameEngine;