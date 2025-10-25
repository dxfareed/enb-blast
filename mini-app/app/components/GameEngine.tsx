'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, createRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import gameStyles from '@/app/dashboard/game/game.module.css';
import Avatar from './Avatar';
import { useUser } from '@/app/context/UserContext';
import DidYouKnow from './DidYouKnow';
import { BASE_BLOCKCHAIN_FACTS, INFLYNCE_FACTS } from '@/app/utils/constants';
import NewHighScoreAnimation from './NewHighScoreAnimation';
import * as GameConfig from '@/lib/gameConfig';

const allFacts = [...BASE_BLOCKCHAIN_FACTS, ...INFLYNCE_FACTS];

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

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { POWERUP_CONTRACT_ADDRESS, POWERUP_CONTRACT_ABI, MINT_POWERUP_NFT_CONTRACT_ADDRESS, MINT_POWERUP_NFT_CONTRACT_ABI } from '@/app/utils/constants';
import PowerUpCountdown from './PowerUpCountdown';
import Loader from './Loader';
import Toast from './Toast';
import GlobalLoader from './GlobalLoader';

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
  const [floatingScores, setFloatingScores] = useState<{ id: number; text: string; x: number; y: number; isTime?: boolean; isPenalty?: boolean; }[]>([]);
  const [isBombHit, setIsBombHit] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ x: 150, y: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isGameOverSoundPlayed, setIsGameOverSoundPlayed] = useState(false);
  const [isInvincible, setIsInvincible] = useState(false);
  const [isMagnetActive, setIsMagnetActive] = useState(false);
  const [magnetTimeLeft, setMagnetTimeLeft] = useState(0);
  const magnetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isShieldActive, setIsShieldActive] = useState(false);
  const [shieldTimeLeft, setShieldTimeLeft] = useState(0);
  const shieldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBombHit = useRef(false);
  const gameStartTimeRef = useRef<number | null>(null);
  const [showNewHighScoreAnimation, setShowNewHighScoreAnimation] = useState(false);
  const [gameAreaDimensions, setGameAreaDimensions] = useState({ width: 0, height: 0 });
  const [isActivating, setIsActivating] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [activationTxHash, setActivationTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  const { address } = useAccount();
  const { data: hash, writeContract } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

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

  const { userProfile, refetchUserProfile } = useUser();
  const avatarPfp = userProfile?.pfpUrl || GameConfig.PICTURE_URL;
  const [isPowerupActive, setIsPowerupActive] = useState(false);

  const handleMintPowerUp = async () => {
    if (!userProfile || !address) {
      setToast({ message: 'User not connected', type: 'error' });
      return;
    }

    setIsMinting(true);
    setActivationError(null);

    try {
      let response;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        response = await sdk.quickAuth.fetch('/api/powerup/mint-signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: userProfile.fid }),
        });

        if (response.status !== 500) {
          break; // Exit loop on success or non-500 error
        }

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!response) {
        throw new Error('Failed to get a response from the server.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed with status ' + response.status }));
        throw new Error(errorData.message || 'Failed to get mint signature.');
      }

      const { signature, nonce, mintPrice } = await response.json();
      console.log("Mint price is ", mintPrice);
      console.log("Signature is ", signature);
      console.log("Nonce is ", nonce);

      writeContract({
        address: MINT_POWERUP_NFT_CONTRACT_ADDRESS,
        abi: MINT_POWERUP_NFT_CONTRACT_ABI,
        functionName: 'mintPowerUp',
        args: [BigInt(userProfile.fid), BigInt(nonce), signature],
        value: BigInt(mintPrice),
      });
    } catch (error) {
      //@ts-ignore
      console.error('Minting error:', error.message);
      setActivationError((error as Error).message);
      setIsMinting(false);
    }
  };

  const handleActivatePowerUp = async () => {
    if (!userProfile || !address) {
      setToast({ message: 'User not connected', type: 'error' });
      return;
    }

    setIsActivating(true);
    setActivationError(null);

    try {
      let response;
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        response = await sdk.quickAuth.fetch('/api/powerup/signature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fid: userProfile.fid }),
        });

        if (response.status !== 500) {
          break; // Exit loop on success or non-500 error
        }

        if (i < maxRetries - 1) { // Don't wait after the last attempt
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!response) {
        throw new Error('Failed to get a response from the server.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Request failed with status ' + response?.status }));
        throw new Error(errorData.message || 'Failed to get activation signature.');
      }

      const { signature, nonce, depositAmount } = await response.json();

      writeContract({
        address: POWERUP_CONTRACT_ADDRESS,
        abi: POWERUP_CONTRACT_ABI,
        functionName: 'activatePowerUp',
        args: [BigInt(userProfile.fid), BigInt(nonce), signature],
        value: BigInt(depositAmount),
      });
    } catch (error) {
      console.error('Activation error:', error);
      setActivationError((error as Error).message);
      setIsActivating(false);
    }
  };

  useEffect(() => {
    if (isConfirming) {
      setToast({ message: 'Processings...', type: 'info' });
    } else if (isConfirmed) {
      setToast({ message: 'successful! Reloading...', type: 'success' });
      refetchUserProfile();
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      setIsActivating(false);
      setIsMinting(false);
    }
  }, [isConfirming, isConfirmed, refetchUserProfile]);

  useEffect(() => {
    if (userProfile?.powerupExpiration) {
      const expirationDate = new Date(userProfile.powerupExpiration);
      const now = new Date();

      if (expirationDate > now) {
        setIsPowerupActive(true);
        const timeUntilExpiration = expirationDate.getTime() - now.getTime();
        
        const timer = setTimeout(() => {
          setIsPowerupActive(false);
          setToast({ message: 'Your Power-Up has expired!', type: 'info' });
          refetchUserProfile();
        }, timeUntilExpiration);

        return () => clearTimeout(timer);
      } else {
        setIsPowerupActive(false);
      }
    } else {
      setIsPowerupActive(false);
    }
  }, [userProfile, refetchUserProfile]);

  useEffect(() => {
    if (gameAreaRef.current) {
      setGameAreaDimensions({
        width: gameAreaRef.current.offsetWidth,
        height: gameAreaRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    if (isGameWon && displayScore > highScore) {
      setShowNewHighScoreAnimation(true);
      const timer = setTimeout(() => {
        setShowNewHighScoreAnimation(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isGameWon, displayScore, highScore]);

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
    setMagnetTimeLeft(0);
    if (magnetTimerRef.current) {
      clearInterval(magnetTimerRef.current);
    }
    setIsShieldActive(false);
    setShieldTimeLeft(0);
    if (shieldTimerRef.current) {
      clearInterval(shieldTimerRef.current);
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

          // These chances are used in both scenarios
          const powerupMultiplier = isPowerupActive ? 1.7 : 0.2;
          const powerUpPumpkinChance = GameConfig.POWER_UP_PUMPKIN_CHANCE * powerupMultiplier;
          const powerUpPoint10Chance = GameConfig.POWER_UP_POINT_10_CHANCE * powerupMultiplier;
          const powerUpPoint5Chance = GameConfig.POWER_UP_POINT_5_CHANCE * powerupMultiplier;
          const powerUpPoint2Chance = GameConfig.POWER_UP_POINT_2_CHANCE * powerupMultiplier;

          if (isPowerupActive) {
            // --- Logic for ACTIVE power-up users (includes magnet, shield, time) ---
            const p_bomb = bombChance;
            const p_pumpkin = p_bomb + powerUpPumpkinChance;
            const p_magnet = p_pumpkin + GameConfig.POWER_UP_MAGNET_CHANCE;
            const p_shield = p_magnet + GameConfig.POWER_UP_SHIELD_CHANCE;
            const p_time = p_shield + GameConfig.POWER_UP_TIME_CHANCE;
            const p_10 = p_time + powerUpPoint10Chance;
            const p_5 = p_10 + powerUpPoint5Chance;
            const p_2 = p_5 + powerUpPoint2Chance;

            if (rand < p_bomb) {
              newItem = { type: 'bomb', speed: gameParamsRef.current.bombSpeed, imageUrl: '/bomb.png' };
            } else if (rand < p_pumpkin) {
              newItem = { type: 'powerup_pumpkin', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_PUMPKIN_URL };
            } else if (rand < p_magnet) {
              newItem = { type: 'magnet', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_MAGNET_URL };
            } else if (rand < p_shield) {
              newItem = { type: 'shield', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_SHIELD_URL };
            } else if (rand < p_time) {
              newItem = { type: 'time', speed: gameParamsRef.current.pictureSpeed };
            } else if (rand < p_10) {
              newItem = { type: 'powerup_point_10', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_10_URL };
            } else if (rand < p_5) {
              newItem = { type: 'powerup_point_5', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_5_URL };
            } else if (rand < p_2) {
              newItem = { type: 'powerup_point_2', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_2_URL };
            } else {
              newItem = { type: 'picture', speed: gameParamsRef.current.pictureSpeed, imageUrl: Math.random() < 0.5 ? GameConfig.PICTURE_URL : GameConfig.CAP_PICTURE_URL };
            }
          } else {
            // --- Logic for INACTIVE power-up users (excludes magnet, shield, time) ---
            const p_bomb = bombChance;
            const p_pumpkin = p_bomb + powerUpPumpkinChance;
            // Note: We skip magnet, shield, and time in the probability stack
            const p_10 = p_pumpkin + powerUpPoint10Chance;
            const p_5 = p_10 + powerUpPoint5Chance;
            const p_2 = p_5 + powerUpPoint2Chance;

            if (rand < p_bomb) {
              newItem = { type: 'bomb', speed: gameParamsRef.current.bombSpeed, imageUrl: '/bomb.png' };
            } else if (rand < p_pumpkin) {
              newItem = { type: 'powerup_pumpkin', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_PUMPKIN_URL };
            } else if (rand < p_10) {
              newItem = { type: 'powerup_point_10', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_10_URL };
            } else if (rand < p_5) {
              newItem = { type: 'powerup_point_5', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_5_URL };
            } else if (rand < p_2) {
              newItem = { type: 'powerup_point_2', speed: gameParamsRef.current.pictureSpeed, imageUrl: GameConfig.POWER_UP_POINT_2_URL };
            } else {
              newItem = { type: 'picture', speed: gameParamsRef.current.pictureSpeed, imageUrl: Math.random() < 0.5 ? GameConfig.PICTURE_URL : GameConfig.CAP_PICTURE_URL };
            }
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
            const avatarRect = avatarRef.current.getBoundingClientRect();
            const avatarCenterX = avatarPositionRef.current.x; // This is already centered from pointer
            const avatarCenterY = avatarPositionRef.current.y;

            // Use a fixed size for items to avoid unreliable getBoundingClientRect on off-screen elements
            const ITEM_DIMENSIONS = 40; // Approximate item size in pixels
            const itemXPixels = (item.x / 100) * gameRect.width;
            const itemCenterX = itemXPixels + (ITEM_DIMENSIONS / 2);
            const itemCenterY = newItem.y + (ITEM_DIMENSIONS / 2);

            const dx = avatarCenterX - itemCenterX;
            const dy = avatarCenterY - itemCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Magnet attraction logic
            if (distance > 1) { // Check distance to prevent jittering
              const pullStrength = 5; // How strongly the magnet pulls
              const pullX = (dx / distance) * pullStrength;
              const pullY = (dy / distance) * pullStrength;

              const newXPixels = itemXPixels + pullX;
              newItem.x = (newXPixels / gameRect.width) * 100; // Convert back to percentage
              newItem.y += pullY;
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
                  if (magnetTimerRef.current) clearInterval(magnetTimerRef.current);
                  setIsMagnetActive(true);
                  setMagnetTimeLeft(GameConfig.MAGNET_DURATION);
                  magnetTimerRef.current = setInterval(() => {
                    setMagnetTimeLeft(prev => {
                      if (prev <= 1) {
                        clearInterval(magnetTimerRef.current!);
                        setIsMagnetActive(false);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                } else if (item.type === 'shield' && isPowerupActive) {
                  if (shieldTimerRef.current) clearInterval(shieldTimerRef.current);
                  setIsShieldActive(true);
                  setShieldTimeLeft(GameConfig.SHIELD_DURATION);
                  shieldTimerRef.current = setInterval(() => {
                    setShieldTimeLeft(prev => {
                      if (prev <= 1) {
                        clearInterval(shieldTimerRef.current!);
                        setIsShieldActive(false);
                        return 0;
                      }
                      return prev - 1;
                    });
                  }, 1000);
                } else if (item.type === 'time' && isPowerupActive) {
                  const timeExtension = GameConfig.TIME_EXTENSION_SECONDS;
                  setTimeLeft(prev => prev + timeExtension);
                  gameEventsRef.current.push({ type: 'time_extend', duration: timeExtension, timestamp: Date.now() });
                  const newFloatingText = { id: nextItemId++, text: `+${timeExtension}s`, x: item.x, y: item.y, isTime: true };
                  setFloatingScores(prev => [...prev, newFloatingText]);
                } else {
                  const pointsToAdd = points
                  setScore(prev => {
                    const newScore = prev + points;
                    // console.log(`Item collected: Prev: ${prev}, Points: +${pointsToAdd}, New: ${newScore}`);
                    onScoreUpdate(newScore);
                    return newScore;
                  });
                  const newFloatingScore = { id: nextItemId++, text: `+${pointsToAdd}`, x: item.x, y: item.y };
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
                  const newFloatingScore = { id: nextItemId++, text: `-${pointsDeducted}`, x, y, isPenalty: true };
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

  if (isReloading) {
    return <GlobalLoader message="Power-up expired, reloading..." />;
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
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
                  <DidYouKnow facts={allFacts} />
                </>
              ) : (
                <>
                  <h2>blast ENBS</h2>
                  <p>
                    Drag your avatar to collect.<br />Avoid the Green Wormhole ENBs!
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
                    {isPowerupActive && userProfile?.powerupExpiration ? (
                      <PowerUpCountdown expiration={userProfile.powerupExpiration} />
                    ) : (
                      <button onClick={handleMintPowerUp} className={gameStyles.activateButton} disabled={isMinting || isConfirming} style={{ marginTop: '10px' }}>
                        {isMinting || isConfirming ? (
                          <>
                            <Loader />
                            Minting...
                          </>
                        ) : (
                          'Mint PowerUps'
                        )}
                      </button>
                    )}
                    {/*                       <button onClick={handleActivatePowerUp} className={gameStyles.activateButton} disabled={isActivating || isConfirming}>
                        {isActivating || isConfirming ? (
                          <>
                            <Loader />
                            Activating...
                          </>
                        ) : (
                          'Activate Power Ups'
                        )}
                      </button> */}
                    {activationError && <p className={gameStyles.errorMessage}>{activationError}</p>}
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
                <DidYouKnow facts={allFacts} />
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
            <div className={gameStyles.powerupStatusContainer}>
              {isMagnetActive && magnetTimeLeft > 0 && (
                <div className={gameStyles.powerupStatus}>
                  <span>🧲</span>
                  <span>{magnetTimeLeft}s</span>
                </div>
              )}
              {isShieldActive && shieldTimeLeft > 0 && (
                <div className={gameStyles.powerupStatus}>
                  <span>🛡️</span>
                  <span>{shieldTimeLeft}s</span>
                </div>
              )}
            </div>
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
        {floatingScores.map(fscore => (
          <div
            key={fscore.id}
            className={`${gameStyles.floatingScore} ${fscore.isPenalty ? gameStyles.floatingScoreNegative : ''} ${fscore.isTime ? gameStyles.floatingScoreTime : ''}`}
            style={{ top: `${fscore.y}px`, left: `${fscore.x}px` }}
            onAnimationEnd={() => handleFloatingScoreAnimationEnd(fscore.id)}
          >
            {fscore.text}
          </div>
        ))}
      </div>
    </>
  );
});

GameEngine.displayName = 'GameEngine';
export default GameEngine;