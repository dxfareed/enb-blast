'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/app/context/UserContext';
import styles from './page.module.css';
import { Check, Loader, ExternalLink } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import Toast from '@/app/components/Toast';

type Task = {
  id: string;
  title: string;
  description: string;
  rewardPoints: number;
  type: 'DEFAULT' | 'DAILY';
  actionUrl?: string;
  checkKey: string;
  completed: boolean;
};

type ToastState = {
  message: string;
  type: 'success' | 'error';
} | null;

function TaskItem({ task, onVerify, isChecking }) {
  const isButtonDisabled = task.completed || isChecking;
  const hasActionUrl = !!task.actionUrl;

  return (
    <div className={`${styles.taskItem} ${task.completed ? styles.completed : ''}`}>
      <div className={styles.taskInfo}>
        <h3 className={styles.taskTitle}>{task.title}</h3>
        <p className={styles.taskDescription}>
          {task.description}
        </p>
        <span className={styles.rewardAmount}> +{task.rewardPoints} Points</span>
      </div>
      <div className={styles.buttonContainer}>
        {hasActionUrl && !task.completed && (
          <button onClick={() => window.location.href = task.actionUrl} className={styles.goButton}>
            <ExternalLink size={16} /> Go
          </button>
        )}
        <button onClick={() => onVerify(task)} disabled={isButtonDisabled} className={`${styles.verifyButton} ${task.type === 'DEFAULT' ? styles.defaultVerifyButton : ''}`}>
          {isChecking ? <Loader size={16} className={styles.spinner} /> : (task.completed ? <Check size={16} /> : 'Verify')}
        </button>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { fid } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingTaskId, setCheckingTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const fetchTasks = async () => {
    if (!fid) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks?fid=${fid}`);
      if (!response.ok) throw new Error("Failed to fetch tasks");
      setTasks(await response.json());
    } catch (error) { console.error(error); } 
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchTasks();
  }, [fid]);

  const handleVerifyTask = async (task: Task) => {
    sdk.haptics.impactOccurred('medium');
    setCheckingTaskId(task.id);
    try {
      const response = await fetch('/api/tasks/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fid, checkKey: task.checkKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }
      
      sdk.haptics.notificationOccurred('success');
      setToast({ message: 'Task verified successfully!', type: 'success' });
      await fetchTasks();

    } catch (error) {
      sdk.haptics.notificationOccurred('error');
      setToast({ message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setCheckingTaskId(null);
    }
  };
  
  const dailyTasks = tasks.filter(t => t.type === 'DAILY');
  const defaultTasks = tasks.filter(t => t.type === 'DEFAULT');

  if (isLoading) return <div>Loading tasks...</div>;

  return (
    <div className={styles.tasksContainer}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className={styles.title}>Tasks</h1>
      <section className={styles.taskSection}>
        <h2 className={`${styles.sectionTitle} ${styles.dailyTasksTitle}`}>Daily Tasks</h2>
        <div className={styles.taskList}>
          {dailyTasks.map(task => <TaskItem key={task.id} task={task} onVerify={handleVerifyTask} isChecking={checkingTaskId === task.id} />)}
        </div>
      </section>
      <section className={styles.taskSection}>
        <h2 className={`${styles.sectionTitle} ${styles.defaultTasksTitle}`}>Default Tasks</h2>
        <div className={styles.taskList}>
          {defaultTasks.map(task => <TaskItem key={task.id} task={task} onVerify={handleVerifyTask} isChecking={checkingTaskId === task.id} />)}
        </div>
      </section>
    </div>
  );
}