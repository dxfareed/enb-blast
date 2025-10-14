/* import { mintclub } from 'mint.club-v2-sdk';

async function getTokenHolders(tokenAddress: string) {
  try {
    console.log(`Fetching holders for token: ${tokenAddress}`);

    // Get the list of token holders
    const holders = await mintclub.network('base').token(tokenAddress).getHolders();

    if (holders && holders.length > 0) {
      console.log('Token Holders:');
      holders.forEach((holder, index) => {
        console.log(`  ${index + 1}. Address: ${holder.walletAddress}, Balance: ${holder.balance}`);
      });
    } else {
      console.log('No holders found for this token.');
    }

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// The ERC20 token address you provided
const exampleTokenAddress = '0xf73978b3a7d1d4974abae11f696c1b4408c027a0';

getTokenHolders(exampleTokenAddress);
 */