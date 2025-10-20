// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


contract PowerUpContract is Ownable {
    using ECDSA for bytes32;

    address private serverSignerAddress;
    uint256 public powerUpDepositAmount;
    mapping(uint256 => uint256) public powerUpNonce; // FID => nonce

    event PowerUpActivated(uint256 indexed fid, address indexed userAddress, uint256 amount, uint256 nonce);
    event PowerUpDepositAmountChanged(uint256 newAmount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event SignerAddressChanged(address indexed newSigner);

    constructor(
        uint256 _initialDepositAmount,
        address _initialOwner,
        address _signerAddress
    ) Ownable(_initialOwner) {
        require(_initialDepositAmount > 0, "Initial deposit amount must be greater than zero");
        require(_signerAddress != address(0), "Signer address cannot be the zero address");
        powerUpDepositAmount = _initialDepositAmount;
        serverSignerAddress = _signerAddress;
    }

    function activatePowerUp(uint256 _fid, uint256 _nonce, bytes memory _signature) external payable {
        require(_fid != 0, "FID cannot be zero");
        require(msg.value == powerUpDepositAmount, "Incorrect deposit amount sent");
        require(_nonce == powerUpNonce[_fid], "Invalid nonce");

        bytes32 messageHash = _buildActivationHash(_fid, _nonce);
        require(_verifySignature(messageHash, _signature), "Invalid signature");

        powerUpNonce[_fid]++;
        emit PowerUpActivated(_fid, msg.sender, msg.value, _nonce);
    }


    function setPowerUpDepositAmount(uint256 _newAmount) external onlyOwner {
        require(_newAmount > 0, "Deposit amount must be greater than zero");
        powerUpDepositAmount = _newAmount;
        emit PowerUpDepositAmountChanged(_newAmount);
    }

    function setSignerAddress(address _newSignerAddress) external onlyOwner {
        require(_newSignerAddress != address(0), "New signer cannot be the zero address");
        serverSignerAddress = _newSignerAddress;
        emit SignerAddressChanged(_newSignerAddress);
    }

    function withdrawFunds(address payable _to) external onlyOwner {
        require(_to != address(0), "Cannot withdraw to the zero address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = _to.call{value: balance}("");
        require(success, "Fund transfer failed");
        emit FundsWithdrawn(_to, balance);
    }

    function withdrawMistakenlySentTokens(address _tokenAddress, address _to) external onlyOwner {
        require(_tokenAddress != address(0), "Token address cannot be the zero address");
        require(_to != address(0), "Cannot withdraw to the zero address");
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens of this type to withdraw");
        bool success = token.transfer(_to, balance);
        require(success, "Token withdrawal failed");
    }

    function _buildActivationHash(uint256 _fid, uint256 _nonce) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), "ACTIVATE_POWERUP", _fid, _nonce));
    }

    function _verifySignature(bytes32 _hash, bytes memory _signature) private view returns (bool) {
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _hash)
        );
        address recoveredSigner = ethSignedMessageHash.recover(_signature);
        return recoveredSigner == serverSignerAddress;
    }

    function getSignerAddress() external view returns (address) {
        return serverSignerAddress;
    }
}
