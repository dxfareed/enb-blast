import styles from './GlobalLoader.module.css';

export default function GlobalLoader() {
  return (
    <div className={styles.container}>
      <div className={styles.loader}></div>
    </div>
  );
}
