"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useAccount, useConnect } from 'wagmi'

export default function Home() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()

  const handleConnect = () => {
    if (connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.headerWrapper}>
        {isConnected ? (
          <div>{address}</div>
        ) : (
          <button type="button" onClick={handleConnect}>
            Connect
          </button>
        )}
      </header>

      <div className={styles.content}>
        <Image
          priority
          src="/sphere.svg"
          alt="Sphere"
          width={200}
          height={200}
        />
        <h1 className={styles.title}>ENB Pop</h1>
        <p>
          A mini-app for ENB Pop
        </p>
      </div>
    </div>
  );
}
