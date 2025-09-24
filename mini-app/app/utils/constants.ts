const GAME_CONTRACT_ADDRESS= "0x854cec65437d6420316b2eb94fecaaf417690227"

const TOKEN_ADDRESS = "0xf73978b3a7d1d4974abae11f696c1b4408c027a0";
const TOKEN_MEMBERSHIP_CONTRACT_ADDRESS = "0x54F400Ce798049303594DdA9Df724996b9B6dEAF";
const TOKEN_MEMBERSHIP_LEVELS = ["Based", "SuperBased", "Legendary"];
const TOKEN_MEMBERSHIP_CONTRACT_ABI = [{ "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userAccounts", "outputs": [{ "internalType": "uint40", "name": "lastDailyClaimTime", "type": "uint40" }, { "internalType": "uint40", "name": "accountCreatedAt", "type": "uint40" }, { "internalType": "uint32", "name": "totalDailyClaims", "type": "uint32" }, { "internalType": "uint96", "name": "totalYieldClaimed", "type": "uint96" }, { "internalType": "enum EnbMiniApp.MembershipLevel", "name": "membershipLevel", "type": "uint8" }, { "internalType": "bool", "name": "exists", "type": "bool" }], "stateMutability": "view", "type": "function" }];

export { 
    GAME_CONTRACT_ADDRESS,
    TOKEN_ADDRESS, 
    TOKEN_MEMBERSHIP_LEVELS, 
    TOKEN_MEMBERSHIP_CONTRACT_ABI, 
    TOKEN_MEMBERSHIP_CONTRACT_ADDRESS 
};