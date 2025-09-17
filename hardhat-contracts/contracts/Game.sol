// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Game is Ownable {
    using ECDSA for bytes32;

    // user profile
    struct UserProfile {
        bool isRegistered;
        uint256 registrationDate;
        uint256 claimCount;
        uint256 totalClaimed;
    }

    address public serverSignerAddress;
    IERC20 public immutable token;
    mapping(address => uint256) public userNonces;

    mapping(address => bool) public isRegistered;
    address[] public users;
    
    mapping(address => uint256) public registrationDate;
    mapping(address => uint256) public totalClaimedAmount;

    event TokensClaimed(address indexed user, uint256 amount, uint256 nonce);
    event UserRegistered(address indexed user, uint256 timestamp);

    constructor(
        address _tokenAddress,
        address _initialOwner,
        address _signerAddress
    ) Ownable(_initialOwner) {
        token = IERC20(_tokenAddress);
        serverSignerAddress = _signerAddress;
    }

    function claimTokens(uint256 _amount, bytes memory _signature) external {
        
        require(_amount > 0, "Game: Amount must be greater than zero");
        uint256 currentNonce = userNonces[msg.sender];
        bytes32 messageHash = _buildMessageHash(_amount, currentNonce);
        
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
        address recoveredSigner = ethSignedMessageHash.recover(_signature);

        require(recoveredSigner == serverSignerAddress, "Game: Invalid signature");
        
          if (!isRegistered[msg.sender]) {
            _registerUser(msg.sender);
        }

        userNonces[msg.sender]++;
        totalClaimedAmount[msg.sender] += _amount;

        require(token.balanceOf(address(this)) >= _amount, "Game: Insufficient balance");
        
        bool success = token.transfer(msg.sender, _amount);
        require(success, "Game: Transfer failed");

        emit TokensClaimed(msg.sender, _amount, currentNonce);
    }

     function register() external {
        require(!isRegistered[msg.sender], "User is already registered");
        _registerUser(msg.sender);
    }

    function getUserProfile(address _account) external view returns (UserProfile memory) {
        return UserProfile({
            isRegistered: isRegistered[_account],
            registrationDate: registrationDate[_account],
            claimCount: userNonces[_account],
            totalClaimed: totalClaimedAmount[_account]
        });
    }

    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    function getNumberOfUsers() external view returns (uint256) {
        return users.length;
    }
    function _buildMessageHash(uint256 _amount, uint256 _nonce) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), msg.sender, _amount, _nonce));
    }
    function setSignerAddress(address _newSignerAddress) external onlyOwner {
        serverSignerAddress = _newSignerAddress;
    }
    function withdrawTokens(uint256 _amount) external onlyOwner {
        require(token.balanceOf(address(this)) >= _amount, "Game: Not enough tokens");
        bool success = token.transfer(owner(), _amount);
        require(success, "Game: Withdrawal failed");
    }
    function isUserRegistered(address _account) external view returns (bool) {
        return isRegistered[_account];
    }
    function _registerUser(address _account) internal {
        isRegistered[_account] = true;
        users.push(_account);
        registrationDate[_account] = block.timestamp;
        
        emit UserRegistered(_account, block.timestamp);
    }
}