import styles from './GlobalLoader.module.css';

type GlobalLoaderProps = {
  message?: string;
};

export default function GlobalLoader({ message }: GlobalLoaderProps) {
  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
