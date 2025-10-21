// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title RewardDistributor
 * @dev This contract distributes ERC20 token rewards to users based on predefined tiers.
 * The owner of the contract can trigger the distribution. The tokens are transferred
 * from a designated treasury wallet, which must first approve this contract to spend
 * the required amount of tokens.
 */
contract RewardDistributor is Ownable {
    // The ERC20 token being distributed
    IERC20 public immutable token;

    // The address of the treasury wallet holding the tokens
    address public treasuryAddress;

    // Reward amounts for each tier (assuming 18 decimals for the token)
    uint256 public constant TIER_1_REWARD = 37_000 * 10**18;
    uint256 public constant TIER_2_REWARD = 24_000 * 10**18;
    uint256 public constant TIER_3_REWARD = 10_000 * 10**18;

    event TreasuryAddressChanged(address indexed newTreasuryAddress);
    event RewardsDistributed(address indexed recipient, uint256 amount, uint256 tier);

    /**
     * @dev Sets up the contract with the token, initial owner, and treasury address.
     * @param _tokenAddress The address of the ERC20 token for rewards.
     * @param _initialOwner The address that will have ownership of this contract.
     * @param _initialTreasuryAddress The address of the wallet holding the funds.
     */
    constructor(
        address _tokenAddress,
        address _initialOwner,
        address _initialTreasuryAddress
    ) Ownable(_initialOwner) {
        require(_tokenAddress != address(0), "RewardDistributor: Token address cannot be zero");
        require(_initialTreasuryAddress != address(0), "RewardDistributor: Treasury address cannot be zero");
        token = IERC20(_tokenAddress);
        treasuryAddress = _initialTreasuryAddress;
    }

    /**
     * @dev Allows the owner to change the treasury address.
     * @param _newTreasuryAddress The new address for the treasury wallet.
     */
    function setTreasuryAddress(address _newTreasuryAddress) external onlyOwner {
        require(_newTreasuryAddress != address(0), "RewardDistributor: New treasury address cannot be zero");
        treasuryAddress = _newTreasuryAddress;
        emit TreasuryAddressChanged(_newTreasuryAddress);
    }

    /**
     * @dev Distributes rewards to three tiers of users.
     * @notice Before calling this, the treasuryAddress must have approved this contract
     * to spend at least the total amount of tokens required for the distribution.
     * @param _tier1Recipients An array of addresses for Rank 1-3 recipients.
     * @param _tier2Recipients An array of addresses for Rank 4-8 recipients.
     * @param _tier3Recipients An array of addresses for Rank 9-15 recipients.
     */
    function distributeRewards(
        address[] calldata _tier1Recipients,
        address[] calldata _tier2Recipients,
        address[] calldata _tier3Recipients
    ) external onlyOwner {
        // Distribute to Tier 1
        for (uint256 i = 0; i < _tier1Recipients.length; i++) {
            address recipient = _tier1Recipients[i];
            require(recipient != address(0), "RewardDistributor: Recipient address cannot be zero");
            bool success = token.transferFrom(treasuryAddress, recipient, TIER_1_REWARD);
            require(success, "RewardDistributor: Tier 1 transfer failed");
            emit RewardsDistributed(recipient, TIER_1_REWARD, 1);
        }

        // Distribute to Tier 2
        for (uint256 i = 0; i < _tier2Recipients.length; i++) {
            address recipient = _tier2Recipients[i];
            require(recipient != address(0), "RewardDistributor: Recipient address cannot be zero");
            bool success = token.transferFrom(treasuryAddress, recipient, TIER_2_REWARD);
            require(success, "RewardDistributor: Tier 2 transfer failed");
            emit RewardsDistributed(recipient, TIER_2_REWARD, 2);
        }

        // Distribute to Tier 3
        for (uint256 i = 0; i < _tier3Recipients.length; i++) {
            address recipient = _tier3Recipients[i];
            require(recipient != address(0), "RewardDistributor: Recipient address cannot be zero");
            bool success = token.transferFrom(treasuryAddress, recipient, TIER_3_REWARD);
            require(success, "RewardDistributor: Tier 3 transfer failed");
            emit RewardsDistributed(recipient, TIER_3_REWARD, 3);
        }
    }

    /**
     * @dev Allows the owner to withdraw the entire balance of the reward token
     * held by this contract. This is a safety measure in case tokens are
     * mistakenly sent directly to this contract's address.
     */
    function withdraw() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "RewardDistributor: No reward tokens to withdraw");
        bool success = token.transfer(owner(), balance);
        require(success, "RewardDistributor: Withdrawal failed");
    }

    /**
     * @dev Allows the owner to withdraw any other ERC20 tokens mistakenly sent
     * to this contract.
     * @param _tokenAddress The address of the ERC20 token to withdraw.
     */
    function withdrawMistakenlySentTokens(address _tokenAddress) external onlyOwner {
        require(_tokenAddress != address(token), "RewardDistributor: Use withdraw() for the main reward token");
        IERC20 foreignToken = IERC20(_tokenAddress);
        uint256 balance = foreignToken.balanceOf(address(this));
        require(balance > 0, "RewardDistributor: No foreign tokens to withdraw");
        bool success = foreignToken.transfer(owner(), balance);
        require(success, "RewardDistributor: Foreign token withdrawal failed");
    }
}
