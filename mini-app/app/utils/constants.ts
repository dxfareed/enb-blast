const GAME_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!;

const TOKEN_ADDRESS = '0xf73978b3a7d1d4974abae11f696c1b4408c027a0'

export const BASE_BLOCKCHAIN_FACTS = [
  "Base is a secure, low-cost, builder-friendly Ethereum L2.",
  "Base was incubated by Coinbase and built on the open-source OP Stack.",
  "Base aims to be decentralized, permissionless, and open to anyone.",
  "Base settled over $1 billion in transactions in its first month.",
  "ENB was launched March 15, 2025.",
  "ENB was launched on Cliza v1.",
  "Everybody Needs Base."
];

const TOKEN_MEMBERSHIP_CONTRACT_ADDRESS = "0x54F400Ce798049303594DdA9Df724996b9B6dEAF";
const TOKEN_MEMBERSHIP_LEVELS = ["Based", "SuperBased", "Legendary"];
const TOKEN_MEMBERSHIP_CONTRACT_ABI = [{ "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userAccounts", "outputs": [{ "internalType": "uint40", "name": "lastDailyClaimTime", "type": "uint40" }, { "internalType": "uint40", "name": "accountCreatedAt", "type": "uint40" }, { "internalType": "uint32", "name": "totalDailyClaims", "type": "uint32" }, { "internalType": "uint96", "name": "totalYieldClaimed", "type": "uint96" }, { "internalType": "enum EnbMiniApp.MembershipLevel", "name": "membershipLevel", "type": "uint8" }, { "internalType": "bool", "name": "exists", "type": "bool" }], "stateMutability": "view", "type": "function" }];
const GAME_CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_initialOwner",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_signerAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_initialMaxClaims",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_initialMaxClaimAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_initialCooldownPeriod",
          "type": "uint256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "ECDSAInvalidSignature",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "length",
          "type": "uint256"
        }
      ],
      "name": "ECDSAInvalidSignatureLength",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "s",
          "type": "bytes32"
        }
      ],
      "name": "ECDSAInvalidSignatureS",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newPeriod",
          "type": "uint256"
        }
      ],
      "name": "CooldownPeriodChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newAmount",
          "type": "uint256"
        }
      ],
      "name": "MaxClaimAmountChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newLimit",
          "type": "uint256"
        }
      ],
      "name": "MaxClaimsChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "newSigner",
          "type": "address"
        }
      ],
      "name": "SignerAddressChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "fid",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "claimingWallet",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "TokensClaimed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "fid",
          "type": "uint256"
        }
      ],
      "name": "UserDeleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "fid",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "walletCount",
          "type": "uint256"
        }
      ],
      "name": "UserRegistered",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_nonce",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "_signature",
          "type": "bytes"
        }
      ],
      "name": "claimTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "cooldownPeriod",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fid",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "_wallets",
          "type": "address[]"
        }
      ],
      "name": "deleteUserProfile",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getContractTokenBalance",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getNumberOfUsers",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getSignerAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTokenAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fid",
          "type": "uint256"
        }
      ],
      "name": "getUserProfile",
      "outputs": [
        {
          "components": [
            {
              "internalType": "bool",
              "name": "isRegistered",
              "type": "bool"
            },
            {
              "internalType": "uint256",
              "name": "registrationDate",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastClaimTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "claimNonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "totalClaimed",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "claimsInCurrentCycle",
              "type": "uint256"
            }
          ],
          "internalType": "struct Game.UserProfile",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "isWalletForFid",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxClaimAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "maxClaimsPerCycle",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_fid",
          "type": "uint256"
        },
        {
          "internalType": "address[]",
          "name": "_wallets",
          "type": "address[]"
        },
        {
          "internalType": "bytes",
          "name": "_signature",
          "type": "bytes"
        }
      ],
      "name": "register",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_newPeriod",
          "type": "uint256"
        }
      ],
      "name": "setCooldownPeriod",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_newAmount",
          "type": "uint256"
        }
      ],
      "name": "setMaxClaimAmount",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_newLimit",
          "type": "uint256"
        }
      ],
      "name": "setMaxClaimsPerCycle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_newSignerAddress",
          "type": "address"
        }
      ],
      "name": "setSignerAddress",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "userProfiles",
      "outputs": [
        {
          "internalType": "bool",
          "name": "isRegistered",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "registrationDate",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "lastClaimTimestamp",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "claimNonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalClaimed",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "claimsInCurrentCycle",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "walletToFid",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawMistakenlySentTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawTokens",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ] as const;
export { 
    GAME_CONTRACT_ADDRESS,
    TOKEN_ADDRESS, 
    TOKEN_MEMBERSHIP_LEVELS, 
    TOKEN_MEMBERSHIP_CONTRACT_ABI, 
    TOKEN_MEMBERSHIP_CONTRACT_ADDRESS,
    GAME_CONTRACT_ABI
};