'use client';

import { useState } from 'react';
import styles from './page.module.css';
import { Check, Loader } from 'lucide-react';
import { 
  checkWarpcastFollow, 
  checkTelegramJoin, 
  checkGamePlayed, 
  checkTokenClaim, 
  checkLeaderboardVisit 
} from '@/lib/task-checker';
import { sdk } from '@farcaster/miniapp-sdk';


const initialDefaultTasks = [
   { id: 1, title: 'Follow dxFareed', description: 'Follow ENB Pop Developer.', reward: 1000, completed: false },
    { id: 2, title: 'Follow on Warpcast', description: 'Join our community for updates.', reward: 500, completed: true },
    { id: 3, title: 'Join the Telegram', description: 'Get real-time support and news.', reward: 500, completed: false },
];
const initialDailyTasks = [
  { id: 4, title: 'Play the Game', description: 'Play at least one round of ENB Pop.', reward: 100, completed: false },
  { id: 5, title: 'Claim Your Tokens', description: 'Make a successful on-chain claim.', reward: 150, completed: false },
  { id: 6, title: 'Visit the Leaderboard', description: 'Check out the competition.', reward: 50, completed: false },
];

function TaskItem({ task, onCheck, isChecking }) {
  const isButtonDisabled = task.completed || isChecking;
  
  return (
    <div className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}>
      <div className={styles.taskInfo}>
        <h3 className={styles.taskTitle}>{task.title}</h3>
        <p className={styles.taskDescription}>{task.description}</p>
      </div>
      <div className={styles.taskReward}>
        <p className={styles.rewardAmount}>+{task.reward} Points</p>
        <button onClick={() => onCheck(task.id)} disabled={isButtonDisabled} className={styles.taskButton}>
          {isChecking ? <Loader size={16} className={styles.spinner} /> : (task.completed ? <Check size={16} /> : 'Go')}
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [defaultTasks, setDefaultTasks] = useState(initialDefaultTasks);
  const [dailyTasks, setDailyTasks] = useState(initialDailyTasks);
  const [checkingTaskId, setCheckingTaskId] = useState<number | null>(null);

  const handleTaskCheck = async (taskId: number) => {
    sdk.haptics.impactOccurred('light');
    setCheckingTaskId(taskId);
    try {
      let result = false;
      switch (taskId) {
        case 1: result = await checkWarpcastFollow(); break;
        case 2: result = await checkTelegramJoin(); break;
        case 3: result = await checkGamePlayed(); break;
        case 4: result = await checkTokenClaim(); break;
        case 5: result = await checkLeaderboardVisit(); break;
        default: throw new Error("Unknown task");
      }
      
      if (result) {
        sdk.haptics.notificationOccurred('success');
        setDefaultTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, completed: true } : t));
        setDailyTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, completed: true } : t));
      }
    } catch (error) {
        sdk.haptics.notificationOccurred('error');
    } finally {
      setCheckingTaskId(null);
    }
  };

  return (
    <div className={styles.tasksContainer}>
      <h1 className={styles.title}>Tasks</h1>
      <section className={styles.taskSection}>
        <h2 className={styles.sectionTitle}>Daily Tasks</h2>
        <div className={styles.taskList}>
          {dailyTasks.map(task => 
            <TaskItem key={task.id} task={task} onCheck={handleTaskCheck} isChecking={checkingTaskId === task.id} />
          )}
        </div>
      </section>
      <section className={styles.taskSection}>
        <h2 className={styles.sectionTitle}>Default Tasks</h2>
        <div className={styles.taskList}>
          {defaultTasks.map(task => 
            <TaskItem key={task.id} task={task} onCheck={handleTaskCheck} isChecking={checkingTaskId === task.id} />
          )}
        </div>
      </section>
    </div>
  );
}