import type { HandleClientConfig } from '../client/HandleClient.js';
import type { IApiService } from '../services/api/IApiService.js';
import type {
  IBlockchainService,
  EIP712TypedData,
} from '../services/blockchain/IBlockchainService.js';
import { IS_VIEWER_ABI } from '../services/blockchain/abis/isViewer.abi.js';
import type { IStorageService } from '../services/storage/IStorageService.js';
import type { HexString } from '../types/internalTypes.js';
import { eciesDecrypt } from '../utils/ecies.js';
import { decodeValue } from '../utils/encoding.js';
import { isHexString } from '../utils/hex.js';
import {
  generateRsaKeyPair,
  exportRsaPublicKey,
  rsaDecrypt,
  exportRsaPrivateKey,
  importRsaPrivateKey,
} from '../utils/rsa.js';
import {
  handleToChainId,
  handleToSolidityType,
  type Handle,
  type JsValue,
  type SolidityType,
} from '../utils/types.js';
import { assertRequiredParams } from '../utils/validators.js';

export async function decrypt<T extends SolidityType>({
  handle,
  apiService,
  blockchainService,
  storageService,
  config,
}: {
  handle: Handle<T>;
  apiService: IApiService;
  blockchainService: IBlockchainService;
  storageService: IStorageService;
  config: HandleClientConfig;
}): Promise<{ value: JsValue<T>; solidityType: T }> {
  assertRequiredParams({ handle }, ['handle']);

  const [chainId, userAddress] = await Promise.all([
    blockchainService.getChainId(),
    blockchainService.getAddress(),
  ]);

  const chainIdFromHandle = handleToChainId(handle); // validate chainId
  if (chainIdFromHandle !== chainId) {
    throw new Error(
      `Handle chainId (${chainIdFromHandle}) does not match connected chainId (${chainId})`
    );
  }

  const isViewer = await blockchainService.readContract(
    config.smartContractAddress,
    IS_VIEWER_ABI,
    [handle, userAddress]
  );
  if (!isViewer) {
    throw new Error(
      `Handle (${handle}) does not exist or user (${userAddress}) is not authorized to decrypt it`
    );
  }

  const solidityType = handleToSolidityType(handle) as T;

  let authorization: string;
  let rsaPrivateKey: CryptoKey;
  let isFreshDecryptionMaterial = false;

  const storageKey = computeDecryptionMaterialStorageKey({
    userAddress,
    chainId,
    verifyingContract: config.smartContractAddress,
  });
  const storedDecryptionMaterial = await retrieveDecryptionMaterial({
    storageKey,
    storageService,
  });

  if (storedDecryptionMaterial) {
    authorization = storedDecryptionMaterial.authorization;
    rsaPrivateKey = storedDecryptionMaterial.rsaPrivateKey;
  } else {
    const decryptionMaterial = await generateDecryptionMaterial({
      userAddress,
      chainId,
      smartContractAddress: config.smartContractAddress,
      blockchainService,
    });
    authorization = decryptionMaterial.authorization;
    rsaPrivateKey = decryptionMaterial.rsaPrivateKey;
    isFreshDecryptionMaterial = true;
  }

  let { status, data } = await apiService.get({
    endpoint: `/v0/secrets/${handle}`,
    headers: {
      Authorization: authorization,
    },
  });

  // Clear stored decryption material if authorization is invalid to avoid trying to reuse it on subsequent decryptions
  if (status === 401 && storedDecryptionMaterial) {
    try {
      storageService.removeItem(storageKey);
    } catch {
      // ignore
    }
    // Retry decryption once after clearing stored material in case the failure was due to an invalid stored authorization
    const decryptionMaterial = await generateDecryptionMaterial({
      userAddress,
      chainId,
      smartContractAddress: config.smartContractAddress,
      blockchainService,
    });
    authorization = decryptionMaterial.authorization;
    rsaPrivateKey = decryptionMaterial.rsaPrivateKey;
    isFreshDecryptionMaterial = true;
    ({ status, data } = await apiService.get({
      endpoint: `/v0/secrets/${handle}`,
      headers: {
        Authorization: authorization,
      },
    }));
  }

  // Validate response
  if (
    status !== 200 ||
    typeof data !== 'object' ||
    data === null ||
    !isHexString((data as { ciphertext?: unknown })?.ciphertext) ||
    !isHexString((data as { iv?: unknown })?.iv, 12) ||
    !isHexString(
      (data as { encryptedSharedSecret?: unknown })?.encryptedSharedSecret
    )
  ) {
    throw new Error(
      `Unexpected response from Handle Gateway (status: ${status}, data: ${JSON.stringify(data)})`
    );
  }

  const { ciphertext, iv, encryptedSharedSecret } = data as {
    ciphertext: HexString;
    iv: HexString;
    encryptedSharedSecret: HexString;
  };

  if (isFreshDecryptionMaterial) {
    await storeDecryptionMaterial({
      storageKey,
      authorization,
      rsaPrivateKey,
      storageService,
    }).catch(() => {
      // ignore
    });
  }

  const sharedSecret = await rsaDecrypt({
    privateKey: rsaPrivateKey,
    ciphertext: encryptedSharedSecret,
  }).catch((error) => {
    throw new Error('Failed to decrypt shared secret', { cause: error });
  });

  const plaintext = await eciesDecrypt({
    ciphertext,
    iv,
    sharedSecret,
  }).catch((error) => {
    throw new Error('Failed to decrypt ciphertext', { cause: error });
  });

  let value: JsValue<T>;
  try {
    value = decodeValue<T>(plaintext, solidityType);
  } catch (error) {
    throw new Error(
      `Failed to decode decrypted plaintext: expected hex encoded ${solidityType}, got ${plaintext}`,
      { cause: error }
    );
  }
  return { value, solidityType };
}

