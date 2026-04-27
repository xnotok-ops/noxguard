# @iexec-nox/handle

A TypeScript SDK for encrypting, decrypting, and managing confidential values on blockchain using Handles. Works with both ethers and viem.

Handles are 32-byte identifiers that reference encrypted values stored off-chain, enabling privacy-preserving smart contract interactions.

## Installation

```bash
npm install @iexec-nox/handle
```

## Quick Start

### With Ethers

```typescript
import { createEthersHandleClient } from '@iexec-nox/handle';
import { Wallet } from 'ethers';

const signer = new Wallet(privateKey, provider);
const handleClient = await createEthersHandleClient(signer);

// Encrypt a value
const { handle, handleProof } = await handleClient.encryptInput(
  42n,
  'uint256',
  '0x123...abc'
);

// Use handle and handleProof in your smart contract call
await myConfidentialTokenContract.confidentialTransfer(
  toAddress,
  handle,
  handleProof
);

// Get a handle from your smart contract
const balanceHandle =
  await myConfidentialTokenContract.confidentialBalanceOf(accountAddress);

// Decrypt a value from a handle
const { value, solidityType } = await handleClient.decrypt(balanceHandle);
```

### With Viem

```typescript
import { createViemHandleClient } from '@iexec-nox/handle';
import { createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(),
  account: privateKeyToAccount(privateKey),
});

const handleClient = await createViemHandleClient(walletClient);

// Encrypt a value
const { handle, handleProof } = await handleClient.encryptInput(
  42n,
  'uint256',
  '0x123...abc'
);

// Use handle and handleProof in your smart contract call
await myConfidentialTokenContract.confidentialTransfer(
  toAddress,
  handle,
  handleProof
);

// Get a handle from your smart contract
const balanceHandle =
  await myConfidentialTokenContract.confidentialBalanceOf(accountAddress);

// Decrypt a value from a handle
const { value, solidityType } = await handleClient.decrypt(balanceHandle);
```

## Architecture

The SDK provides a unified `HandleClient` that abstracts blockchain interactions through adapters for ethers and viem. It communicates with an off-chain gateway to manage encrypted values while remaining agnostic to specific smart contract implementations.

**Core components:**

- **HandleClient**: Entry point to work with handles, exposing `encryptInput`, `decrypt`, `publicDecrypt`, and `viewACL` methods
- **Blockchain adapters**: Handle wallet signing and chain interactions for ethers or viem
- **Gateway API**: Manages encryption, storage, and retrieval of confidential values
- **Subgraph**: GraphQL access to handle metadata and access control lists (`viewACL`)

## Core API

[Full API Documentation](doc/README.md).

### encryptInput

Encrypts a value and returns a handle for use in smart contracts.

> [!WARNING]
> The SDK aims to support the full `SolidityType` union for encryption. Today, **encryptInput** only accepts the subset implemented by the Nox protocol: `bool`, `uint16`, `uint256`, `int16`, `int256`.

```typescript
const { handle, handleProof } = await handleClient.encryptInput(
  value,
  solidityType,
  applicationContract
);
```

**Parameters:**

| Parameter             | Type                          | Description                                                     |
| --------------------- | ----------------------------- | --------------------------------------------------------------- |
| `value`               | `boolean \| string \| bigint` | The value to encrypt                                            |
| `solidityType`        | `SolidityType`                | Target Solidity type (e.g., `"uint256"`, `"bool"`, `"address"`) |
| `applicationContract` | `string`                      | The address of the contract allowed to use the encrypted value  |

**Returns:** `{ handle: string, handleProof: string }`

- `handle`: bytes32 - reference to the encrypted value
- `handleProof`: bytes - input type proof verifiable by the smart contract

**Security:** Plaintext input is transmitted to the trusted Gateway for encryption over a secure TLS connection.

**Examples:**

```typescript
// Encrypt an unsigned integer
const { handle, handleProof } = await handleClient.encryptInput(
  1000n,
  'uint256',
  '0x123...abc'
);

// Encrypt a boolean
const { handle, handleProof } = await handleClient.encryptInput(
  true,
  'bool',
  '0x123...abc'
);

// Encrypt an address
const { handle, handleProof } = await handleClient.encryptInput(
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2',
  'address',
  '0x123...abc'
);

// Encrypt fixed-size bytes
const { handle, handleProof } = await handleClient.encryptInput(
  '0xdeadbeef',
  'bytes4',
  '0x123...abc'
);
```

### decrypt

Decrypts a handle for an allowed user and returns the original value. Requires an EIP-712 signature.

```typescript
const { value, solidityType } = await handleClient.decrypt(handle);
```

**Parameters:**

| Parameter | Type     | Description                     |
| --------- | -------- | ------------------------------- |
| `handle`  | `string` | The handle (bytes32) to decrypt |

**Returns:** `{ value: JsValue<T>; solidityType: T extends SolidityType }`

- `value`: The decrypted value cast in the JS type (`boolean`|`bigint`|`string`) corresponding to the Solidity type
- `solidityType`: The Solidity type of the value

**Security:** Requires a gasless EIP-712 signature from the authorized user. Uses ECIES with a shared secret encrypted with the user's ephemeral RSA public key to guarantee only the authorized user can decrypt the data.

