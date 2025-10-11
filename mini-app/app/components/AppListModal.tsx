// app/components/AppListModal.tsx
'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import styles from './AppListModal.module.css';
import { X } from 'lucide-react';

type App = {
  name: string;
  url: string;
  logo: string;
};

const apps: App[] = [
  {
    name: 'ENB Mining',
    url: 'https://farcaster.xyz/miniapps/4uqcueQifUYV/enb-mining',
    logo: 'https://bounty.enb.fun/Logo_enb.svg'
  },
  {
    name: 'ENB Bounty',
    url: 'https://farcaster.xyz/miniapps/0GzdUkFK2f7A/enb-bounty',
    logo: 'https://bounty.enb.fun/Logo_enb.svg'
  }
];

type AppListModalProps = {
  onClose: () => void;
};

export default function AppListModal({ onClose }: AppListModalProps) {
  const handleAppClick = (url: string) => {
    // FINAL CORRECTION: Passing an object { url: url } to the function.
    sdk.actions.openMiniApp({ url });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>
        <div className={styles.appList}>
          {apps.map((app) => (
            <div key={app.name} className={styles.appItem} onClick={() => handleAppClick(app.url)}>
              <img src={app.logo} alt={`${app.name} logo`} className={styles.appLogo} />
              <span className={styles.appName}>{app.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}