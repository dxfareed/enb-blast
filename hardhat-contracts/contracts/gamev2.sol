// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Game is Ownable {
    using ECDSA for bytes32;

    struct UserProfile {
        bool isRegistered;
        uint256 registrationDate;
        uint256 claimCount;
        uint256 totalClaimed;
        uint256 dailyClaims;
    }

    address private serverSignerAddress;
    IERC20 private immutable token;

    uint256 private constant MAX_DAILY_CLAIMS = 5;
    uint256 private constant MAX_CLAIM_AMOUNT = 300 ether;

    mapping(address => uint256) public userNonces;
    mapping(address => bool) public isRegistered;
    mapping(address => uint256) private registrationDate;
    mapping(address => uint256) private totalClaimedAmount;
    mapping(address => mapping(uint256 => uint256)) private userDailyClaims;

    address[] private users;
    mapping(address => uint256) private userIndex;

    event TokensClaimed(address indexed user, uint256 amount, uint256 nonce);
    event UserRegistered(address indexed user, uint256 timestamp);
    event RewardsSent(
        address indexed onBehalfOfUser,
        uint256 totalAmount,
        uint256 recipientCount
    );
    event SignerAddressChanged(address indexed newSigner);

    constructor(
        address _tokenAddress,
        address _initialOwner,
        address _signerAddress
    ) Ownable(_initialOwner) {
        token = IERC20(_tokenAddress);
        serverSignerAddress = _signerAddress;
    }

    function claimTokens(uint256 _amount, bytes memory _signature) external {
        require(isRegistered[msg.sender], "Game: User is not registered");
        require(
            _amount > 0 && _amount <= MAX_CLAIM_AMOUNT,
            "Game: Invalid claim amount"
        );
        require(
            token.balanceOf(address(this)) >= _amount,
            "Game: Insufficient contract balance"
        );

        uint256 day = block.timestamp / 1 days;
        require(
            userDailyClaims[msg.sender][day] < MAX_DAILY_CLAIMS,
            "Game: Daily claim limit reached"
        );

        uint256 currentNonce = userNonces[msg.sender];
        bytes32 messageHash = _buildMessageHash(_amount, currentNonce);
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address recoveredSigner = ethSignedMessageHash.recover(_signature);
        require(
            recoveredSigner == serverSignerAddress,
            "Game: Invalid signature"
        );

        userNonces[msg.sender]++;
        totalClaimedAmount[msg.sender] += _amount;
        userDailyClaims[msg.sender][day]++;

        bool success = token.transfer(msg.sender, _amount);
        require(success, "Game: Token transfer failed");

        emit TokensClaimed(msg.sender, _amount, currentNonce);
    }

    function register() external {
        require(!isRegistered[msg.sender], "Game: User is already registered");
        _registerUser(msg.sender);
    }

    function sendReward(
        address _user,
        address[] calldata _recipients,
        uint256 _totalAmount
    ) external onlyOwner {
        uint256 recipientCount = _recipients.length;
        require(recipientCount > 0, "Game: Recipient list cannot be empty");
        require(_user != address(0), "Game: User cannot be the zero address");

        require(
            token.balanceOf(_user) >= _totalAmount,
            "Game: Insufficient user balance"
        );
        require(
            token.allowance(_user, address(this)) >= _totalAmount,
            "Game: Insufficient user allowance for contract"
        );

        uint256 amountPerRecipient = _totalAmount / recipientCount;
        require(
            amountPerRecipient > 0,
            "Game: Total amount too small for distribution"
        );

        for (uint i = 0; i < recipientCount; i++) {
            address recipient = _recipients[i];
            if (recipient != address(0)) {
                bool success = token.transferFrom(
                    _user,
                    recipient,
                    amountPerRecipient
                );
                require(
                    success,
                    "Game: Reward transfer failed for a recipient"
                );
            }
        }

        emit RewardsSent(_user, _totalAmount, recipientCount);
    }

    function deleteUser(address _userAddress) external onlyOwner {
        require(isRegistered[_userAddress], "Game: User is not registered");

        isRegistered[_userAddress] = false;
        registrationDate[_userAddress] = 0;
        totalClaimedAmount[_userAddress] = 0;
        userNonces[_userAddress] = 0;

        uint256 index = userIndex[_userAddress];
        address lastUser = users[users.length - 1];
        users[index] = lastUser;
        userIndex[lastUser] = index;
        users.pop();
        delete userIndex[_userAddress];
    }

    function getUserProfile(
        address _account
    ) external view returns (UserProfile memory) {
        uint256 day = block.timestamp / 1 days;
        return
            UserProfile({
                isRegistered: isRegistered[_account],
                registrationDate: registrationDate[_account],
                claimCount: userNonces[_account],
                totalClaimed: totalClaimedAmount[_account],
                dailyClaims: userDailyClaims[_account][day]
            });
    }

    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getNumberOfUsers() external view returns (uint256) {
        return users.length;
    }

    function _buildMessageHash(
        uint256 _amount,
        uint256 _nonce
    ) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(address(this), msg.sender, _amount, _nonce)
            );
    }

    function _registerUser(address _account) internal {
        isRegistered[_account] = true;
        registrationDate[_account] = block.timestamp;
        userIndex[_account] = users.length;
        users.push(_account);
        emit UserRegistered(_account, block.timestamp);
    }

    function setSignerAddress(address _newSignerAddress) external onlyOwner {
        require(
            _newSignerAddress != address(0),
            "Game: New signer cannot be the zero address"
        );
        serverSignerAddress = _newSignerAddress;
        emit SignerAddressChanged(_newSignerAddress);
    }

    function getSignerAddress() external view onlyOwner returns (address) {
        return serverSignerAddress;
    }

    function getTokenAddress() external view onlyOwner returns (address) {
        return address(token);
    }

    function withdrawTokens(uint256 _amount) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance >= _amount, "Game: Not enough tokens in contract");
        bool success = token.transfer(owner(), _amount);
        require(success, "Game: Withdrawal failed");
    }
}
