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
        uint256 lastClaimTimestamp;
        uint256 claimNonce;
        uint256 totalClaimed;
        uint256 claimsInCurrentCycle;
    }

    address private serverSignerAddress;
    IERC20 private immutable token;

    uint256 private constant MAX_CLAIM_AMOUNT = 300 ether;
    uint256 private constant COOLDOWN_PERIOD = 24 hours;

    uint256 public maxClaimsPerCycle;

    mapping(uint256 => UserProfile) public userProfiles;
    mapping(address => uint256) public walletToFid;
    mapping(uint256 => mapping(address => bool)) public isWalletForFid;

    uint256[] private registeredFids;
    mapping(uint256 => uint256) private fidIndex;

    event UserDeleted(uint256 indexed fid);
    event UserRegistered(uint256 indexed fid, uint256 walletCount);
    event TokensClaimed(uint256 indexed fid, address indexed claimingWallet, uint256 amount, uint256 nonce);
    event SignerAddressChanged(address indexed newSigner);
    event RewardsSent(address indexed onBehalfOfUser, uint256 totalAmount, uint256 recipientCount);
    event MaxClaimsChanged(uint256 newLimit);

    constructor(
        address _tokenAddress,
        address _initialOwner,
        address _signerAddress,
        uint256 _initialMaxClaims 
    ) Ownable(_initialOwner) {
        token = IERC20(_tokenAddress);
        serverSignerAddress = _signerAddress;
        require(_initialMaxClaims > 0, "Game: Initial max claims must be greater than zero");
        maxClaimsPerCycle = _initialMaxClaims;
    }

    function register(uint256 _fid, address[] calldata _wallets, bytes memory _signature) external {
        require(_fid != 0, "Game: FID cannot be zero");
        require(!userProfiles[_fid].isRegistered, "Game: FID is already registered");
        require(_wallets.length > 0, "Game: Wallets list cannot be empty");
        bytes32 messageHash = _buildRegistrationHash(_fid, _wallets);
        require(_verifySignature(messageHash, _signature), "Game: Invalid registration signature");
        for (uint256 i = 0; i < _wallets.length; i++) {
            address wallet = _wallets[i];
            require(wallet != address(0), "Game: Wallet cannot be zero address");
            require(walletToFid[wallet] == 0, "Game: Wallet is already registered to another FID");
            walletToFid[wallet] = _fid;
            isWalletForFid[_fid][wallet] = true;
        }
        UserProfile storage user = userProfiles[_fid];
        user.isRegistered = true;
        user.registrationDate = block.timestamp;
        fidIndex[_fid] = registeredFids.length;
        registeredFids.push(_fid);
        emit UserRegistered(_fid, _wallets.length);
    }

    function claimTokens(uint256 _amount, uint256 _nonce, bytes memory _signature) external {
        uint256 fid = walletToFid[msg.sender];
        require(fid != 0, "Game: Wallet is not registered");

        UserProfile storage user = userProfiles[fid];

        if (user.claimsInCurrentCycle >= maxClaimsPerCycle) {
            require(block.timestamp > user.lastClaimTimestamp + COOLDOWN_PERIOD, "Game: 24-hour cooldown has not passed since your last claim cycle");
            
            user.claimsInCurrentCycle = 1;
        } else {
            user.claimsInCurrentCycle++;
        }

        require(_nonce == user.claimNonce, "Game: Invalid nonce");
        require(_amount > 0 && _amount <= MAX_CLAIM_AMOUNT, "Game: Invalid claim amount");
        require(token.balanceOf(address(this)) >= _amount, "Game: Insufficient contract balance");

        bytes32 messageHash = _buildClaimHash(fid, _amount, _nonce);
        require(_verifySignature(messageHash, _signature), "Game: Invalid claim signature");

        user.claimNonce++;
        user.totalClaimed += _amount;
        user.lastClaimTimestamp = block.timestamp; 

        bool success = token.transfer(msg.sender, _amount);
        require(success, "Game: Token transfer failed");

        emit TokensClaimed(fid, msg.sender, _amount, _nonce);
    }

    function setMaxClaimsPerCycle(uint256 _newLimit) external onlyOwner {
        require(_newLimit > 0, "Game: Max claims must be greater than zero");
        maxClaimsPerCycle = _newLimit;
        emit MaxClaimsChanged(_newLimit);
    }
    
    function sendReward(address _user, address[] calldata _recipients, uint256 _totalAmount) external onlyOwner {
        uint256 recipientCount = _recipients.length;
        require(recipientCount > 0, "Game: Recipient list cannot be empty");
        require(_user != address(0), "Game: User cannot be the zero address");
        require(token.balanceOf(_user) >= _totalAmount, "Game: Insufficient user balance");
        require(token.allowance(_user, address(this)) >= _totalAmount, "Game: Insufficient allowance");
        uint256 amountPerRecipient = _totalAmount / recipientCount;
        require(amountPerRecipient > 0, "Game: Total amount too small for distribution");
        for (uint i = 0; i < recipientCount; i++) {
            address recipient = _recipients[i];
            if (recipient != address(0)) {
                bool success = token.transferFrom(_user, recipient, amountPerRecipient);
                require(success, "Game: Reward transfer failed");
            }
        }
        emit RewardsSent(_user, _totalAmount, recipientCount);
    }
    function deleteUserProfile(uint256 _fid, address[] calldata _wallets) external onlyOwner {
        require(userProfiles[_fid].isRegistered, "Game: FID is not registered");
        for (uint256 i = 0; i < _wallets.length; i++) {
            address wallet = _wallets[i];
            if (walletToFid[wallet] == _fid) {
                delete walletToFid[wallet];
                delete isWalletForFid[_fid][wallet];
            }
        }
        uint256 indexToRemove = fidIndex[_fid];
        uint256 lastFid = registeredFids[registeredFids.length - 1];
        registeredFids[indexToRemove] = lastFid;
        fidIndex[lastFid] = indexToRemove;
        registeredFids.pop();
        delete fidIndex[_fid];
        delete userProfiles[_fid];
        emit UserDeleted(_fid);
    }
    function setSignerAddress(address _newSignerAddress) external onlyOwner {
        require(_newSignerAddress != address(0), "Game: New signer cannot be the zero address");
        serverSignerAddress = _newSignerAddress;
        emit SignerAddressChanged(_newSignerAddress);
    }
    function withdrawTokens(uint256 _amount) external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance >= _amount, "Game: Not enough tokens in contract");
        bool success = token.transfer(owner(), _amount);
        require(success, "Game: Withdrawal failed");
    }
    function _buildRegistrationHash(uint256 _fid, address[] calldata _wallets) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), "REGISTER", _fid, keccak256(abi.encode(_wallets))));
    }
    function _buildClaimHash(uint256 _fid, uint256 _amount, uint256 _nonce) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), "CLAIM", _fid, _amount, _nonce));
    }
    function _verifySignature(bytes32 _hash, bytes memory _signature) private view returns (bool) {
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
        );
        address recoveredSigner = ethSignedMessageHash.recover(_signature);
        return recoveredSigner == serverSignerAddress;
    }

    function getUserProfile(uint256 _fid) external view returns (UserProfile memory) {
        UserProfile storage user = userProfiles[_fid];
        return UserProfile({
            isRegistered: user.isRegistered,
            registrationDate: user.registrationDate,
            lastClaimTimestamp: user.lastClaimTimestamp,
            claimNonce: user.claimNonce,
            totalClaimed: user.totalClaimed,
            claimsInCurrentCycle: user.claimsInCurrentCycle
        });
    }
    
    function getNumberOfUsers() external view returns (uint256) {
        return registeredFids.length;
    }
    function getContractTokenBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
    function getSignerAddress() external view returns (address) {
        return serverSignerAddress;
    }
    function getTokenAddress() external view returns (address) {
        return address(token);
    }
}