import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import gameStyles from '@/app/dashboard/game/game.module.css';

const GAME_DURATION = 30;
const INITIAL_SPAWN_RATE = 800;
const FINAL_SPAWN_RATE = 300;
const INITIAL_BOMB_SPEED = 0.5;
const FINAL_BOMB_SPEED = 0.8;
const PICTURE_SPEED_MULTIPLIER = 1.2;
const BOMB_CHANCE = 0.25;
const PICTURE_URL = "/Enb_000.png";

type Item = { id: number; type: 'picture' | 'bomb'; x: number; y: number; speed: number; isPopped?: boolean; };
type GameState = 'idle' | 'playing' | 'won' | 'lost';
type GameEngineProps = { onGameWin: (finalScore: number) => void; };
export type GameEngineHandle = { resetGame: () => void; };

let nextItemId = 0;

const GameEngine = forwardRef<GameEngineHandle, GameEngineProps>(({ onGameWin }, ref) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);

  const [currentBombSpeed, setCurrentBombSpeed] = useState(INITIAL_BOMB_SPEED);
  const [currentSpawnRate, setCurrentSpawnRate] = useState(INITIAL_SPAWN_RATE);

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
      setGameState('lost');
    } else {
      setScore(prev => prev + 1);
      
      setItems(prev => prev.map(item => 
        item.id === clickedItem.id ? { ...item, isPopped: true } : item
      ));

      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== clickedItem.id));
      }, 200);
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timerInterval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          setGameState('won');
          onGameWin(score);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    const animationInterval = setInterval(() => {
      setItems(prev => prev.map(item => ({ ...item, y: item.y + item.speed })).filter(item => item.y < 110));
    }, 1000 / 60);

    const spawnInterval = setInterval(() => {
      const isBomb = Math.random() < BOMB_CHANCE;
      const speed = isBomb ? currentBombSpeed : currentBombSpeed * PICTURE_SPEED_MULTIPLIER;
      const newItem: Item = { id: nextItemId++, type: isBomb ? 'bomb' : 'picture', x: Math.random() * 90 + 5, y: -10, speed: speed };
      setItems(prev => [...prev, newItem]);
    }, currentSpawnRate);

    const difficultyInterval = setInterval(() => {
      const progress = (GAME_DURATION - timeLeft) / GAME_DURATION;
      const newBombSpeed = INITIAL_BOMB_SPEED + (FINAL_BOMB_SPEED - INITIAL_BOMB_SPEED) * progress;
      setCurrentBombSpeed(newBombSpeed);
      setCurrentSpawnRate(INITIAL_SPAWN_RATE - (INITIAL_SPAWN_RATE - FINAL_SPAWN_RATE) * progress);
      setItems(prev => prev.map(item => ({ ...item, speed: item.type === 'bomb' ? newBombSpeed : newBombSpeed * PICTURE_SPEED_MULTIPLIER })));
    }, 2000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(animationInterval);
      clearInterval(spawnInterval);
      clearInterval(difficultyInterval);
    };
  }, [gameState, timeLeft, currentBombSpeed, currentSpawnRate, onGameWin, score]);

  const startGame = () => setGameState('playing');

  return (
    <>
      <div className={gameStyles.gameStats}>
        <span>Score: <strong>{score}</strong></span>
        <span>Time Left: <strong>{timeLeft}s</strong></span>
      </div>
      <div className={gameStyles.gameArea} onClick={gameState === 'idle' ? startGame : undefined}>
        {gameState === 'idle' && <div className={gameStyles.overlay}><h2>ENB Pop</h2><p>Survive for 30 seconds.<br/>Avoid the bombs!<br/><br/>Click to Start</p></div>}
        {gameState === 'lost' && <div className={gameStyles.overlay} onClick={resetGame}><h2>Game Over!</h2><p>You hit a bomb.<br/>Click to try again.</p></div>}
        {gameState === 'won' && <div className={gameStyles.overlay}><h2>Game Over!</h2><p>Your final score: {score}<br/>Claim is unlocked below.</p></div>}
        
         {items.map(item => (
          <div 
            key={item.id}
            className={`${gameStyles.item} ${item.isPopped ? gameStyles.popped : ''}`} 
            style={{ top: `${item.y}%`, left: `${item.x}%` }} 
            onClick={() => handleItemClick(item)}
          >
            {item.type === 'bomb' ? <span style={{fontSize: '36px'}}>💣</span> : <img src={PICTURE_URL} alt="Target" className={gameStyles.itemImage} />}
          </div>
        ))}
      </div>
    </>
  );
});

GameEngine.displayName = 'GameEngine';
export default GameEngine;