**Example:**

```typescript
const { value, solidityType } = await handleClient.decrypt(
  '0x7a3b9c8d2e1f0a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b'
);
```

### publicDecrypt

Decrypts a publicly decryptable handle and returns the original value and a decryption proof.

```typescript
const { value, solidityType, decryptionProof } =
  await handleClient.publicDecrypt(handle);
```

**Parameters:**

| Parameter | Type     | Description                                          |
| --------- | -------- | ---------------------------------------------------- |
| `handle`  | `string` | The publicly decryptable handle (bytes32) to decrypt |

**Returns:** `{ value: JsValue<T>; solidityType: T extends SolidityType; decryptionProof: HexString }`

- `value`: The decrypted value cast in the JS type (`boolean`|`bigint`|`string`) corresponding to the Solidity type
- `solidityType`: The Solidity type of the value
- `decryptionProof`: The proof that the value was correctly decrypted, containing the encoded data and a provenance proof verifiable by the smart contract

**Example:**

```typescript
const { value, solidityType, decryptionProof } =
  await handleClient.publicDecrypt(
    '0x7a3b9c8d2e1f0a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b'
  );
```

### viewACL

Returns the access control list for a handle (public flag, admins, viewers) using the configured subgraph.

```typescript
const { isPublic, admins, viewers } = await handleClient.viewACL(handle);
```

**Parameters:**

| Parameter | Type     | Description      |
| --------- | -------- | ---------------- |
| `handle`  | `string` | Handle (bytes32) |

**Returns:** `ACL`

- `isPublic`: Whether the handle is publicly decryptable
- `admins`: Admin addresses
- `viewers`: Viewer addresses

**Example:**

```typescript
import type { ACL } from '@iexec-nox/handle';

const acl: ACL = await handleClient.viewACL(someHandle);
```

## Types

### SolidityType

Supported Solidity types for encryption:

> [!WARNING]
> The Nox protocol aims to support the full `SolidityType` union. Today, only `bool`, `uint16`, `uint256`, `int16`, `int256` are implemented.

```typescript
type SolidityType =
  // Special types
  | 'bool'
  | 'address'
  | 'bytes'
  | 'string'
  // Unsigned integers (uint8 to uint256, step 8)
  | 'uint8'
  | 'uint16'
  | 'uint24'
  | 'uint32'
  | 'uint40'
  | 'uint48'
  | 'uint56'
  | 'uint64'
  | 'uint72'
  | 'uint80'
  | 'uint88'
  | 'uint96'
  | 'uint104'
  | 'uint112'
  | 'uint120'
  | 'uint128'
  | 'uint136'
  | 'uint144'
  | 'uint152'
  | 'uint160'
  | 'uint168'
  | 'uint176'
  | 'uint184'
  | 'uint192'
  | 'uint200'
  | 'uint208'
  | 'uint216'
  | 'uint224'
  | 'uint232'
  | 'uint240'
  | 'uint248'
  | 'uint256'
  // Signed integers (int8 to int256, step 8)
  | 'int8'
  | 'int16'
  | 'int24'
  | 'int32'
  | 'int40'
  | 'int48'
  | 'int56'
  | 'int64'
  | 'int72'
  | 'int80'
  | 'int88'
  | 'int96'
  | 'int104'
  | 'int112'
  | 'int120'
  | 'int128'
  | 'int136'
  | 'int144'
  | 'int152'
  | 'int160'
  | 'int168'
  | 'int176'
  | 'int184'
  | 'int192'
  | 'int200'
  | 'int208'
  | 'int216'
  | 'int224'
  | 'int232'
  | 'int240'
  | 'int248'
  | 'int256'
  // Fixed-size bytes (bytes1 to bytes32)
  | 'bytes1'
  | 'bytes2'
  | 'bytes3'
  | 'bytes4'
  | 'bytes5'
  | 'bytes6'
  | 'bytes7'
  | 'bytes8'
  | 'bytes9'
  | 'bytes10'
  | 'bytes11'
  | 'bytes12'
  | 'bytes13'
  | 'bytes14'
  | 'bytes15'
  | 'bytes16'
  | 'bytes17'
  | 'bytes18'
  | 'bytes19'
  | 'bytes20'
  | 'bytes21'
  | 'bytes22'
  | 'bytes23'
  | 'bytes24'
  | 'bytes25'
  | 'bytes26'
  | 'bytes27'
  | 'bytes28'
  | 'bytes29'
  | 'bytes30'
  | 'bytes31'
  | 'bytes32';
```

### Config

Optional overrides when creating a client. If your chain is not built into the SDK defaults, you must supply **all** of: `gatewayUrl`, `smartContractAddress`, and `subgraphUrl`.

```typescript
type Config = {
  gatewayUrl: string; // Gateway API endpoint
  smartContractAddress: string; // Protocol contract address
  subgraphUrl: string; // The Graph subgraph HTTP endpoint
};
```

### Supported networks (defaults)

Built-in defaults include **Arbitrum Sepolia** (`chainId` **421614**). Other chains require a full `HandleClientConfig` override as above.

## Status & Limitations

This library is still under development, and interfaces may slightly change in the next versions.

## License

This project is licensed under the [MIT License](./LICENSE) © iExec.
