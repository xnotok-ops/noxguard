import {
  type BaseUrl,
  type EthereumAddress,
  type HexString,
} from '../types/internalTypes.js';
import {
  handleToAttribute,
  handleToChainId,
  handleToSolidityType,
  handleToVersion,
  type SolidityType,
} from './types.js';

export function isBaseURL(url: unknown): url is BaseUrl {
  return typeof url === 'string' && /^https?:\/\/[^/?]+\/?$/.test(url);
}

export function isSubgraphURL(url: unknown): url is BaseUrl {
  return (
    typeof url === 'string' && /^https?:\/\/[^/?]+(\/[^?]*)?(\?.*)?$/.test(url)
  );
}

export function isEthereumAddress(
  address: unknown
): address is EthereumAddress {
  return typeof address === 'string' && /^0x[0-9a-fA-F]{40}$/.test(address);
}

const HANDLE_PATTERN = /^0x[0-9a-fA-F]{64}$/;
const INPUT_PROOF_PATTERN = /^0x[0-9a-fA-F]{274}$/;
const SUPPORTED_VERSIONS = [0];
const SUPPORTED_ATTRIBUTES = [0, 1];

export function validateHandle({
  handle,
  expectedChainId,
  expectedSolidityType,
}: {
  handle: unknown;
  expectedChainId: number;
  expectedSolidityType: SolidityType;
}): void {
  if (typeof handle !== 'string' || !HANDLE_PATTERN.test(handle)) {
    throw new TypeError(
      `Invalid handle format: expected 0x + 64 hex chars (32 bytes), got ${handle}`
    );
  }

  const attribute = handleToAttribute(handle as HexString);
  if (!SUPPORTED_ATTRIBUTES.includes(attribute)) {
    throw new Error(
      `Unsupported handle attribute: expected one of [${SUPPORTED_ATTRIBUTES.join(',')}], got ${attribute}`
    );
  }

  const chainId = handleToChainId(handle as HexString);
  if (chainId !== expectedChainId) {
    throw new Error(
      `Handle chainId mismatch: expected ${expectedChainId}, got ${chainId}`
    );
  }

  const solidityType = handleToSolidityType(handle as HexString);
  if (solidityType !== expectedSolidityType) {
    throw new Error(
      `Handle type mismatch: expected ${expectedSolidityType}, got ${solidityType}`
    );
  }

  const version = handleToVersion(handle as HexString);

  if (!SUPPORTED_VERSIONS.includes(version)) {
    throw new Error(
      `Unsupported handle version: ${version}. Supported versions: ${SUPPORTED_VERSIONS}`
    );
  }
}

export function validateHandleProof(handleProof: unknown): void {
  if (
    typeof handleProof !== 'string' ||
    !INPUT_PROOF_PATTERN.test(handleProof)
  ) {
    throw new TypeError(
      `Invalid handleProof: expected 0x + 274 hex chars (137 bytes), got ${handleProof}`
    );
  }
}

export function assertRequiredParams<
  T extends Record<string, unknown>,
  K extends keyof T,
>(params: T, requiredKeys: K[]): void {
  const missingKeys = requiredKeys.filter((key) => params[key] === undefined);

  if (missingKeys.length === 0) {
    return;
  }
  throw new Error(
    `Missing required parameters: ${missingKeys.map(String).join(', ')}`
  );
}
