'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, createRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import gameStyles from '@/app/dashboard/game/game.module.css';
import Avatar from './Avatar';
import { useUser } from '@/app/context/UserContext';
import DidYouKnow from './DidYouKnow';
import { BASE_BLOCKCHAIN_FACTS } from '@/app/utils/constants';
import NewHighScoreAnimation from './NewHighScoreAnimation';
import * as GameConfig from '@/lib/gameConfig';

const GAME_DURATION = GameConfig.GAME_DURATION_SECONDS;

export type GameEvent = {
  type: 'collect';
  itemType: ItemType;
  timestamp: number;
} | {
  type: 'bomb_collision';
  timestamp: number;
} | {
  type: 'time_extend';
  duration: number;
  timestamp: number;
};

type GameEngineProps = {
  onGameWin: (events: GameEvent[]) => void;
  onStartGame: () => Promise<boolean>;
  onScoreUpdate: (score: number) => void;
  displayScore: number;
  highScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  handleShareScoreFrame: () => void;
  handleTryAgain: () => void;
  isStartingGame: boolean;
  isEndingGame: boolean;
  isGameWon: boolean;
  onAnimationComplete: () => void;
};

export type GameEngineHandle = { resetGame: () => void; };

type ItemType = 'bomb' | 'picture' | 'powerup_point_2' | 'powerup_point_5' | 'powerup_point_10' | 'powerup_pumpkin' | 'magnet' | 'shield' | 'time';
type Item = {
  id: number; type: ItemType; x: number; y: number; speed: number;
  imageUrl?: string;
  ref: React.RefObject<HTMLDivElement>;
};
type NewItemProperties = {
  type: ItemType;
  speed: number;
  imageUrl?: string;
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
  onScoreUpdate,
  displayScore,
  highScore,
  isMuted,
  onToggleMute,
  handleShareScoreFrame,
  handleTryAgain,
  isStartingGame,
  isEndingGame,
  isGameWon,
  onAnimationComplete
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
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  const magnetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const shieldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBombHit = useRef(false);
  const gameStartTimeRef = useRef<number | null>(null);
  const [showNewHighScoreAnimation, setShowNewHighScoreAnimation] = useState(false);
  const [gameAreaDimensions, setGameAreaDimensions] = useState({ width: 0, height: 0 });

  const isMagnetActiveRef = useRef(isMagnetActive);
  useEffect(() => { isMagnetActiveRef.current = isMagnetActive; }, [isMagnetActive]);
  const isShieldActiveRef = useRef(isShieldActive);
  useEffect(() => { isShieldActiveRef.current = isShieldActive; }, [isShieldActive]);
  const avatarPositionRef = useRef(avatarPosition);
  useEffect(() => { avatarPositionRef.current = avatarPosition; }, [avatarPosition]);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const gameEventsRef = useRef<GameEvent[]>([]);
  const lastSpawnTimeRef = useRef(0);
  const coinSoundRef = useRef<HTMLAudioElement | null>(null);
  const bombSoundRef = useRef<HTMLAudioElement | null>(null);
  const backgroundSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);
  const heartbeatSoundRef = useRef<HTMLAudioElement | null>(null);

  const gameParamsRef = useRef({
    bombSpeed: GameConfig.INITIAL_BOMB_SPEED,
    pictureSpeed: GameConfig.INITIAL_PICTURE_SPEED,
    spawnRate: GameConfig.INITIAL_SPAWN_RATE,
    bombChance: GameConfig.INITIAL_BOMB_CHANCE,
  });

  const { userProfile } = useUser();
  const avatarPfp = userProfile?.pfpUrl || GameConfig.PICTURE_URL;
  const [isPowerupActive, setIsPowerupActive] = useState(false);

  useEffect(() => {
    if (userProfile?.powerupExpiration) {
      const expirationDate = new Date(userProfile.powerupExpiration);
      if (expirationDate > new Date()) {
        setIsPowerupActive(true);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    if (gameAreaRef.current) {
      setGameAreaDimensions({
        width: gameAreaRef.current.offsetWidth,
        height: gameAreaRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (displayScore > highScore) {
      setShowNewHighScoreAnimation(true);
      const timer = setTimeout(() => {
        setShowNewHighScoreAnimation(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [displayScore, highScore]);

  useEffect(() => {
    const imageUrls = [
      '/bomb.png', GameConfig.PICTURE_URL, GameConfig.CAP_PICTURE_URL, GameConfig.POWER_UP_POINT_5_URL, GameConfig.POWER_UP_POINT_10_URL,
      GameConfig.POWER_UP_POINT_2_URL, GameConfig.POWER_UP_PUMPKIN_URL, GameConfig.POWER_UP_MAGNET_URL, GameConfig.POWER_UP_SHIELD_URL, avatarPfp
    ];
    imageUrls.forEach(url => {
      if (url) { new Image().src = url; }
    });
  }, [avatarPfp]);

  const isInvincibleRef = useRef(isInvincible);
  useEffect(() => { isInvincibleRef.current = isInvincible; }, [isInvincible]);

  useEffect(() => {
    coinSoundRef.current = new Audio('/sounds/coin.wav');
    bombSoundRef.current = new Audio('/sounds/bomb.wav');
    backgroundSoundRef.current = new Audio('/sounds/background.mp3');
    gameOverSoundRef.current = new Audio('/sounds/game-over.wav');
    heartbeatSoundRef.current = new Audio('/sounds/heartbeat.wav');

    coinSoundRef.current.volume = 0.7;
    bombSoundRef.current.volume = 0.5;
    backgroundSoundRef.current.loop = true;
    backgroundSoundRef.current.volume = 0.3;
    gameOverSoundRef.current.volume = 0.6;
    heartbeatSoundRef.current.volume = 0.8;

    return () => {
      const sounds = [coinSoundRef, bombSoundRef, backgroundSoundRef, gameOverSoundRef, heartbeatSoundRef];
      sounds.forEach(soundRef => {
        if (soundRef.current) {
          soundRef.current.pause();
          soundRef.current.src = '';
          soundRef.current = null;
        }
      });
    };
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
    setIsMagnetActive(false);
    if (magnetTimerRef.current) {
      clearTimeout(magnetTimerRef.current);
    }
    setIsShieldActive(false);
    if (shieldTimerRef.current) {
      clearTimeout(shieldTimerRef.current);
    }
    gameEventsRef.current = [];
    gameParamsRef.current = {
      bombSpeed: GameConfig.INITIAL_BOMB_SPEED,
      pictureSpeed: GameConfig.INITIAL_PICTURE_SPEED,
      spawnRate: GameConfig.INITIAL_SPAWN_RATE,
      bombChance: GameConfig.INITIAL_BOMB_CHANCE,
    };
  }, []);

  useImperativeHandle(ref, () => ({ resetGame }));

  const startGame = async () => {
    resetGame();
    const success = await onStartGame();
    if (success) {
      gameStartTimeRef.current = Date.now();
      setGameState('playing');
      if (coinSoundRef.current?.paused) { coinSoundRef.current.play().catch(() => { }).then(() => coinSoundRef.current?.pause()); }
      if (bombSoundRef.current?.paused) { bombSoundRef.current.play().catch(() => { }).then(() => bombSoundRef.current?.pause()); }
      if (gameOverSoundRef.current?.paused) { gameOverSoundRef.current.play().catch(() => { }).then(() => gameOverSoundRef.current?.pause()); }
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
    newY = Math.max(avatarHalfHeight, Math.min(newY, gameRect.height - avatarHalfHeight - 80));
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
    } else {
      if (heartbeatSoundRef.current) {
        heartbeatSoundRef.current.pause();
        heartbeatSoundRef.current.currentTime = 0;
      }
      if (backgroundSoundRef.current) backgroundSoundRef.current.volume = 0.3;
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
        return newTime;
      });

      if (gameStartTimeRef.current) {
        const timeElapsed = (Date.now() - gameStartTimeRef.current) / 1000;
        const progress = Math.min(timeElapsed / (GAME_DURATION - 15), 1);
        gameParamsRef.current = {
          bombSpeed: GameConfig.INITIAL_BOMB_SPEED + (GameConfig.FINAL_BOMB_SPEED - GameConfig.INITIAL_BOMB_SPEED) * progress,
          pictureSpeed: GameConfig.INITIAL_PICTURE_SPEED + (GameConfig.FINAL_PICTURE_SPEED - GameConfig.INITIAL_PICTURE_SPEED) * progress,
          spawnRate: GameConfig.INITIAL_SPAWN_RATE - (GameConfig.INITIAL_SPAWN_RATE - GameConfig.FINAL_SPAWN_RATE) * progress,
          bombChance: GameConfig.INITIAL_BOMB_CHANCE + (GameConfig.FINAL_BOMB_CHANCE - GameConfig.INITIAL_BOMB_CHANCE) * progress,
        };
      }
    }, 1000);

    let animationFrameId: number;
    const gameLoop = (timestamp: number) => {
      if (!lastSpawnTimeRef.current) {
        lastSpawnTimeRef.current = timestamp;
      }

      const shouldSpawn = timestamp - lastSpawnTimeRef.current > gameParamsRef.current.spawnRate;
      if (shouldSpawn) {
        lastSpawnTimeRef.current = timestamp;
      }

      setItems(prevItems => {
        let currentItems = [...prevItems];

        if (shouldSpawn) {
          const rand = Math.random();
          const { bombChance } = gameParamsRef.current;
          let newItem: NewItemProperties | null = null;

          if (rand < bombChance) {
            newItem = { type: 'bomb', speed: gameParamsRef.current.bombSpeed, imageUrl: '/bomb.png' };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE) {
            newItem = { type: 'powerup_pumpkin', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_PUMPKIN_URL };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE) {
            newItem = { type: 'magnet', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_MAGNET_URL };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE + GameConfig.POWER_UP_SHIELD_CHANCE) {
            newItem = { type: 'shield', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_SHIELD_URL };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE + GameConfig.POWER_UP_SHIELD_CHANCE + GameConfig.POWER_UP_TIME_CHANCE) {
            newItem = { type: 'time', speed: gameParamsRef.current.pictureSpeed };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE + GameConfig.POWER_UP_SHIELD_CHANCE + GameConfig.POWER_UP_TIME_CHANCE + GameConfig.POWER_UP_POINT_10_CHANCE) {
            newItem = { type: 'powerup_point_10', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_10_URL };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE + GameConfig.POWER_UP_SHIELD_CHANCE + GameConfig.POWER_UP_TIME_CHANCE + GameConfig.POWER_UP_POINT_10_CHANCE + GameConfig.POWER_UP_POINT_5_CHANCE) {
            newItem = { type: 'powerup_point_5', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_5_URL };
          } else if (rand < bombChance + GameConfig.POWER_UP_PUMPKIN_CHANCE + GameConfig.POWER_UP_MAGNET_CHANCE + GameConfig.POWER_UP_SHIELD_CHANCE + GameConfig.POWER_UP_TIME_CHANCE + GameConfig.POWER_UP_POINT_10_CHANCE + GameConfig.POWER_UP_POINT_5_CHANCE + GameConfig.POWER_UP_POINT_2_CHANCE) {
            newItem = { type: 'powerup_point_2', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_2_URL };
          } else {
            newItem = { type: 'picture', speed: gameParamsRef.current.pictureSpeed, imageUrl: Math.random() < 0.5 ? GameConfig.PICTURE_URL : GameConfig.CAP_PICTURE_URL };
          }

          if (newItem) {
            currentItems.push({
              id: nextItemId++,
              ...newItem,
              x: Math.random() * 90 + 5,
              y: -10,
              ref: createRef()
            });
          }
        }

        let processedItems = currentItems.map(item => {
          let newItem = { ...item, y: item.y + item.speed };
          const nonMagneticTypes: ItemType[] = ['bomb', 'shield', 'time'];
          if (isMagnetActiveRef.current && !nonMagneticTypes.includes(item.type) && avatarRef.current && gameAreaRef.current) {
            const gameRect = gameAreaRef.current.getBoundingClientRect();
            const avatarCenterX = avatarPositionRef.current.x;
            const avatarCenterY = avatarPositionRef.current.y;

            const itemRect = item.ref.current?.getBoundingClientRect();
            if (itemRect) {
              const itemXPixels = (item.x / 100) * gameRect.width;
              const itemCenterX = itemXPixels + (itemRect.width / 2);
              const itemCenterY = newItem.y + (itemRect.height / 2);

              const dx = avatarCenterX - itemCenterX;
              const dy = avatarCenterY - itemCenterY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance > 1) {
                const pullStrength = 5;
                const pullX = (dx / distance) * pullStrength;
                const pullY = (dy / distance) * pullStrength;

                const newXPixels = itemXPixels + pullX;
                newItem.x = (newXPixels / gameRect.width) * 100;
                newItem.y += pullY;
              }
            }
          }
          return newItem;
        }).filter(item => item.y < gameAreaDimensions.height + 60);


        if (avatarRef.current) {
          const avatarRect = avatarRef.current.getBoundingClientRect();
          const collectedItemIds = new Set<number>();
          let bombCollisionItem: Item | null = null;

          processedItems.forEach(item => {
            if (collectedItemIds.has(item.id) || !item.ref.current) return;

            if (isColliding(avatarRect, item.ref.current.getBoundingClientRect())) {
              collectedItemIds.add(item.id);

              if (item.type === 'bomb') {
                // Always report the collision to the server.
                gameEventsRef.current.push({ type: 'bomb_collision', timestamp: Date.now() });

                // Handle client-side effects only if not shielded or invincible.
                if (!isInvincibleRef.current && !isShieldActiveRef.current) {
                  bombCollisionItem = item;
                }
              } else {
                gameEventsRef.current.push({ type: 'collect', itemType: item.type, timestamp: Date.now() });
                if (coinSoundRef.current) {
                  coinSoundRef.current.currentTime = 0;
                  coinSoundRef.current.play().catch(e => console.error(e));
                }
                sdk.haptics.impactOccurred('soft');
                let points = 0;
                switch (item.type) {
                  case 'picture': points = GameConfig.BASE_PICTURE_VALUE; break;
                  case 'powerup_point_2': points = GameConfig.POWER_UP_POINT_2_VALUE; break;
                  case 'powerup_point_5': points = GameConfig.POWER_UP_POINT_5_VALUE; break;
                  case 'powerup_point_10': points = GameConfig.POWER_UP_POINT_10_VALUE; break;
                  case 'powerup_pumpkin': points = GameConfig.POWER_UP_PUMPKIN_VALUE; break;
                }
                if (item.type === 'magnet' && isPowerupActive) {
                  setIsMagnetActive(true);
                  if (magnetTimerRef.current) {
                    clearTimeout(magnetTimerRef.current);
                  }
                  magnetTimerRef.current = setTimeout(() => {
                    setIsMagnetActive(false);
                  }, GameConfig.MAGNET_DURATION * 1000);
                } else if (item.type === 'shield' && isPowerupActive) {
                  setIsShieldActive(true);
                  if (shieldTimerRef.current) {
                    clearTimeout(shieldTimerRef.current);
                  }
                  shieldTimerRef.current = setTimeout(() => {
                    setIsShieldActive(false);
                  }, GameConfig.SHIELD_DURATION * 1000);
                } else if (item.type === 'time' && isPowerupActive) {
                  const timeExtension = GameConfig.TIME_EXTENSION_SECONDS;
                  setTimeLeft(prev => prev + timeExtension);
                  gameEventsRef.current.push({ type: 'time_extend', duration: timeExtension, timestamp: Date.now() });
                } else {
                  const pointsToAdd = points
                  setScore(prev => {
                    const newScore = prev + points;
                   // console.log(`Item collected: Prev: ${prev}, Points: +${pointsToAdd}, New: ${newScore}`);
                    onScoreUpdate(newScore);
                    return newScore;
                  });
                  const newFloatingScore = { id: nextItemId++, points: pointsToAdd, x: item.x, y: item.y };
                  setFloatingScores(prev => [...prev, newFloatingScore]);
                }
              }
            }
          });

          if (bombCollisionItem) {
            if (!isProcessingBombHit.current) {
              isProcessingBombHit.current = true;

              // Note: A 'bomb_collision' event is already sent above.
              // This block now only handles the immediate client-side feedback.
              bombSoundRef.current?.play().catch(e => console.error(e));
              sdk.haptics.impactOccurred('heavy');
              setIsBombHit(true);
              setTimeout(() => setIsBombHit(false), 500);

              const { x, y } = bombCollisionItem;
              setScore(prev => {
                const newScore = prev <= 100 ? Math.floor(prev * 0.5) : Math.floor(prev * 0.4);
                const pointsDeducted = prev - newScore;
               // console.log(`Bomb hit: Prev: ${prev}, Points: -${pointsDeducted}, New: ${newScore}`);
                onScoreUpdate(newScore);
                if (pointsDeducted > 0) {
                  const newFloatingScore = { id: nextItemId++, points: -pointsDeducted, x, y };
                  setFloatingScores(prevScores => [...prevScores, newFloatingScore]);
                }
                return newScore;
              });

              setIsInvincible(true);
              setTimeout(() => {
                setIsInvincible(false);
                isProcessingBombHit.current = false;
              }, 3000);
              setItems([]);
            }
          }
          return processedItems.filter(item => !collectedItemIds.has(item.id));
        }
        return processedItems;
      });

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      clearInterval(timerInterval);
      cancelAnimationFrame(animationFrameId);
      if (magnetTimerRef.current) {
        clearTimeout(magnetTimerRef.current);
      }
      if (shieldTimerRef.current) {
        clearTimeout(shieldTimerRef.current);
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'won' && !isGameOverSoundPlayed) {
      const finalEvents = [...gameEventsRef.current]; // Create a copy to avoid stale refs
      onGameWin(finalEvents);
      gameOverSoundRef.current?.play().catch(e => console.error(e));
      setIsGameOverSoundPlayed(true);
    }
  }, [gameState, onGameWin, isGameOverSoundPlayed]);

  const handleFloatingScoreAnimationEnd = (id: number) => {
    setFloatingScores(prev => prev.filter(s => s.id !== id));
  };

  const renderItem = (item: Item) => {
    switch (item.type) {
      case 'bomb': return <img src="/bomb.png" alt="Bomb" className={gameStyles.itemImage} />;
      case 'picture': return <img src={item.imageUrl || GameConfig.PICTURE_URL} alt="Target" className={gameStyles.itemImage} />;
      case 'powerup_point_5': return <img src={GameConfig.POWER_UP_POINT_5_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_10': return <img src={GameConfig.POWER_UP_POINT_10_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_2': return <img src={GameConfig.POWER_UP_POINT_2_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_pumpkin': return <img src={GameConfig.POWER_UP_PUMPKIN_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'magnet': return <img src={GameConfig.POWER_UP_MAGNET_URL} alt="Magnet" className={gameStyles.itemImage} />;
      case 'shield': return <img src={GameConfig.POWER_UP_SHIELD_URL} alt="Shield" className={gameStyles.itemImage} />;
      case 'time': return <span className={gameStyles.itemEmoji}>⏰</span>;
      default: return null;
    }
  };

  return (
    <>
      {showNewHighScoreAnimation && <NewHighScoreAnimation onAnimationComplete={onAnimationComplete} width={gameAreaDimensions.width} height={gameAreaDimensions.height} />}
      <div className={gameStyles.gameStats}>
        <span>Score: <strong>{score.toLocaleString()}</strong></span>
        <span>Time: <strong>{timeLeft}s</strong></span>
        <span>Best: <strong>{highScore.toLocaleString()}</strong></span>
      </div>
      <div
        ref={gameAreaRef}
        className={`${gameStyles.gameArea} ${isBombHit ? gameStyles.bombHitEffect : ''} ${isGameWon ? gameStyles.gameOverBlur : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {gameState === 'idle' && (
          <>
            <div className={gameStyles.muteButtonContainer} onClick={(e) => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className={gameStyles.muteButton}>
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
            <div className={gameStyles.overlay}>
              {isStartingGame ? (
                <>
                  <div className={gameStyles.spinner}></div>
                  <p>Starting game...</p>
                  <DidYouKnow facts={BASE_BLOCKCHAIN_FACTS} />
                </>
              ) : (
                <>
                  <h2>blast ENBS</h2>
                  <p>
                    Drag your avatar to collect.<br />Avoid the Wormhole ENBs!
                  </p>
                  <button onClick={startGame} className={gameStyles.startButton}>
                    Click to Start
                  </button>
                  <div className={gameStyles.powerupsSection}>
                    <h3 className={gameStyles.powerupsTitle}>Power Ups</h3>
                    <div className={gameStyles.powerupsContainer}>
                      <button className={`${gameStyles.powerupButton} ${isPowerupActive ? gameStyles.active : ''}`} disabled={!isPowerupActive}>
                        {isPowerupActive ? <span className={gameStyles.powerupCheck}>✓</span> : <span className={gameStyles.powerupLock}>🔒</span>}
                        🧲
                      </button>
                      <button className={`${gameStyles.powerupButton} ${isPowerupActive ? gameStyles.active : ''}`} disabled={!isPowerupActive}>
                        {isPowerupActive ? <span className={gameStyles.powerupCheck}>✓</span> : <span className={gameStyles.powerupLock}>🔒</span>}
                        🛡️
                      </button>
                      <button className={`${gameStyles.powerupButton} ${isPowerupActive ? gameStyles.active : ''}`} disabled={!isPowerupActive}>
                        {isPowerupActive ? <span className={gameStyles.powerupCheck}>✓</span> : <span className={gameStyles.powerupLock}>🔒</span>}
                        ⏰
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {isGameWon && (
          <div className={gameStyles.overlay}>
            {isEndingGame ? (
              <>
                <div className={gameStyles.spinner}></div>
                <p>Saving score...</p>
                <DidYouKnow facts={BASE_BLOCKCHAIN_FACTS} />
              </>
            ) : (
              <>
                <h2>Game Over!</h2>
                <p>Your final score is:</p>
                <h4><span className={gameStyles.finalScore}>{(displayScore).toLocaleString()}</span></h4>
                <p>Best Score: {highScore.toLocaleString()}</p>
                <div className={gameStyles.overlayButtonContainer}>
                  <button onClick={handleTryAgain} className={`${gameStyles.overlayButton} ${gameStyles.tryAgainButtonRed}`}>
                    Play Again
                  </button>
                  <button onClick={handleShareScoreFrame} className={`${gameStyles.overlayButton} ${gameStyles.shareButton}`}>
                    Share Score
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <Avatar ref={avatarRef} position={avatarPosition} pfpUrl={avatarPfp} isInvincible={isInvincible} />
            {isMagnetActive && (
              <span style={{
                position: 'absolute',
                top: avatarPosition.y - 10,
                left: avatarPosition.x + 30,
                fontSize: '28px',
                zIndex: 100,
              }}>
                🧲
              </span>
            )}
            {isShieldActive && (
              <span style={{
                position: 'absolute',
                top: avatarPosition.y - 40,
                left: avatarPosition.x + 30,
                fontSize: '28px',
                zIndex: 100,
              }}>
                🛡️
              </span>
            )}
          </>
        )}

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
            style={{ top: `${score.y}px`, left: `${score.x}px` }}
            onAnimationEnd={() => handleFloatingScoreAnimationEnd(score.id)}
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