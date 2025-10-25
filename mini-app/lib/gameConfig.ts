// lib/gameConfig.ts

// --- GAME CORE ---
export const GAME_DURATION_SECONDS = 30;

export const INITIAL_SPAWN_RATE = 290; // Milliseconds between spawns
export const INITIAL_BOMB_SPEED = 5;
export const INITIAL_PICTURE_SPEED = 5;

// Final values at the end of the game (difficulty ramps up to these)
export const FINAL_SPAWN_RATE = 230;
export const FINAL_BOMB_SPEED = 8.6;
export const FINAL_PICTURE_SPEED = 8.8;

// --- GAME BALANCE: ITEM SPAWN CHANCES ---
// The sum of all chances should be less than 1.0
export const INITIAL_BOMB_CHANCE = 0.1;
export const FINAL_BOMB_CHANCE = 0.31;
export const POWER_UP_PUMPKIN_CHANCE = 0.0009;

export const POWER_UP_MAGNET_CHANCE = 0.03;
export const POWER_UP_SHIELD_CHANCE = 0.01;
export const POWER_UP_TIME_CHANCE = 0.005;

export const POWER_UP_POINT_10_CHANCE = 0.05;
export const POWER_UP_POINT_5_CHANCE = 0.09;
export const POWER_UP_POINT_2_CHANCE = 0.1;

// --- ITEM VALUES & CONFIG ---
// Authoritative values used for server-side score calculation
export const ITEM_VALUES = {
  picture: 5,//2.5,
  powerup_point_2: 10,
  powerup_point_5: 20,
  powerup_point_10: 30,
  powerup_pumpkin: 500,
};

// Client-side URLs and display values
export const PICTURE_URL = "/Enb_000.png";
export const CAP_PICTURE_URL = "/inf3.png";

export const BASE_PICTURE_VALUE = 5; // Note: Corresponds to ITEM_VALUES.picture
export const POWER_UP_POINT_2_URL = "/powerup_2.png";
export const POWER_UP_POINT_2_VALUE = 10; // Note: Corresponds to ITEM_VALUES.powerup_point_2

export const POWER_UP_POINT_5_URL = "/powerup_5.png";
export const POWER_UP_POINT_5_VALUE = 20; // Note: Corresponds to ITEM_VALUES.powerup_point_5

export const POWER_UP_POINT_10_URL = "/powerup_10.png";
export const POWER_UP_POINT_10_VALUE = 30; // Note: Corresponds to ITEM_VALUES.powerup_point_10

export const POWER_UP_PUMPKIN_URL = "/pumpkin.png";
export const POWER_UP_PUMPKIN_VALUE = 500; // Note: Corresponds to ITEM_VALUES.powerup_pumpkin

// --- POWER-UP DURATIONS (in seconds) ---
export const MAGNET_DURATION = 8;
export const SHIELD_DURATION = 5;
export const TIME_EXTENSION_SECONDS = 10;

// --- POWER-UP ASSET URLS ---
export const POWER_UP_MAGNET_URL = "/magnet.jpg";
export const POWER_UP_SHIELD_URL = "/shield.jpg";

// --- SERVER-SIDE SECURITY ---
export const GRACE_PERIOD_SECONDS = 25;
export const MAX_EVENTS_PER_SECOND = 15; // Max items a user can plausibly collect per second
