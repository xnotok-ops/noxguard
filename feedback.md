# Feedback on iExec Developer Tools

Built during the **iExec Vibe Coding Challenge 2026** while developing [NoxGuard](./README.md) — a confidential bug bounty escrow on Arbitrum Sepolia.

This document is honest, actionable feedback for the iExec team. We hit real walls building this dApp; sharing them here so the next builder doesn't.

---

## TL;DR — The 5 Things That Would Help Most

1. **Document `encryptInput` more thoroughly in the JS SDK** — see [Issue 1](#1-encryptinput-signature-was-not-discoverable) below. We lost ~2 hours to a parameter ordering issue.
2. **Add a "Common Patterns" cookbook** for Nox Solidity contracts (escrow, vault, auction, vesting). Right now developers are reverse-engineering from `IConfidentialFungibleToken.sol`.
3. **Add Sepolia ETH to the `cdefi.iex.ec` faucet** — getting cRLC was easier than getting gas.
4. **Improve error messages from the Nox protocol contracts** — generic `revert` makes debugging painful.
5. **TypeScript types should be more descriptive** for `@iexec-nox/handle` return shapes (`handle` vs `handleProof` is currently confusing).

---

## 1. Nox Solidity SDK

**Package:** `@iexec-nox/nox-protocol-contracts`

### What worked well

- The `Nox.fromExternal()` + `Nox.allowTransient()` pattern is intuitive once you understand the handle lifecycle. The mental model "encrypted handle = pointer to ciphertext, ACL is separate" clicks pretty fast.
- ERC-7984 base contract handles encrypted balances, transfers, and operators seamlessly. We didn't have to think about FHE primitives at all in the escrow contract — we just composed `confidentialTransferFrom` calls.
- `Nox.sub()` silent zero on insufficient balance is a clever design — prevents balance leaks via revert side-channels. Most developers won't appreciate this until they try to write it themselves.

### Pain points

- **Steep initial learning curve.** Took several attempts to understand: when do I call `Nox.fromExternal`? Do I need to `allowTransient` the spender or the operator? Where does the proof go? A diagram of the handle/proof/ACL lifecycle in the docs would save hours.
- **Gas estimation is unreliable.** We had to manually set `maxFeePerGas: 1000000000n` (1 gwei) on Arbitrum Sepolia because automatic estimation kept producing values below the base fee. Real error we hit:
  ```
  max fee per gas less than block base fee:
    maxFeePerGas: 20016000  baseFee: 20032000
  ```
  The docs do not warn about this, and the SDK's default suggested gas was the value that failed.
- **Error messages are not descriptive.** A revert without a reason string from inside Nox precompiles or the protocol contracts gives the developer almost nothing to work with. Even a `revert NoxError(uint8 code)` with documented codes would be a huge improvement over plain `revert`.
- **No "common patterns" cookbook.** We needed to build an escrow that:
  1. Holds an encrypted reward
  2. Allows a single approved hunter to receive an encrypted (possibly different) payout
  3. Supports closing the bounty by the owner
  
  None of these patterns are in any iExec repo. We had to invent the pattern from first principles, and we're not sure if the way we structured it (operator approval + transient allowance per payout) is the canonical recommendation.

### Suggestions

- Add a `nox-cookbook` repo with audited reference implementations: `EncryptedEscrow`, `EncryptedVesting`, `EncryptedAuction`, `EncryptedVault`.
- Document gas estimation gotchas per chain (Arbitrum Sepolia, Sepolia mainnet, etc.).
- Replace generic `revert` in the protocol contracts with custom errors that include error codes the SDK can translate to human-readable messages.

---

## 2. Nox JS SDK

**Package:** `@iexec-nox/handle`

### What worked well

- `createViemHandleClient` integration with Viem is clean. We dropped it next to our existing `walletClient` / `publicClient` and it just worked.
- The `encryptInput` API is straightforward **once you know the signature** — the encryption happens client-side and you get back something you can pass directly to a contract call.
- EIP-712 signature flow for decryption is gasless. Excellent UX for read-side operations.

### Pain points

#### 1. `encryptInput` signature was not discoverable

This was the single biggest blocker we hit. We assumed the function would take an options object (idiomatic JS) and called it like this:

```js
// What we tried first (wrong):
const encrypted = await handleClient.encryptInput({
  value: amount,
  type: 'uint256',
  applicationContract: NOXGUARD_ADDRESS,
});
```

The error message was:

```
Missing required parameters: applicationContract
```

This is misleading — we **did** pass `applicationContract`. The actual issue is that `encryptInput` uses **positional arguments**, not an object:

```js
// Correct:
const encrypted = await handleClient.encryptInput(BigInt(amount), 'uint256', NOXGUARD_ADDRESS);
```

We only figured this out by reading the SDK source. Two suggestions:

1. **Either the API or the error message must change.** Change to options object (more idiomatic), or improve the error message to say *"encryptInput expects positional arguments: (value, solidityType, applicationContract)"*.
2. **Document the supported `solidityType` values explicitly.** We had to read source to learn it accepts `'bool', 'uint16', 'uint256', 'int16', 'int256'`. Anything else throws a vague error.

#### 2. Return shape inconsistency: `handleProof` vs `inputProof`

The SDK returns `{ handle, handleProof }`:

```js
const encrypted = await handleClient.encryptInput(...);
console.log(encrypted.handle, encrypted.handleProof);  // ✅
```

But almost every Solidity-side example we found (including in older Zama FHEVM tutorials that share lineage) uses the variable name `inputProof`:

```solidity
function createBounty(externalEuint256 reward, bytes calldata inputProof) external {
    euint256 amount = FHE.fromExternal(reward, inputProof);  // <-- this naming is everywhere
}
```

So a developer following Zama-era patterns will write JS like:

```js
contract.createBounty([encrypted.handle, encrypted.inputProof]);  // ❌ undefined!
```

…and get a confusing `Cannot read properties of undefined (reading 'length')` error from Viem when it tries to encode `undefined` as `bytes`.

**Suggestion:** Either rename to `inputProof` for consistency with the wider FHE / FHEVM ecosystem, or document this divergence prominently.

#### 3. Documentation gaps

Many methods on `handleClient` lack examples in the public docs. A complete reference page like:

```
handleClient.encryptInput(value, solidityType, applicationContract)
  → Returns: { handle: bytes32, handleProof: bytes }
  → Throws: if solidityType is not in [bool, uint16, uint256, int16, int256]
  → Example: ...
```

…with one entry per public method, would let developers stop reading SDK source.

#### 4. TypeScript types could be more descriptive

`handle` and `handleProof` come back as `bytes32 | string` and `bytes | string` in some signatures. Branded types (e.g. `EncryptedHandle`, `EncryptedHandleProof`) would prevent the kind of variable-naming bugs described above.

---

## 3. Confidential Token Demo / Faucet (cdefi.iex.ec)

### What worked well

- **Best onboarding tool you have.** Visualizing wrap → confidential balance → unwrap was the moment "FHE on-chain" stopped being abstract.
- The Delegated View page clearly showing ACL grants and statuses is exactly what developers need to understand operator/transient permissions.
- Faucet providing both ERC-20 and pre-wrapped confidential tokens saved real time.

### Pain points

- **Sepolia ETH faucets are dry or gated.** Getting Arbitrum Sepolia ETH for gas was the single hardest part of the entire build. Most public faucets require mainnet balance, which is a chicken-and-egg problem for new builders. We ended up bouncing between Alchemy, Chainlink, and a few backup faucets to cobble together enough gas. **If `cdefi.iex.ec` faucet also dispensed Sepolia ETH (even 0.005 per drip), it would dramatically lower the barrier to entry.**

### Suggestions

- Add Sepolia ETH dripper to `cdefi.iex.ec`. Even rate-limited.
- Add a "test scenario" mode where the faucet pre-funds a wallet with everything needed for a typical hackathon flow (ETH + cRLC + maybe cUSDC).

---

## 4. Nox Contracts Wizard (cdefi-wizard.iex.ec)

### What worked well

- Excellent for generating ERC-7984 boilerplate — feels just like the OpenZeppelin wizard, which is exactly the right reference.
- Feature toggles (confidential mint/burn, pausable, access control) generate correct, idiomatic code.
- The "Open in Remix" button is the right default for hackathon builders.

### Suggestions

- **Add an "Escrow" or "Vault" template.** These are the two most common patterns once you go beyond just tokens. We had to write `NoxGuardEscrow.sol` from scratch; a templated starting point would have saved a day.
- **Add "Open in Hardhat" / "Open in Foundry" options** alongside Remix. Most production teams use one of these.
- **Show estimated deployment gas cost** at the bottom of the wizard. Helps developers budget their faucet drip usage.
- **Add a "Token + Escrow paired template"** — generates an ERC-7984 token AND an escrow that uses it as the reward token, both ready to deploy.

---

## 5. Real-World Issues We Hit (Bug Tour)

For every issue below, we lost real hours. Sharing as actionable feedback:

| # | Issue | Time Lost | What Would Have Helped |
|---|-------|-----------|------------------------|
| 1 | `encryptInput` positional args, vague error | ~2h | Better error message OR options-object API |
| 2 | Arbitrum Sepolia gas estimation produces values below base fee | ~30m | Docs note + per-chain default overrides in SDK |
| 3 | `handleProof` vs `inputProof` naming inconsistency with Solidity examples | ~45m | Rename or prominent doc warning |
| 4 | React component re-rendering caused infinite handle-client recreation loop (not iExec's fault, but the SDK could memoize) | ~2h | SDK could cache `createViemHandleClient` instances by `walletClient` identity |
| 5 | Multi-wallet conflict (Tally Ho, Razor, Backpack injecting `window.ethereum`) | ~30m | Wallet selection UX guidance in iExec dApp template |

---

## 6. What iExec Got Right

To balance the criticism — these are things we'd ask other FHE/TEE platforms to copy:

- **ERC-7984 as the standard token interface.** Building on a standard means we didn't have to learn an iExec-specific token API. This will pay off massively as the ecosystem grows.
- **Viem-first JS SDK.** Picking the modern Ethereum tooling baseline (instead of ethers v5) shows the team knows their audience.
- **The `cdefi.iex.ec` UI is genuinely good.** Most blockchain demos feel unfinished. This one feels like a real product, and that confidence transfers to builders.
- **The Vibe Coding Challenge format itself.** Time-boxed, focused, with real testnet infrastructure ready. We finished a working dApp because the on-ramps were short.

---

## 7. What We Built

For context on whose feedback this is — **NoxGuard** is a fully working confidential bounty escrow:

- **Live on Arbitrum Sepolia:** [`0x6f3156ae13890ad2110e5041ac218230ef483d45`](https://sepolia.arbiscan.io/address/0x6f3156ae13890ad2110e5041ac218230ef483d45)
- **End-to-end verified:** Owner created bounty → Hunter submitted finding → Owner approved & paid → Hunter's encrypted balance handle changed on-chain.
- **Stack:** Solidity 0.8.28 + Nox SDK + React + Viem + `@iexec-nox/handle` + Tailwind.
- **Code:** [github.com/xnotok-ops/noxguard](https://github.com/xnotok-ops/noxguard)

We wrote ~837 lines of React + a full escrow contract in roughly **5 active dev sessions**. That's a strong testament to the iExec stack — and why we want to see the rough edges polished off, because the foundation is solid.

---

## Contact

Built by **Notok Labs** ([@xnotok-ops](https://github.com/xnotok-ops)). Happy to elaborate on any point above — open a GitHub issue or reach out via the iExec Discord.

