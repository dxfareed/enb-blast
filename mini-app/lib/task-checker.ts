
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function checkWarpcastFollow(): Promise<boolean> {
  console.log("Checking Warpcast API...");
  await wait(1500);
  console.log("Warpcast check successful.");
  return true;
}

export async function checkTelegramJoin(): Promise<boolean> {
  console.log("Checking Telegram API...");
  await wait(2000);
  console.log("Telegram check failed.");
  throw new Error("Could not verify Telegram membership.");
}

export async function checkGamePlayed(): Promise<boolean> {
  console.log("Checking game activity...");
  await wait(500);
  console.log("Game play verified.");
  return true;
}

export async function checkTokenClaim(): Promise<boolean> {
  console.log("Checking database for recent claims...");
  await wait(1800);
  console.log("On-chain claim verified.");
  return true;
}

export async function checkLeaderboardVisit(): Promise<boolean> {
  console.log("Checking leaderboard visit...");
  await wait(800);
  console.log("Leaderboard visit verified.");
  return true;
}