import { sdk } from '@farcaster/miniapp-sdk';
import styles from './Marquee.module.css';
import { TokenMarqueeRawData } from '@/lib/dexscreener';

interface MarqueeProps {
  data: TokenMarqueeRawData | null;
  isLoading: boolean;
  token: string;
}

const formatLargeCurrency = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}m`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}k`;
  return `$${value.toFixed(2)}`;
};

const formatPrice = (price: number): string => {
  if (price < 0.01) return `$${price.toPrecision(4)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
};

const Marquee = ({ data, isLoading, token }: MarqueeProps) => {
  const buyFunction = async () => {
    try {
      const buyToken = `eip155:8453/erc20:${token}`;
      const result = await sdk.actions.swapToken({
        buyToken,
      });

      if (result.success) {
        console.log('Swap successful:', result.swap);
      } else {
        console.error('Swap failed:', result.reason, result.error);
      }
    } catch (error) {
      console.error('An error occurred while trying to swap tokens:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.marqueeContainer}>
        <div className={styles.marqueeContent}>
          <span>Loading Token Data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.marqueeContainer}>
        <div className={styles.marqueeContent}>
          <span className={styles.errorText}>Failed to load token data.</span>
        </div>
      </div>
    );
  }

  const priceChangeColor = data.priceChange_h1 > 0 ? styles.positive : data.priceChange_h1 < 0 ? styles.negative : '';

  const MarqueeSegment = () => (
    <>
      <span className={styles.label}>LIQUIDITY:</span>
      <span className={styles.value}>{formatLargeCurrency(data.liquidity)}&nbsp;</span>

      <span className={styles.label}>PRICE:</span>
      <span className={styles.value}>{formatPrice(data.priceUsd)}&nbsp;</span>

      <span className={styles.label}>MC:</span>
      <span className={styles.value}>{formatLargeCurrency(data.marketCap)}&nbsp;</span>

      <span className={styles.label}>1H:</span>
      <span className={`${styles.value} ${priceChangeColor}`}>{data.priceChange_h1.toFixed(2)}%</span>
      <span className={styles.label}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      <span className={styles.value}>${data.tokenName}</span>
    </>
  );

  return (
    <div className={styles.marqueeContainer} onClick={buyFunction}>
      <div className={styles.marqueeContent}>
        <div className={styles.segment}>
          <MarqueeSegment />
        </div>
        <div className={`${styles.segment} ${styles.ctaSegment}`}>
            <span>CLICK TO BUY</span>
        </div>
        <div className={styles.segment}>
          <MarqueeSegment />
        </div>
         <div className={`${styles.segment} ${styles.ctaSegment}`}>
            <span>CLICK TO BUY</span>
        </div>
      </div>
    </div>
  );
};

export default Marquee;