async function generateDecryptionMaterial({
  userAddress,
  chainId,
  smartContractAddress,
  blockchainService,
}: {
  userAddress: HexString;
  chainId: number;
  smartContractAddress: HexString;
  blockchainService: IBlockchainService;
}): Promise<{ authorization: string; rsaPrivateKey: CryptoKey }> {
  const rsaKeyPair = await generateRsaKeyPair().catch((error) => {
    throw new Error('Failed to generate RSA key pair', { cause: error });
  });
  const spkiHexRsaPubKey = await exportRsaPublicKey(rsaKeyPair).catch(
    (error) => {
      throw new Error('Failed to export RSA public key', { cause: error });
    }
  );
  const rsaPrivateKey = rsaKeyPair.privateKey;

  const now = Math.floor(Date.now() / 1000);

  const dataAccessAuthorizationTypedData: EIP712TypedData = {
    types: {
      EIP712Domain: [
        // standard domain type (no salt)
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'version',
          type: 'string',
        },
        {
          name: 'chainId',
          type: 'uint256',
        },
        {
          name: 'verifyingContract',
          type: 'address',
        },
      ],
      DataAccessAuthorization: [
        {
          name: 'userAddress',
          type: 'address',
        },
        {
          name: 'encryptionPubKey',
          type: 'string',
        },
        {
          name: 'notBefore',
          type: 'uint256',
        },
        {
          name: 'expiresAt',
          type: 'uint256',
        },
      ],
    },
    domain: {
      name: 'Handle Gateway',
      version: '1', // major version
      chainId: chainId,
      verifyingContract: smartContractAddress,
    },
    primaryType: 'DataAccessAuthorization',
    message: {
      userAddress: userAddress,
      encryptionPubKey: spkiHexRsaPubKey,
      notBefore: now,
      expiresAt: now + 3600, // valid for 1 hour
    },
  };
  const signature = await blockchainService
    .signTypedData(dataAccessAuthorizationTypedData)
    .catch((error) => {
      throw new Error('Failed to sign data access authorization', {
        cause: error,
      });
    });
  const authorization = `EIP712 ${btoa(
    JSON.stringify({
      payload: dataAccessAuthorizationTypedData.message,
      signature: signature,
    })
  )}`;

  return { authorization, rsaPrivateKey };
}

/**
 * Retrieves the authorization and RSA private key from the storage service
 *
 * NB: clears the stored data if the authorization is invalid (expired or malformed) to avoid trying to reuse it on subsequent decryptions
 */
async function retrieveDecryptionMaterial({
  storageKey,
  storageService,
}: {
  storageKey: string;
  storageService: IStorageService;
}): Promise<{ authorization: string; rsaPrivateKey: CryptoKey } | undefined> {
  let data: string | null;
  try {
    data = storageService.getItem(storageKey);
  } catch {
    return undefined;
  }
  if (data === null) {
    return undefined;
  }
  try {
    const { authorization, pkcs8 } = JSON.parse(data) as {
      authorization: `EIP712 ${string}`;
      pkcs8: HexString;
    };
    const rsaPrivateKey = await importRsaPrivateKey({ pkcs8Hex: pkcs8 });
    const now = Math.floor(Date.now() / 1000);
    const authPayload = JSON.parse(
      atob(authorization.split('EIP712 ')[1]!)
    ) as {
      payload: {
        notBefore: number;
        expiresAt: number;
      };
    };
    if (
      typeof authPayload.payload.notBefore !== 'number' ||
      now < authPayload.payload.notBefore ||
      typeof authPayload.payload.expiresAt !== 'number' ||
      now > authPayload.payload.expiresAt - 10 // invalid if expired or will expire in the next 10 seconds
    ) {
      throw new Error('Invalid stored authorization');
    }
    return { authorization, rsaPrivateKey };
  } catch {
    try {
      storageService.removeItem(storageKey);
    } catch {
      // ignore
    }
  }
  return undefined;
}

/**
 * Computes a unique storage key for the user
 */
function computeDecryptionMaterialStorageKey({
  userAddress,
  verifyingContract,
  chainId,
}: {
  userAddress: HexString;
  verifyingContract: HexString;
  chainId: number;
}): string {
  const version = '1'; // major version only to allow breaking changes in storage format if needed
  return `DecryptionMaterial:${userAddress}:${chainId}:${verifyingContract}:${version}`;
}

/**
 * Stores the authorization and RSA private key in the storage service
 */
async function storeDecryptionMaterial({
  storageKey,
  authorization,
  rsaPrivateKey,
  storageService,
}: {
  storageKey: string;
  authorization: string;
  rsaPrivateKey: CryptoKey;
  storageService: IStorageService;
}): Promise<void> {
  try {
    const pkcs8 = await exportRsaPrivateKey({ privateKey: rsaPrivateKey });
    const data = {
      authorization,
      pkcs8,
    };
    storageService.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    throw new Error('Failed to store authorization and RSA private key', {
      cause: error,
    });
  }
}
