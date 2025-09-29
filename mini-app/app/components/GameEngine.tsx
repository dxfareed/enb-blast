import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import gameStyles from '@/app/dashboard/game/game.module.css';

const GAME_DURATION = 25;
const INITIAL_SPAWN_RATE = 350;
const FINAL_SPAWN_RATE = 450;
const INITIAL_BOMB_SPEED = 0.6;
const FINAL_BOMB_SPEED = 0.9;
const PICTURE_SPEED_MULTIPLIER = 1.32;
const BOMB_CHANCE = 0.35;
const PICTURE_URL = "/Enb_000.png";
const POWER_UP_POINT_5_URL = "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/8fbbe5e2-0c53-48b8-c5f1-4a791b76ce00/rectcrop3";
const POWER_UP_POINT_5_VALUE = 5;
const POWER_UP_POINT_5_CHANCE = 0.01;

const POWER_UP_POINT_10_URL = "https://pbs.twimg.com/profile_images/1945608199500910592/rnk6ixxH_400x400.jpg";
const POWER_UP_POINT_10_VALUE = 10;
const POWER_UP_POINT_10_CHANCE = 0.005;

const POWER_UP_POINT_2_URL = "https://pbs.twimg.com/profile_images/1945283028441341952/KoUAOCOk_400x400.jpg";
const POWER_UP_POINT_2_VALUE = 2;
const POWER_UP_POINT_2_CHANCE = 0.03;

type GameEngineProps = { onGameWin: (finalScore: number) => void; displayScore: number; };
export type GameEngineHandle = { resetGame: () => void; };

type ItemType = 
  | 'bomb' 
  | 'picture' 
  | 'powerup_point_2' 
  | 'powerup_point_5' 
  | 'powerup_point_10';

type Item = {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  speed: number;
  isPopped?: boolean; // Optional property, as it's added on click
  points?: number;    // Optional property, as it's added on click
};

type GameState = 'idle' | 'playing' | 'won' | 'lost';

let nextItemId = 0;

