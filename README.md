# NoxGuard — Confidential Audit Escrow Protocol

> Trustless bug bounty escrow where reward amounts stay encrypted until settlement.

## Problem

Bug bounty platforms today have two critical trust gaps:

1. **Hunters see reward amounts** — they cherry-pick programs by payout, not by code quality or vulnerability impact
2. **Projects must reveal budgets** — competitors and attackers can see how much a project values its security

NoxGuard solves both by making bounty rewards confidential using Nox Protocol's Fully Homomorphic Encryption (FHE).

## How It Works

1. **Project owner** deposits confidential tokens (cRLC/cUSDC) as bounty reward — amount is encrypted on-chain
2. **Hunter** submits a finding with a commit hash of their report
3. **Project owner** reviews the finding off-chain, then approves with an encrypted payout amount
4. **Settlement** happens on-chain — the hunter receives confidential tokens, amount hidden from everyone else
5. **Hunter** can unwrap confidential tokens to regular ERC-20 whenever they want

All reward amounts remain encrypted throughout the entire lifecycle. Nobody except the project owner and the receiving hunter knows how much was paid.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  NoxGuard dApp                   │
│  ┌───────────┐ ┌───────────┐ ┌───────────────┐  │
│  │  Project   │ │  Hunter   │ │  ChainGPT     │  │
│  │  Owner UI  │ │  UI       │ │  Quality Gate │  │
│  └─────┬─────┘ └─────┬─────┘ └───────┬───────┘  │
│        │              │               │          │
│  ┌─────▼──────────────▼───────────────▼───────┐  │
│  │           Nox JS SDK (@iexec-nox/handle)   │  │
│  │     encrypt / decrypt / encryptInput       │  │
│  └─────────────────┬──────────────────────────┘  │
│                    │                             │
└────────────────────┼─────────────────────────────┘
                     │
        ┌────────────▼────────────────┐
        │   NoxGuardEscrow.sol        │
        │   (Arbitrum Sepolia)        │
        │                             │
        │   createBounty()            │
        │   submitFinding()           │
        │   approveFinding()          │
        │   closeBounty()             │
        └────────────┬────────────────┘
                     │
        ┌────────────▼────────────────┐
        │   ERC-7984 Confidential     │
        │   Token (cRLC / cUSDC)      │
        │   Nox Protocol (FHE + TEE)  │
        └─────────────────────────────┘
```

## Tech Stack

- **Smart Contract:** Solidity ^0.8.28, ERC-7984, Nox SDK
- **Frontend:** React + Viem + Tailwind CSS
- **Encryption:** Nox JS SDK (`@iexec-nox/handle`)
- **AI Quality Gate:** ChainGPT API (smart contract audit + report validation)
- **Network:** Arbitrum Sepolia (Testnet)
- **Token:** cRLC (Confidential RLC) from iExec faucet

## Quick Start

### Prerequisites
- Node.js 18+
- MetaMask or WalletConnect-compatible wallet
- Arbitrum Sepolia ETH (for gas)
- cRLC tokens (get from https://cdefi.iex.ec/)

### Installation

```bash
# Clone the repo
git clone https://github.com/xnotok-ops/noxguard.git
cd noxguard

# Install frontend dependencies
cd frontend
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### Smart Contract Deployment

The contract is deployed on Arbitrum Sepolia at: `[CONTRACT_ADDRESS]`

To deploy your own:
```bash
# Using Remix IDE
# 1. Open contracts/NoxGuardEscrow.sol in Remix
# 2. Set compiler to 0.8.28
# 3. Connect to Arbitrum Sepolia via Injected Provider
# 4. Deploy
```

## Usage Flow

### As a Project Owner
1. Connect wallet on Arbitrum Sepolia
2. Get cRLC from faucet (https://cdefi.iex.ec/)
3. Set NoxGuard contract as operator on cRLC
4. Create a bounty — specify title, scope, and encrypted reward amount
5. Review submitted findings
6. Approve findings with encrypted payout amounts

### As a Bug Hunter
1. Connect wallet on Arbitrum Sepolia
2. Browse active bounties (reward amounts are hidden)
3. Submit findings with a report hash
4. Receive encrypted payout when approved
5. Unwrap cRLC to RLC whenever ready

## Key Features

- **Hidden Bounty Amounts** — Reward pool encrypted via Nox FHE
- **Trustless Settlement** — On-chain escrow, no intermediary
- **Commit-Reveal Reports** — Finding hash committed first, full report revealed after payment
- **Selective Disclosure** — Project owners can grant auditors view access to escrow balance
- **AI Quality Gate** — ChainGPT validates report structure before escrow processing
- **ERC-7984 Compliant** — Uses the official confidential token standard

## Project Structure

```
noxguard/
├── contracts/
│   └── NoxGuardEscrow.sol      # Core escrow contract
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main application
│   │   ├── components/         # UI components
│   │   ├── hooks/              # Custom React hooks
│   │   └── utils/              # Contract ABIs & helpers
│   └── package.json
├── feedback.md                 # iExec tools feedback
└── README.md
```

## License

MIT

## Built For

[iExec Vibe Coding Challenge](https://dorahacks.io/hackathon/vibe-coding-iexec/detail) — May 2026

Built with Nox Protocol, ERC-7984 Confidential Tokens, and ChainGPT.
