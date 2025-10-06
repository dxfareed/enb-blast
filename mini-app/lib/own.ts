import 'dotenv/config';
import { ethers } from 'ethers';
import { GAME_CONTRACT_ADDRESS } from '../app/utils/constants';

const TOKEN_DECIMALS = 18; 

const REWARDER_ADMIN = process.env.REWARDER_ADMIN;
const RPC_URL = "https://mainnet-preconf.base.org";
const SENDER_ADDRESS = "0xE59DF381684a7cf4D3E1177e68569b5D13F9585a";

const contractAbi = [
  {
    "name": "sendReward",
    "type": "function",
    "inputs": [
      { "name": "_user", "type": "address" },
      { "name": "_recipients", "type": "address[]" },
      { "name": "_totalAmount", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

export async function sendRewards(recipientAddresses: string[], totalRewardAmount: number) {
  if (!REWARDER_ADMIN) {
    console.error("Error: REWARDER_ADMIN private key is not defined in your .env file.");
    throw new Error("REWARDER_ADMIN is not configured.");
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(REWARDER_ADMIN, provider);
    const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, contractAbi, wallet);

    const totalAmountWei = ethers.parseUnits(totalRewardAmount.toString(), TOKEN_DECIMALS);

    console.log(`Sending rewards to ${recipientAddresses.length} users...`);
    console.log(`Total amount: ${totalRewardAmount} $ENB (${totalAmountWei.toString()} wei)`);

    const tx = await contract.sendReward(
      SENDER_ADDRESS,
      recipientAddresses,
      totalAmountWei
    );

    console.log(`Transaction sent! Hash: ${tx.hash}`);
    await tx.wait();
    console.log(`Transaction confirmed! Rewards have been distributed.`);
    
    return tx.hash;
  } catch (error) {
    console.error("An error occurred during the reward distribution:", error);
    throw error;
  }
}
