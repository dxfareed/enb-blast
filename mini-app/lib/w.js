// lib/w.js (UPDATED)

import fetch from 'node-fetch';

/**
 * Fetches pair information for a given token address across a chain.
 * It prioritizes a pair against WETH/ETH if available for better market context.
 * * @param {string} tokenAddress The address of the base token.
 * @returns {Promise<object|null>} A promise that resolves to an object with the primary pair's details, or null.
 */
async function getTokenPrice(tokenAddress) {
  // --- CORRECTED API ENDPOINT ---
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;

  console.log(`Fetching data from: ${url}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    if (data && data.pairs && data.pairs.length > 0) {
      // 1. Prioritize a pair against WETH, ETH, or USDC/USDT for market context
      const relevantPair = data.pairs.find(p => 
        p.quoteToken.symbol === 'WETH' || 
        p.quoteToken.symbol === 'ETH' ||
        p.quoteToken.symbol === 'USDC' ||
        p.quoteToken.symbol === 'USDT'
      );

      // 2. Fall back to the first pair if no specific relevant pair is found
      const pairInfo = relevantPair || data.pairs[0];
      
      if (!pairInfo) {
          console.error(`Error: No relevant pair found in the response for ${tokenAddress}`);
          return null;
      }
      
      // Extracting the requested new metrics:
      const liquidityUsd = pairInfo.liquidity?.usd ?? 'N/A'; // Use optional chaining and nullish coalescing for safety
      const marketCap = pairInfo.fdv ?? 'N/A'; // FDV (Fully Diluted Valuation) is often used as Market Cap
      const priceChange1h = pairInfo.priceChange?.h1 ?? 'N/A'; // 1-hour price change in percentage

      return {
        // Basic Info
        chain: pairInfo.chainId, // Use the chainId from the pair info
        dex: pairInfo.dexId,
        pair: `${pairInfo.baseToken.symbol}/${pairInfo.quoteToken.symbol}`,
        pairAddress: pairInfo.pairAddress,
        
        // Price Info
        price_usd: pairInfo.priceUsd ?? 'N/A',
        price_native: pairInfo.priceNative ?? 'N/A',
        
        // Requested Metrics
        liquidity_usd: liquidityUsd,
        market_cap_usd: marketCap,
        price_change_1h_percent: priceChange1h
      };
    } else {
      console.error(`Error: Could not find any pairs for token address ${tokenAddress}`);
      return null;
    }
  } catch (error) {
    console.error("An error occurred while fetching the token price:", error.message);
    return null;
  }
}

// ---------------------------------
// --- Main Execution ---
// ---------------------------------

(async () => {
  // We no longer need to pass the chain, as the token endpoint provides it
  const tokenAddress = "0xf73978b3a7d1d4974abae11f696c1b4408c027a0"; 

  console.log(`Fetching market data for token address: ${tokenAddress}...`);

  const marketData = await getTokenPrice(tokenAddress);

  if (marketData) {
    console.log("\n--- Fetched Market Data ---");
    console.log(`Pair: ${marketData.pair} on ${marketData.dex} (${marketData.chain})`);
    console.log(`Pair Address: ${marketData.pairAddress}`);
    console.log("---------------------------------");
    console.log(`Current Price (USD):  $${marketData.price_usd}`);
    console.log(`Liquidity (USD):      $${marketData.liquidity_usd.toLocaleString('en-US')}`);
    console.log(`Market Cap (FDV):     $${marketData.market_cap_usd.toLocaleString('en-US')}`);
    console.log(`Price Change (1H):    ${marketData.price_change_1h_percent}%`);
    console.log("---------------------------------");
  } else {
      console.log("Failed to retrieve market data.");
  }
})();