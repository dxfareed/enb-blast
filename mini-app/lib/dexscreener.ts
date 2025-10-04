export interface TokenMarqueeRawData {
  tokenName: string;
  priceUsd: number;
  liquidity: number;
  marketCap: number;
  priceChange_h1: number;
}

export const getTokenMarqueeData = async (tokenAddress: string): Promise<TokenMarqueeRawData | null> => {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    if (!response.ok) {
      console.error('DexScreener API request failed:', response.statusText);
      return null;
    }
    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) {
      console.error('No pair data found for token address:', tokenAddress);
      return null;
    }

    const relevantPair = data.pairs.find((p: any) =>
      ['WETH', 'ETH', 'USDC', 'USDT'].includes(p.quoteToken.symbol)
    );
    const pair = relevantPair || data.pairs[0];

    const rawData: TokenMarqueeRawData = {
      tokenName: pair.baseToken?.symbol || 'N/A',
      priceUsd: parseFloat(pair.priceUsd) || 0,
      marketCap: pair.fdv || 0,
      liquidity: pair.liquidity?.usd || 0,
      priceChange_h1: pair.priceChange?.h1 || 0,
    };

    return rawData;

  } catch (error) {
    console.error('Error fetching token details:', error);
    return null;
  }
};