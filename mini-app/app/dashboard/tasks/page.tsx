'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import Loader from '@/app/components/Loader';
import VerifyLoader from '@/app/components/VerifyLoader';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import Toast from '@/app/components/Toast';

type Task = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  type: 'DEFAULT' | 'DAILY' | 'PARTNER';
  actionUrl?: string;
  checkKey: string;
  completed: boolean;
};

export type ToastState = {
  message: string;
  type: 'success' | 'error' | 'info';
} | null;

const DISABLED_TASKS: string[] = [];

type TaskItemProps = {
  task: Task;
  onVerify: (task: Task) => void;
  isChecking: boolean;
};

function TaskItem({ task, onVerify, isChecking }: TaskItemProps) {
  const router = useRouter();
  const isTaskDisabled = DISABLED_TASKS.includes(task.checkKey);
  const isButtonDisabled = task.completed || isChecking || isTaskDisabled;
  const hasActionUrl = !!task.actionUrl;

  const handleGoClick = async () => {
    if (task.actionUrl) {
      const url = task.actionUrl;

      // 1. Internal navigation
      if (url.startsWith('/')) {
        router.push(url);
        return;
      }

      // 2. Open other mini apps
      if (url.startsWith('https://farcaster.xyz/miniapps/')) {
        try {
          await sdk.actions.openMiniApp({ url });
        } catch (error) {
          console.error('Failed to open Mini App, falling back to openUrl:', error);
          await sdk.actions.openUrl({ url });
        }
        return;
      }

      // 3. View specific user profiles
      if (url.startsWith('https://farcaster.xyz/') && !url.includes('/~/channel/')) {
        let fid: number | null = null;
        if (url.includes('dxfareed')) fid = 849768;
        else if (url.includes('kokocodes')) fid = 738574;
        else if (url.includes('enb')) fid = 1089736;

        if (fid) {
          try {
            await sdk.actions.viewProfile({ fid });
            return;
          } catch (error) {
             console.error('Failed to open profile, falling back to openUrl:', error);
          }
        }
      }
      
      // 4. Fallback for all other URLs (channels, external sites, etc.)
      try {
        await sdk.actions.openUrl({ url });
      } catch (error) {
        console.error(`Failed to open URL with SDK: ${url}`, error);
        // Final fallback to window.open if sdk fails
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className={`${styles.taskItem} ${task.completed ? styles.completed : ''} ${isTaskDisabled ? styles.disabledTask : ''}`}>
      <div className={styles.taskInfo}>
        <h3 className={styles.taskTitle}>{task.title}</h3>
        <p className={styles.taskDescription}>
          {task.description}
        </p>
        <span className={styles.rewardAmount}> +{task.rewardPoints} Points</span>
      </div>
      <div className={styles.buttonContainer}>
        {hasActionUrl && !task.completed && (
          <button
            onClick={handleGoClick}
            className={`${styles.goButton} ${isTaskDisabled ? styles.disabledButton : ''}`}
            disabled={isTaskDisabled}
          >
            {task.checkKey === 'MINT_ENB_BOUNTY_NFT' ? 'Create' : <><ExternalLink size={16} /> Go</>}
          </button>
        )}
        <button
          onClick={() => onVerify(task)}
          disabled={isButtonDisabled}
          className={`${styles.verifyButton} ${task.type === 'DEFAULT' ? styles.defaultVerifyButton : ''} ${isTaskDisabled ? styles.disabledButton : ''}`}
        >
          {isChecking ? <VerifyLoader /> : (task.completed ? <Check size={16} /> : 'Verify')}
        </button>
      </div>
    </div>
  );
}

const fakeVerificationTasks = [
  'YOUTUBE_SUBSCRIBE_ENBMINIAPPS',
  'PARAGRAPH_SUBSCRIBE_ENB',
  'ZORA_FOLLOW_ENB',
  'LUMA_FOLLOW_ENB',
  'TELEGRAM_JOIN_ENB',
  'X_FOLLOW_ENB',
  'DISCORD_JOIN_ENB',
  'CREATORX_FOLLOW_FOUNDER',
];

export default function TasksPage() {
  const { fid } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'default'>('daily'); // <-- NEW: State for tabs

  const fetchTasks = async () => {
    if (!fid) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks?fid=${fid}`);
      if (!response.ok) {
        if (response.status === 500) throw new Error('Server timeout, please try again.');
        if (response.status === 404) throw new Error('User not found. Please register first.');
        if (response.status === 400) throw new Error('Invalid Farcaster ID.');
        throw new Error("Failed to fetch tasks");
      }
      setTasks(await response.json());
    } catch (error) {
      console.error(error);
      setToast({ message: (error as Error).message, type: 'error' });
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchTasks();
  }, [fid]);

  const handleVerifyTask = async (task: Task) => {
    sdk.haptics.impactOccurred('medium');
    setCheckingTaskId(task.id);

    if (fakeVerificationTasks.includes(task.checkKey)) {
      setTimeout(async () => {
        try {
          const response = await sdk.quickAuth.fetch('/api/tasks/force-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkKey: task.checkKey }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Completion failed');
          }

          sdk.haptics.notificationOccurred('success');
          setToast({ message: 'Task completed!', type: 'success' });
          await fetchTasks();
        } catch (error) {
          sdk.haptics.notificationOccurred('error');
          setToast({ message: `Error: ${(error as Error).message}`, type: 'error' });
        } finally {
          setCheckingTaskId(null);
        }
      }, 7000);
    } else {
      try {
        const response = await sdk.quickAuth.fetch('/api/tasks/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkKey: task.checkKey }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 418) {
            setToast({ message: errorData.message, type: 'info' });
            setCheckingTaskId(null);
            return;
          }
          if (response.status === 500) throw new Error('Server timeout, please try again.');
          if (response.status === 401) throw new Error('Authentication error. Please reconnect.');
          if (response.status === 404) throw new Error('User or task not found.');
          if (response.status === 429) throw new Error('Please wait before verifying again.');
          if (response.status === 400) {
            throw new Error(errorData.message || 'Verification condition not met.');
          }
          throw new Error(errorData.message || 'Verification failed');
        }

        sdk.haptics.notificationOccurred('success');
        setToast({ message: 'Task verified successfully!', type: 'success' });
        await fetchTasks();

      } catch (error) {
        sdk.haptics.notificationOccurred('error');
        setToast({ message: `Error: ${(error as Error).message}`, type: 'error' });
      } finally {
        setCheckingTaskId(null);
      }
    }
  };

  const dailyTasks = tasks.filter(t => t.type === 'DAILY');
  const defaultTasks = tasks.filter(t => t.type === 'DEFAULT');
  const partnerTasks = tasks.filter(t => t.type === 'PARTNER');

  const sortedDefaultTasks = [...defaultTasks].sort((a, b) => {
    if (a.checkKey === 'X_FOLLOW_ENB_APPS') return -1;
    if (b.checkKey === 'X_FOLLOW_ENB_APPS') return 1;
    return 0;
  });

  if (isLoading) return <Loader />;

  if (dailyTasks.length === 0 && defaultTasks.length === 0 && partnerTasks.length === 0) {
    return (
      <div className={styles.tasksContainer}>
        <h1 className={styles.title}>Tasks</h1>
        <div className={styles.noTasksMessage}>No tasks available right now</div>
      </div>
    );
  }

  return (
    <div className={styles.tasksContainer}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {/* <h1 className={styles.title}>Tasks</h1> */}

      {partnerTasks.length > 0 && (
        <section className={styles.taskSection}>
          <h2 className={`${styles.sectionTitle} ${styles.partnerTasksTitle}`}>Partner Tasks</h2>
          <div className={styles.taskList}>
            {partnerTasks.map(task => <TaskItem key={task.id} task={task} onVerify={handleVerifyTask} isChecking={checkingTaskId === task.id} />)}
          </div>
        </section>
      )}

      {/* NEW: Tab Switcher UI */}
      <div className={styles.taskSwitcher}>
        <button
          className={`${styles.tabButton} ${activeTab === 'daily' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily Tasks
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'default' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('default')}
        >
          Default Tasks
        </button>
      </div>

      {/* NEW: Conditionally Rendered Task Lists */}
      {activeTab === 'daily' && (
        <section className={styles.taskSection}>
          <div className={styles.taskList}>
            {dailyTasks.map(task => <TaskItem key={task.id} task={task} onVerify={handleVerifyTask} isChecking={checkingTaskId === task.id} />)}
          </div>
        </section>
      )}

      {activeTab === 'default' && (
        <section className={styles.taskSection}>
          <div className={styles.taskList}>
            {sortedDefaultTasks.map(task => <TaskItem key={task.id} task={task} onVerify={handleVerifyTask} isChecking={checkingTaskId === task.id} />)}
          </div>
        </section>
      )}
    </div>
  );
}