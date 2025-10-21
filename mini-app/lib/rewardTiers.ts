export const TOKEN_NAME = '$CAP';

export const REWARD_TIERS = [
  { rank: '1st Place', reward: `90,000 ${TOKEN_NAME}`, style: 'legendaryText' },
  { rank: '2nd Place', reward: `60,000 ${TOKEN_NAME}`, style: 'superBasedText' },
  { rank: '3rd Place', reward: `40,000 ${TOKEN_NAME}`, style: 'basedText' },
  { rank: '4th/5th Place', reward: `15,000 ${TOKEN_NAME}`, style: '' },
  { rank: '6th-10th Place', reward: `6,000 ${TOKEN_NAME}`, style: '' },
];

export const REWARD_AMOUNTS: { [key: number]: number } = {
  1: 90000,
  2: 60000,
  3: 40000,
  4: 15000, 5: 15000,
  6: 6000, 7: 6000, 8: 6000, 9: 6000, 10: 6000,
  11: 6000, 12: 6000, 13: 6000, 14: 6000, 15: 6000,
};