const GameEngine = forwardRef<GameEngineHandle, GameEngineProps>(({ onGameWin, displayScore }, ref) => {
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<GameState>('idle');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [floatingScores, setFloatingScores] = useState<{ id: number; points: number; x: number; y: number; }[]>([]);

  const [currentBombSpeed, setCurrentBombSpeed] = useState(INITIAL_BOMB_SPEED);
  const [currentSpawnRate, setCurrentSpawnRate] = useState(INITIAL_SPAWN_RATE);
  const [isBombHit, setIsBombHit] = useState(false);
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const resetGame = useCallback(() => {
    setItems([]); setScore(0); setTimeLeft(GAME_DURATION);
    setCurrentBombSpeed(INITIAL_BOMB_SPEED);
    setCurrentSpawnRate(INITIAL_SPAWN_RATE);
    setGameState('idle');
  }, []);

  useImperativeHandle(ref, () => ({
    resetGame,
  }));

   const handleItemClick = (clickedItem: Item) => {
    if (gameState !== 'playing' || clickedItem.isPopped) return;

    if (clickedItem.type === 'bomb') {
      sdk.haptics.impactOccurred('heavy');
      setScore(0);
      setItems([]);
      setIsBombHit(true);
      setTimeout(() => setIsBombHit(false), 2000);
    } else {
      sdk.haptics.impactOccurred('soft');
      let points = 0;
      switch (clickedItem.type) {
        case 'powerup_point_10':
          points = POWER_UP_POINT_10_VALUE;
          break;
        case 'powerup_point_5':
          points = POWER_UP_POINT_5_VALUE;
          break;
        case 'powerup_point_2':
          points = POWER_UP_POINT_2_VALUE;
          break;
        case 'picture':
          points = 1;
          break;
      }
      setScore(prev => prev + points);
      
      const newFloatingScore = { id: nextItemId++, points, x: clickedItem.x, y: clickedItem.y };
      setFloatingScores(prev => [...prev, newFloatingScore]);

      setItems(prev => prev.map(item => 
        item.id === clickedItem.id ? { ...item, isPopped: true, points } : item
      ));

      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== clickedItem.id));
        setFloatingScores(prev => prev.filter(score => score.id !== newFloatingScore.id));
      }, 500);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timerInterval);
          setGameState('won');
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    const animationInterval = setInterval(() => {
      setItems(prev => prev.map(item => ({ ...item, y: item.y + item.speed })).filter(item => item.y < 110));
    }, 1000 / 60);

    const spawnInterval = setInterval(() => {
      setItems(prevItems => {
        const newItems: Item[] = [];
        const rand = Math.random();
        let specialItem: Item | null = null;

        if (rand < BOMB_CHANCE) {
          specialItem = { id: nextItemId++, type: 'bomb', x: Math.random() * 90 + 5, y: -10, speed: currentBombSpeed };
        } else if (rand < BOMB_CHANCE + POWER_UP_POINT_10_CHANCE) {
          specialItem = { id: nextItemId++, type: 'powerup_point_10', x: Math.random() * 90 + 5, y: -10, speed: currentBombSpeed * PICTURE_SPEED_MULTIPLIER };
        } else if (rand < BOMB_CHANCE + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE) {
          specialItem = { id: nextItemId++, type: 'powerup_point_5', x: Math.random() * 90 + 5, y: -10, speed: currentBombSpeed * PICTURE_SPEED_MULTIPLIER };
        } else if (rand < BOMB_CHANCE + POWER_UP_POINT_10_CHANCE + POWER_UP_POINT_5_CHANCE + POWER_UP_POINT_2_CHANCE) {
          specialItem = { id: nextItemId++, type: 'powerup_point_2', x: Math.random() * 90 + 5, y: -10, speed: currentBombSpeed * PICTURE_SPEED_MULTIPLIER };
        }
        
        if (specialItem) {
          newItems.push(specialItem);
        }

        const pictureCount = 1 + Math.floor(Math.random() * 1);
        for (let i = 0; i < pictureCount; i++) {
          const speed = currentBombSpeed * PICTURE_SPEED_MULTIPLIER;
          newItems.push({ id: nextItemId++, type: 'picture', x: Math.random() * 90 + 5, y: -10, speed: speed });
        }
        
        return [...prevItems, ...newItems];
      });
    }, currentSpawnRate);

    const difficultyInterval = setInterval(() => {
      setTimeLeft(prevTimeLeft => {
        const progress = (GAME_DURATION - prevTimeLeft) / GAME_DURATION;
        const newBombSpeed = INITIAL_BOMB_SPEED + (FINAL_BOMB_SPEED - INITIAL_BOMB_SPEED) * progress;
        setCurrentBombSpeed(newBombSpeed);
        setCurrentSpawnRate(INITIAL_SPAWN_RATE - (INITIAL_SPAWN_RATE - FINAL_SPAWN_RATE) * progress);
        setItems(prev => prev.map(item => ({ ...item, speed: item.type === 'bomb' ? newBombSpeed : newBombSpeed * PICTURE_SPEED_MULTIPLIER })));
        return prevTimeLeft;
      });
    }, 2000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(animationInterval);
      clearInterval(spawnInterval);
      clearInterval(difficultyInterval);
    };
  }, [gameState, onGameWin]);

  useEffect(() => {
    if (gameState === 'won') {
      onGameWin(scoreRef.current);
    }
  }, [gameState, onGameWin, scoreRef]);

  const startGame = () => setGameState('playing');

  const renderItem = (item: Item) => {
    switch (item.type) {
      case 'bomb':
        return <span style={{fontSize: '36px'}}>💣</span>;
      case 'picture':
        return <img src={PICTURE_URL} alt="Target" className={gameStyles.itemImage} />;
      case 'powerup_point_5':
        return <img src={POWER_UP_POINT_5_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_10':
        return <img src={POWER_UP_POINT_10_URL} alt="Power Up" className={gameStyles.itemImage} />;
      case 'powerup_point_2':
        return <img src={POWER_UP_POINT_2_URL} alt="Power Up" className={gameStyles.itemImage} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className={gameStyles.gameStats}>
        <span onClick={() => { setScore(0); setItems([]); }} style={{ cursor: 'pointer' }}>Score: <strong>{score}</strong></span>
        <span>Time Left: <strong>{timeLeft}s</strong></span>
      </div>
      <div className={`${gameStyles.gameArea} ${isBombHit ? gameStyles.bombHitEffect : ''}`} onClick={gameState === 'idle' ? startGame : undefined}>
        {gameState === 'idle' && <div className={gameStyles.overlay}><h2>ENB Pop</h2><p>Survive for 25 seconds.<br/>Avoid the bombs!<br/><br/>Click to Start</p></div>}
        {gameState === 'lost' && <div className={gameStyles.overlay} onClick={resetGame}><h2>Game Over!</h2><p><RotateCcw size={48} /></p></div>}
        {gameState === 'won' && <div className={gameStyles.overlay}><h2>Game Over!</h2><p>Your final score: {displayScore}<br/>Claim is unlocked below.</p></div>}
        
         {items.map(item => (
          <div 
            key={item.id}
            className={`${gameStyles.item} ${item.isPopped ? gameStyles.popped : ''}`} 
            style={{ top: `${item.y}%`, left: `${item.x}%` }} 
            onPointerDown={() => handleItemClick(item)}
          >
            {renderItem(item)}
          </div>
        ))}
        {floatingScores.map(score => (
          <div
            key={score.id}
            className={gameStyles.floatingScore}
            style={{ top: `${score.y}%`, left: `${score.x}%` }}
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