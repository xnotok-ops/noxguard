# Feedback on iExec Developer Tools

## Overview

This document provides feedback on the iExec tools used while building NoxGuard during the iExec Vibe Coding Challenge.

## Tools Used

### 1. Nox Protocol SDK (Solidity)
**Package:** `@iexec-nox/nox-protocol-contracts`

**What worked well:**
- The `Nox.fromExternal()` + `Nox.allowTransient()` pattern is intuitive once you understand the flow
- ERC-7984 base contract handles encrypted balances, transfers, and operators seamlessly
- `Nox.sub()` silent zero on insufficient balance is a clever design — prevents balance leaks from reverts

**Pain points:**
- Initial learning curve is steep — took several attempts to understand the handle lifecycle
- Gas estimation is unreliable for Nox operations — had to manually set gas limits
- Error messages from Nox protocol are not descriptive — `revert` without context makes debugging difficult
- Would be helpful to have a "common patterns" doc with tested Solidity patterns for escrow, auction, etc.

### 2. Nox JS SDK
**Package:** `@iexec-nox/handle`

**What worked well:**
- `createViemHandleClient` integration with Viem is clean
- `encryptInput` API is straightforward
- EIP-712 signature flow for decryption is gasless — good UX

**Pain points:**
- Documentation for JS SDK is still sparse — many methods lack full examples
- Error handling could be improved — network errors vs. encryption errors are hard to distinguish
- Would benefit from TypeScript types being more descriptive

### 3. Confidential Token Demo / Faucet (cdefi.iex.ec)
**What worked well:**
- Great onboarding tool — helped understand wrap/unwrap/transfer flow visually
- Faucet providing both test ERC-20 and wrapped confidential tokens saved time
- Delegated View page clearly shows ACL grants and their status

**Pain points:**
- Getting Arbitrum Sepolia ETH for gas was the hardest part of the entire journey — most faucets were dry or required mainnet balance
- Would be very helpful if the cdefi faucet also provided Sepolia ETH, not just ERC-20 tokens

### 4. Nox Contracts Wizard (cdefi-wizard.iex.ec)
**What worked well:**
- Excellent for generating ERC-7984 boilerplate — similar to OpenZeppelin wizard
- Feature toggles (confidential mint/burn, pausable, access control) generate correct code

**Suggestions:**
- Add an "Escrow" or "Vault" template — these are common patterns beyond just tokens
- Add "Open in Hardhat" option alongside Remix
- Show estimated deployment gas cost

### 5. Hello World Journey
**What worked well:**
- Step-by-step tutorial successfully got me from zero to deployed confidential contract
- NOX SDK Playground for encrypt/decrypt is very useful

**Suggestions:**
- The tutorial assumes familiarity with Remix — a Hardhat/Foundry path would help experienced devs
- Add a "Next: Build an Escrow" tutorial after Hello World

## General Suggestions

1. **Improve testnet access** — partner with a faucet provider or run your own faucet for Arbitrum Sepolia ETH
2. **More example contracts** — escrow, auction, DAO voting, payroll are all natural fits for confidential computing
3. **Gas estimation** — provide utilities or documentation for estimating gas costs of Nox operations
4. **Developer community** — the Discord was helpful but sparse; more active community support would accelerate builder adoption

## Summary

The iExec Nox tooling is impressive for a new protocol. The core primitives (encrypt, compute, decrypt) work as advertised and enable genuinely novel use cases. The main friction is in the developer experience around gas handling, error messages, and documentation completeness. With improved DX, Nox has strong potential to become the default privacy layer for DeFi applications.
