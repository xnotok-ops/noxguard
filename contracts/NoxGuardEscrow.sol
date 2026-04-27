// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nox, euint256, externalEuint256, ebool} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/interfaces/IERC7984.sol";

/// @title NoxGuard — Confidential Audit Escrow Protocol
/// @notice Trustless escrow for bug bounty programs where reward amounts
///         remain encrypted until settlement. Projects deposit confidential
///         tokens as bounty rewards; hunters submit findings; project owners
///         approve findings and release encrypted payments.
/// @dev Uses ERC-7984 Confidential Tokens via the Nox Protocol.
///      Project owners must call cToken.setOperator(this, until) before
///      creating a bounty so the escrow can pull tokens.

contract NoxGuardEscrow is Ownable {

    // ─── Types ───────────────────────────────────────────────────────

    enum BountyStatus { Active, Closed }
    enum FindingStatus { Submitted, Approved, Rejected }

    struct Bounty {
        address creator;            // project owner
        IERC7984 token;             // confidential token used for reward
        euint256 remainingReward;   // encrypted remaining pool
        string title;               // bounty title
        string scope;               // scope description / IPFS hash
        uint256 findingCount;       // number of findings submitted
        BountyStatus status;
    }

    struct Finding {
        address hunter;             // who submitted
        bytes32 reportHash;         // keccak256 of the report (commit phase)
        string reportURI;           // report URI (reveal phase, can be IPFS)
        FindingStatus status;
    }

    // ─── State ───────────────────────────────────────────────────────

    uint256 public bountyCount;
    mapping(uint256 => Bounty) public bounties;
    mapping(uint256 => mapping(uint256 => Finding)) public findings;

    // ─── Events ──────────────────────────────────────────────────────

    event BountyCreated(
        uint256 indexed bountyId,
        address indexed creator,
        address token,
        string title
    );

    event BountyClosed(uint256 indexed bountyId);

    event FindingSubmitted(
        uint256 indexed bountyId,
        uint256 indexed findingId,
        address indexed hunter,
        bytes32 reportHash
    );

    event FindingApproved(
        uint256 indexed bountyId,
        uint256 indexed findingId,
        address indexed hunter
    );

    event FindingRejected(
        uint256 indexed bountyId,
        uint256 indexed findingId
    );

    // ─── Errors ──────────────────────────────────────────────────────

    error NotBountyCreator();
    error BountyNotActive();
    error FindingNotSubmitted();
    error CannotSubmitToOwnBounty();
    error BountyDoesNotExist();

    // ─── Constructor ─────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── Bounty Management ───────────────────────────────────────────

    /// @notice Create a bounty program with an encrypted reward pool.
    /// @dev Caller must first call token.setOperator(address(this), until)
    ///      to allow the escrow to pull confidential tokens.
    /// @param token The ERC-7984 confidential token for rewards.
    /// @param encryptedReward Encrypted reward amount (from Nox SDK).
    /// @param inputProof Proof of the encrypted input.
    /// @param title Short title for the bounty program.
    /// @param scope Description of what is in scope (or IPFS hash).
    function createBounty(
        IERC7984 token,
        externalEuint256 encryptedReward,
        bytes calldata inputProof,
        string calldata title,
        string calldata scope
    ) external returns (uint256 bountyId) {
        euint256 amount = Nox.fromExternal(encryptedReward, inputProof);

        // Pull tokens from creator to this contract
        Nox.allowTransient(amount, address(token));
        euint256 received = token.confidentialTransferFrom(
            msg.sender, address(this), amount
        );

        bountyId = bountyCount++;
        Bounty storage b = bounties[bountyId];
        b.creator = msg.sender;
        b.token = token;
        b.remainingReward = received;
        b.title = title;
        b.scope = scope;
        b.status = BountyStatus.Active;

        // Allow this contract to operate on the received balance
        Nox.allowThis(b.remainingReward);
        Nox.allow(b.remainingReward, msg.sender);

        emit BountyCreated(bountyId, msg.sender, address(token), title);
    }

    /// @notice Close a bounty program (only creator).
    ///         Remaining funds are returned to the creator.
    /// @param bountyId The bounty to close.
    function closeBounty(uint256 bountyId) external {
        Bounty storage b = bounties[bountyId];
        if (b.creator != msg.sender) revert NotBountyCreator();
        if (b.status != BountyStatus.Active) revert BountyNotActive();

        b.status = BountyStatus.Closed;

        // Return remaining reward to creator
        Nox.allowTransient(b.remainingReward, address(b.token));
        b.token.confidentialTransfer(msg.sender, b.remainingReward);

        emit BountyClosed(bountyId);
    }

    // ─── Finding Submission ──────────────────────────────────────────

    /// @notice Submit a finding for a bounty (commit phase).
    /// @param bountyId The bounty this finding is for.
    /// @param reportHash keccak256 hash of the full report.
    function submitFinding(
        uint256 bountyId,
        bytes32 reportHash
    ) external returns (uint256 findingId) {
        Bounty storage b = bounties[bountyId];
        if (b.creator == address(0)) revert BountyDoesNotExist();
        if (b.status != BountyStatus.Active) revert BountyNotActive();
        if (msg.sender == b.creator) revert CannotSubmitToOwnBounty();

        findingId = b.findingCount++;
        Finding storage f = findings[bountyId][findingId];
        f.hunter = msg.sender;
        f.reportHash = reportHash;
        f.status = FindingStatus.Submitted;

        emit FindingSubmitted(bountyId, findingId, msg.sender, reportHash);
    }

    /// @notice Reveal the report URI after submission (optional, for transparency).
    /// @param bountyId The bounty ID.
    /// @param findingId The finding ID.
    /// @param reportURI URI of the full report (IPFS or URL).
    function revealReport(
        uint256 bountyId,
        uint256 findingId,
        string calldata reportURI
    ) external {
        Finding storage f = findings[bountyId][findingId];
        require(f.hunter == msg.sender, "Not the hunter");
        f.reportURI = reportURI;
    }

    // ─── Finding Resolution ──────────────────────────────────────────

    /// @notice Approve a finding and release encrypted reward to the hunter.
    /// @dev Only the bounty creator can approve. The payout amount is encrypted
    ///      so nobody (except creator and hunter) knows how much was paid.
    /// @param bountyId The bounty ID.
    /// @param findingId The finding ID.
    /// @param encryptedPayout Encrypted payout amount for this finding.
    /// @param inputProof Proof of the encrypted payout.
    function approveFinding(
        uint256 bountyId,
        uint256 findingId,
        externalEuint256 encryptedPayout,
        bytes calldata inputProof
    ) external {
        Bounty storage b = bounties[bountyId];
        Finding storage f = findings[bountyId][findingId];
        if (b.creator != msg.sender) revert NotBountyCreator();
        if (f.status != FindingStatus.Submitted) revert FindingNotSubmitted();

        euint256 payout = Nox.fromExternal(encryptedPayout, inputProof);

        // Deduct from remaining reward (safeSub: silently zeros if insufficient)
        b.remainingReward = Nox.sub(b.remainingReward, payout);
        Nox.allowThis(b.remainingReward);
        Nox.allow(b.remainingReward, msg.sender);

        // Transfer payout to hunter
        Nox.allowTransient(payout, address(b.token));
        b.token.confidentialTransfer(f.hunter, payout);

        f.status = FindingStatus.Approved;

        emit FindingApproved(bountyId, findingId, f.hunter);
    }

    /// @notice Reject a finding (only bounty creator).
    /// @param bountyId The bounty ID.
    /// @param findingId The finding ID.
    function rejectFinding(
        uint256 bountyId,
        uint256 findingId
    ) external {
        Bounty storage b = bounties[bountyId];
        Finding storage f = findings[bountyId][findingId];
        if (b.creator != msg.sender) revert NotBountyCreator();
        if (f.status != FindingStatus.Submitted) revert FindingNotSubmitted();

        f.status = FindingStatus.Rejected;

        emit FindingRejected(bountyId, findingId);
    }

    // ─── View Functions ──────────────────────────────────────────────

    /// @notice Get bounty details.
    function getBounty(uint256 bountyId) external view returns (
        address creator,
        address token,
        string memory title,
        string memory scope,
        uint256 findingCount,
        BountyStatus status
    ) {
        Bounty storage b = bounties[bountyId];
        return (b.creator, address(b.token), b.title, b.scope, b.findingCount, b.status);
    }

    /// @notice Get finding details.
    function getFinding(uint256 bountyId, uint256 findingId) external view returns (
        address hunter,
        bytes32 reportHash,
        string memory reportURI,
        FindingStatus status
    ) {
        Finding storage f = findings[bountyId][findingId];
        return (f.hunter, f.reportHash, f.reportURI, f.status);
    }
}
