// NoxGuard Contract Address on Arbitrum Sepolia
// UPDATE THIS after deployment
export const NOXGUARD_ADDRESS = "0x6f3156ae13890ad2110e5041ac218230ef483d45"; // TODO: paste full address

// cRLC token on Arbitrum Sepolia (from cdefi.iex.ec)
export const CRLC_ADDRESS = "0x92B23f4A59175415ced5CB37e64a1FC6A9D79af4"; // TODO: verify from cdefi.iex.ec

// Arbitrum Sepolia chain config
export const CHAIN_CONFIG = {
  id: 421614,
  name: "Arbitrum Sepolia",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  blockExplorer: "https://sepolia.arbiscan.io",
};

// NoxGuardEscrow ABI
export const NOXGUARD_ABI = [
  // Constructor
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  // createBounty
  {
    type: "function",
    name: "createBounty",
    inputs: [
      { name: "token", type: "address", internalType: "contract IERC7984" },
      { name: "encryptedReward", type: "bytes32", internalType: "externalEuint256" },
      { name: "inputProof", type: "bytes", internalType: "bytes" },
      { name: "title", type: "string", internalType: "string" },
      { name: "scope", type: "string", internalType: "string" },
    ],
    outputs: [{ name: "bountyId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  // closeBounty
  {
    type: "function",
    name: "closeBounty",
    inputs: [{ name: "bountyId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // submitFinding
  {
    type: "function",
    name: "submitFinding",
    inputs: [
      { name: "bountyId", type: "uint256", internalType: "uint256" },
      { name: "reportHash", type: "bytes32", internalType: "bytes32" },
    ],
    outputs: [{ name: "findingId", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  // revealReport
  {
    type: "function",
    name: "revealReport",
    inputs: [
      { name: "bountyId", type: "uint256", internalType: "uint256" },
      { name: "findingId", type: "uint256", internalType: "uint256" },
      { name: "reportURI", type: "string", internalType: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // approveFinding
  {
    type: "function",
    name: "approveFinding",
    inputs: [
      { name: "bountyId", type: "uint256", internalType: "uint256" },
      { name: "findingId", type: "uint256", internalType: "uint256" },
      { name: "encryptedPayout", type: "bytes32", internalType: "externalEuint256" },
      { name: "inputProof", type: "bytes", internalType: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // rejectFinding
  {
    type: "function",
    name: "rejectFinding",
    inputs: [
      { name: "bountyId", type: "uint256", internalType: "uint256" },
      { name: "findingId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // getBounty (view)
  {
    type: "function",
    name: "getBounty",
    inputs: [{ name: "bountyId", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "creator", type: "address", internalType: "address" },
      { name: "token", type: "address", internalType: "address" },
      { name: "title", type: "string", internalType: "string" },
      { name: "scope", type: "string", internalType: "string" },
      { name: "findingCount", type: "uint256", internalType: "uint256" },
      { name: "status", type: "uint8", internalType: "enum NoxGuardEscrow.BountyStatus" },
    ],
    stateMutability: "view",
  },
  // getFinding (view)
  {
    type: "function",
    name: "getFinding",
    inputs: [
      { name: "bountyId", type: "uint256", internalType: "uint256" },
      { name: "findingId", type: "uint256", internalType: "uint256" },
    ],
    outputs: [
      { name: "hunter", type: "address", internalType: "address" },
      { name: "reportHash", type: "bytes32", internalType: "bytes32" },
      { name: "reportURI", type: "string", internalType: "string" },
      { name: "status", type: "uint8", internalType: "enum NoxGuardEscrow.FindingStatus" },
    ],
    stateMutability: "view",
  },
  // bountyCount (view)
  {
    type: "function",
    name: "bountyCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
  },
  // owner (view)
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  // Events
  {
    type: "event",
    name: "BountyCreated",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "token", type: "address", indexed: false },
      { name: "title", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BountyClosed",
    inputs: [{ name: "bountyId", type: "uint256", indexed: true }],
  },
  {
    type: "event",
    name: "FindingSubmitted",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "findingId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
      { name: "reportHash", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FindingApproved",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "findingId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "FindingRejected",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "findingId", type: "uint256", indexed: true },
    ],
  },
  // Errors
  { type: "error", name: "NotBountyCreator", inputs: [] },
  { type: "error", name: "BountyNotActive", inputs: [] },
  { type: "error", name: "FindingNotSubmitted", inputs: [] },
  { type: "error", name: "CannotSubmitToOwnBounty", inputs: [] },
  { type: "error", name: "BountyDoesNotExist", inputs: [] },
];

// ERC-7984 (Confidential Token) ABI - minimal for operator + transfer
export const ERC7984_ABI = [
  {
    type: "function",
    name: "setOperator",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isOperator",
    inputs: [
      { name: "holder", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "confidentialTransfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "confidentialTransferFrom",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
];
