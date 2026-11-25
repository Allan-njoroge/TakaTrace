// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title  TakaTrace - tamper-proof recycling weigh-in receipts (SDG 12.5)
/// @notice The full weigh-in record (picker ID, plastic type, kg, date) stays in
///         Google Sheets. Only its "fingerprint" (hash) is stored here, so:
///         1) anyone can check that a record was not edited later, and
///         2) each recycling credit can be claimed by ONE brand only.
contract TakaTrace {

    // ---------------------------------------------------------------
    // DATA
    // ---------------------------------------------------------------

    /// One weigh-in receipt as stored on the blockchain.
    struct Receipt {
        bytes32 dataHash;   // fingerprint of the full off-chain record
        address recordedBy; // wallet of the buying centre that recorded it
        uint256 recordedAt; // time recorded (seconds since 1 Jan 1970)
        bool    claimed;    // has a brand already claimed this credit?
        address claimedBy;  // the brand that claimed it
    }

    address public admin;                            // e.g. the PRO or NEMA in our demo
    mapping(address => bool) public isBuyingCentre;  // approved buying centres
    mapping(address => bool) public isBrand;         // approved brands (producers)
    mapping(string => Receipt) private receipts;     // receipt ID -> receipt
    mapping(string => bool) public isDisputed;       // receipt ID -> claims blocked?

    // Events are public "announcements" that the website can listen for.
    event BuyingCentreAdded(address centre);
    event BrandAdded(address brand);
    event BuyingCentreRemoved(address centre);
    event BrandRemoved(address brand);
    event ReceiptRecorded(string receiptId, bytes32 dataHash, address centre);
    event CreditClaimed(string receiptId, address brand);
    event DisputeFlagChanged(string receiptId, bool disputed, address changedBy);

    // ---------------------------------------------------------------
    // ACCESS RULES (who is allowed to do what)
    // ---------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only the admin can do this");
        _;
    }

    modifier onlyBuyingCentre() {
        require(isBuyingCentre[msg.sender], "Only an approved buying centre can do this");
        _;
    }

    modifier onlyBrand() {
        require(isBrand[msg.sender], "Only an approved brand can do this");
        _;
    }

    /// Runs once, when the contract is deployed. The deployer becomes admin.
    constructor() {
        admin = msg.sender;
    }

    // ---------------------------------------------------------------
    // ADMIN: register participants
    // ---------------------------------------------------------------

    function addBuyingCentre(address centre) external onlyAdmin {
        isBuyingCentre[centre] = true;
        emit BuyingCentreAdded(centre);
    }

    function addBrand(address brand) external onlyAdmin {
        isBrand[brand] = true;
        emit BrandAdded(brand);
    }

    /// Suspend a buying centre: it can no longer record new receipts.
    /// Receipts it already recorded keep their history.
    function removeBuyingCentre(address centre) external onlyAdmin {
        isBuyingCentre[centre] = false;
        emit BuyingCentreRemoved(centre);
    }

    /// Suspend a brand: it can no longer claim new credits.
    function removeBrand(address brand) external onlyAdmin {
        isBrand[brand] = false;
        emit BrandRemoved(brand);
    }

    // ---------------------------------------------------------------
    // DISPUTES: block or unblock a claim while a report is investigated
    // ---------------------------------------------------------------

    /// The recording centre (or the admin) can flag a receipt as disputed,
    /// which blocks claimCredit until it is unflagged. A receipt already
    /// claimed can't be put under dispute (the claim already happened).
    function setDisputed(string calldata receiptId, bool disputed) external {
        Receipt storage r = receipts[receiptId];
        require(r.recordedAt != 0, "Receipt does not exist");
        require(msg.sender == admin || msg.sender == r.recordedBy, "Only admin or recording centre");
        require(!r.claimed, "Credit already claimed");
        isDisputed[receiptId] = disputed;
        emit DisputeFlagChanged(receiptId, disputed, msg.sender);
    }

    // ---------------------------------------------------------------
    // HELPER: make a fingerprint (free to call, stores nothing)
    // ---------------------------------------------------------------

    /// Turns a record like "TT-0001|P-017|PET|50|2026-11-10" into a hash.
    /// Changing even one character gives a completely different hash.
    function makeHash(string calldata recordText) external pure returns (bytes32) {
        return keccak256(bytes(recordText));
    }

    // ---------------------------------------------------------------
    // BUYING CENTRE: record a weigh-in
    // ---------------------------------------------------------------

    function recordReceipt(string calldata receiptId, bytes32 dataHash)
        external
        onlyBuyingCentre
    {
        require(receipts[receiptId].recordedAt == 0, "This receipt ID is already used");
        require(dataHash != bytes32(0), "Hash cannot be empty");

        receipts[receiptId] = Receipt({
            dataHash:   dataHash,
            recordedBy: msg.sender,
            recordedAt: block.timestamp,
            claimed:    false,
            claimedBy:  address(0)
        });

        emit ReceiptRecorded(receiptId, dataHash, msg.sender);
    }

    // ---------------------------------------------------------------
    // ANYONE: verify a record has not been edited
    // ---------------------------------------------------------------

    /// Paste the record exactly as it appears in Google Sheets today.
    /// Returns true if it matches what was recorded, false if it was changed.
    function verifyReceipt(string calldata receiptId, string calldata recordText)
        external
        view
        returns (bool)
    {
        Receipt storage r = receipts[receiptId];
        require(r.recordedAt != 0, "Receipt does not exist");
        return r.dataHash == keccak256(bytes(recordText));
    }

    // ---------------------------------------------------------------
    // BRAND: claim the recycling credit (only once!)
    // ---------------------------------------------------------------

    function claimCredit(string calldata receiptId) external onlyBrand {
        Receipt storage r = receipts[receiptId];
        require(r.recordedAt != 0, "Receipt does not exist");
        require(!r.claimed, "Credit already claimed by another brand");
        require(!isDisputed[receiptId], "Receipt is under dispute");

        r.claimed = true;
        r.claimedBy = msg.sender;

        emit CreditClaimed(receiptId, msg.sender);
    }

    // ---------------------------------------------------------------
    // ANYONE: read a receipt
    // ---------------------------------------------------------------

    function getReceipt(string calldata receiptId)
        external
        view
        returns (
            bytes32 dataHash,
            address recordedBy,
            uint256 recordedAt,
            bool claimed,
            address claimedBy
        )
    {
        Receipt storage r = receipts[receiptId];
        require(r.recordedAt != 0, "Receipt does not exist");
        return (r.dataHash, r.recordedBy, r.recordedAt, r.claimed, r.claimedBy);
    }
}
