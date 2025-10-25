# On-Chain to Off-Chain Registration Refactor

## Problem

The previous user registration process required an on-chain transaction to a smart contract. This approach, while secure, introduced significant user friction due to:

1.  **Gas Fees:** Users were required to pay gas fees to register, creating a financial barrier to entry.
2.  **Transaction Speed:** The registration process was slow, as it depended on blockchain confirmation times.
3.  **User Experience:** The multi-step process of signing a transaction was complex for users unfamiliar with web3 interactions.

These factors led to user complaints and a high drop-off rate during onboarding.

## Solution

To address these issues, we are moving to a purely off-chain registration system. This new system leverages the existing Farcaster Quick Auth for secure, one-click, gas-free registration.

## Progress So Far

I have made the following progress in transitioning to the new off-chain system:

1.  **Identified Core Logic:** The primary logic for the registration flow is located in `app/api/user/profile/route.ts`.

2.  **Removed On-Chain Dependencies:** I have removed all `viem` and other on-chain dependencies from `app/api/user/profile/route.ts`. This includes:
    *   Removing unused imports from `viem`.
    *   Deleting the `publicClient` and `GAME_CONTRACT_ABI` constants.
    *   Removing the `isFidAlreadyRegistered` function, which was responsible for checking the on-chain registration status.

3.  **Simplified Backend:** The backend is now partially simplified, with the on-chain verification logic removed.

## Next Steps

The next agent should continue this task by:

1.  **Modify the `POST` Handler:** Update the `POST` handler in `app/api/user/profile/route.ts` to immediately activate the user (`registrationStatus: 'ACTIVE'`) after the Farcaster profile has been successfully fetched and created.

2.  **Remove Signature Generation:** The code that generates the server-side signature for the on-chain transaction should be removed.

3.  **Update Frontend:** The frontend registration page (`app/onboarding/register/page.tsx`) needs to be updated to remove all `wagmi` hooks and on-chain transaction logic. The `handleRegister` function should be simplified to make a single API call to the updated backend.

By following these steps, the transition to a seamless and gas-free off-chain registration will be complete.
