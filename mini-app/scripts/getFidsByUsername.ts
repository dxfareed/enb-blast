/* import 'dotenv/config';

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

if (!NEYNAR_API_KEY) {
  console.error("Error: NEYNAR_API_KEY is not defined in your .env file.");
  process.exit(1);
}

const usernames = [
  'bagasyin',
  'yahyamaumakan',
  'sitiwati',
  'sanzyourbae',
  'hancox',
  'localhost3000',
  'clocks',
  'rajugogo',
  'restuhaha',
  'rodriguezdev',
  '0x0lazycode',
];

async function getFidByUsername(username: string): Promise<number | null> {
  // Note: The URL is encoded automatically by fetch
  const url = `https://api.neynar.com/v2/farcaster/user/search?q=${username}&limit=5`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'api_key': NEYNAR_API_KEY,
      },
    });

    if (!response.ok) {
      // A 404 here might mean the search endpoint itself is not found, not that the user is.
      // The API returns an empty array for no results, so any non-200 is an actual error.
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    // The search endpoint returns a list of users. We need to find the exact match.
    const user = data.result.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());

    if (user) {
      return user.fid;
    } else {
      console.warn(`Username not found via search: ${username}`);
      return null;
    }

  } catch (error) {
    console.error(`Failed to fetch FID for ${username}:`, error);
    return null;
  }
}

async function main() {
  console.log("Fetching FIDs for usernames...");
  const results: Record<string, number | null> = {};

  for (const username of usernames) {
    const fid = await getFidByUsername(username);
    results[username] = fid;
    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log("\n--- Results ---");
  for (const [username, fid] of Object.entries(results)) {
    console.log(`${username}: ${fid !== null ? fid : 'Not Found'}`);
  }
  console.log("---------------");
}

main();
 */