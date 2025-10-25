export const TOKEN_NAME = '$ENB';

export const REWARD_TIERS = [
  { rank: '1st Place', reward: `90,000 ${TOKEN_NAME}`, style: 'legendaryText' },
  { rank: '2nd Place', reward: `60,000 ${TOKEN_NAME}`, style: 'superBasedText' },
  { rank: '3rd Place', reward: `45,000 ${TOKEN_NAME}`, style: 'basedText' },
  { rank: '4th/5th Place', reward: `15,000 ${TOKEN_NAME}`, style: '' },
  { rank: '6th-15th Place', reward: `7,500 ${TOKEN_NAME}`, style: '' },
];

export const REWARD_AMOUNTS: { [key: number]: number } = {
  1: 90000,
  2: 60000,
  3: 45000,
  4: 15000, 5: 15000,
  6: 7500, 7: 7500, 8: 7500, 9: 7500, 10: 7500,
  11: 7500, 12: 7500, 13: 7500, 14: 7500, 15: 7500,
};

export const prizePoolAmount = 300000;