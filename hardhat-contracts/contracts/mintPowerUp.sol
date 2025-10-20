// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OZ v5 Imports
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract BlastPowerUpNFT is Ownable, ERC721 {
    using ECDSA for bytes32;

    address private serverSignerAddress;
    uint256 public mintPrice;
    mapping(uint256 => uint256) public powerUpNonce; // FID => nonce
    
    uint256 private _nextTokenId;

    event PowerUpMinted(uint256 indexed fid, address indexed minter, uint256 tokenId, uint256 price);
    event MintPriceChanged(uint256 newPrice);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event SignerAddressChanged(address indexed newSigner);

    constructor(
        uint256 _initialMintPrice,
        address _initialOwner,
        address _signerAddress
    ) ERC721("ENB Blast PowerUp", "BLST") Ownable(_initialOwner) {
        require(_initialMintPrice > 0, "Initial mint price must be greater than zero");
        require(_signerAddress != address(0), "Signer address cannot be the zero address");
        mintPrice = _initialMintPrice;
        serverSignerAddress = _signerAddress;    
        _nextTokenId = 1;
    }

    function mintPowerUp(uint256 _fid, uint256 _nonce, bytes memory _signature) external payable {
        require(_fid != 0, "FID cannot be zero");
        require(msg.value == mintPrice, "Incorrect mint price sent");
        require(_nonce == powerUpNonce[_fid], "Invalid nonce");

        bytes32 messageHash = _buildMintHash(_fid, _nonce);
        require(_verifySignature(messageHash, _signature), "Invalid signature");

        powerUpNonce[_fid]++;
        
        uint256 newTokenId = _nextTokenId;
        _nextTokenId++; 

        _safeMint(msg.sender, newTokenId);
        
        emit PowerUpMinted(_fid, msg.sender, newTokenId, msg.value);
    }

    function setMintPrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Mint price must be greater than zero");
        mintPrice = _newPrice;
        emit MintPriceChanged(_newPrice);
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

    function _buildMintHash(uint256 _fid, uint256 _nonce) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), "MINT_POWERUP_NFT", _fid, _nonce));
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

    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }
}