const ROOT_URL = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL;

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: "",
  },
  "baseBuilder": {
    "allowedAddresses": [process.env.NEXT_PUBLIC_BASEBUILDER_ALLOWED_ADDRESS || ''],
  },
  frame: {
    version: "1",
    name: "ENB Blast",
    subtitle: "Collect ENBs, avoid the bomb!",
    description: "Drag your avatar to collect ENBs and avoid bombs. Earn points and climb the leaderboard!",
    screenshotUrls: [],
    iconUrl: `${ROOT_URL}/icon.png`,
    splashImageUrl: `${ROOT_URL}/icon.png`,
    splashBackgroundColor: "#000000",
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/hero.png`,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "games",
    tags: ["games", "social", "fun"],
    heroImageUrl: `${ROOT_URL}/hero.png`,
    ogTitle: "Collect ENBs, avoid the bomb!",
    ogDescription: "Drag your avatar to collect ENBs and avoid bombs. Earn points and climb the leaderboard!",
    ogImageUrl: `${ROOT_URL}/hero.png`,
    tagline: "Collect ENBs, avoid the bomb!",
    "noindex": true,
  },
} as const;
