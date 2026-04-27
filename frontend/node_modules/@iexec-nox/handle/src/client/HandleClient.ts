import { decrypt } from '../methods/decrypt.js';
import { encryptInput } from '../methods/encryptInput.js';
import { publicDecrypt } from '../methods/publicDecrypt.js';
import { viewACL, type ACL } from '../methods/viewACL.js';
import type { IApiService } from '../services/api/IApiService.js';
import type { IBlockchainService } from '../services/blockchain/IBlockchainService.js';
import type { IStorageService } from '../services/storage/IStorageService.js';
import { InMemoryStorageService } from '../services/storage/InMemoryStorageService.js';
import type { ISubgraphService } from '../services/subgraph/SubgraphService.js';
import type {
  BaseUrl,
  EthereumAddress,
  HexString,
} from '../types/internalTypes.js';
import type { Handle, JsValue, SolidityType } from '../utils/types.js';

export interface HandleClientConfig {
  gatewayUrl: BaseUrl;
  smartContractAddress: EthereumAddress;
  subgraphUrl: BaseUrl;
}

export interface HandleClientDependencies {
  blockchainService: IBlockchainService;
  subgraphService: ISubgraphService;
  apiService: IApiService;
  storageService?: IStorageService;
  config: HandleClientConfig;
}

/**
 * A client to interact with encrypted values using Handles on blockchain
 */
export class HandleClient {
  private readonly blockchainService: IBlockchainService;
  private readonly apiService: IApiService;
  private readonly config: HandleClientConfig;
  private readonly subgraphService: ISubgraphService;
  private readonly storageService: IStorageService;

  /**
   * @ignore
   * Creates an instance of {@link HandleClient}.
   *
   * @param dependencies The client dependencies
   * @param dependencies.blockchainService Service to interact with the blockchain
   * @param dependencies.subgraphService Service to interact with the subgraph
   * @param dependencies.apiService Service to call the gateway API
   * @param dependencies.storageService Optional storage service for caching decryption materials (default: {@link InMemoryStorageService})
   * @param dependencies.config Configuration with gateway URL and contract address
   */
  constructor({
    blockchainService,
    subgraphService,
    apiService,
    storageService = new InMemoryStorageService(),
    config,
  }: HandleClientDependencies) {
    this.blockchainService = blockchainService;
    this.subgraphService = subgraphService;
    this.storageService = storageService;
    this.apiService = apiService;
    this.config = config;
  }

  /**
   * Encrypts a value and returns a handle for use in smart contracts.
   *
   * @param value The value to encrypt (boolean, string, or bigint)
   * @param solidityType The {@link SolidityType} of the value
   * @param applicationContract The address of the contract allowed to use the input
   * @returns {@link Handle} and handleProof for smart contract usage
   *
   * @example
   * ```ts
   * // Encrypt a uint256
   * const { handle, handleProof } = await client.encryptInput(
   *   1000000n,
   *   'uint256',
   *   '0x123...abc'
   * );
   *
   * // Encrypt a boolean
   * const { handle, handleProof } = await client.encryptInput(
   *   true,
   *   'bool',
   *   '0x123...abc'
   * );
   * ```
   */
  async encryptInput<T extends SolidityType>(
    value: JsValue<T>,
    solidityType: T,
    applicationContract: EthereumAddress
  ): Promise<{
    handle: Handle<T>;
    handleProof: HexString;
  }> {
    return encryptInput({
      blockchainService: this.blockchainService,
      apiService: this.apiService,
      value,
      solidityType,
      applicationContract,
    });
  }

  /**
   * Request the original value associated with a handle.
   *
   * @param handle The handle representing the encrypted value
   * @returns The decrypted value and its {@link SolidityType}
   *
   * @remarks
   * The decryption key is shared with the connected wallet address via public key encryption.
   * To request decryption, the connected wallet must be allowed to view the data and provide an EIP712 DataAccessAuthorization signature.
   *
   * @example
   * ```ts
   * const { value, solidityType } = await client.decrypt(handle);
   * ```
   */
  async decrypt<T extends SolidityType>(
    handle: Handle<T>
  ): Promise<{
    value: JsValue<T>;
    solidityType: T;
  }> {
    return decrypt({
      handle,
      storageService: this.storageService,
      apiService: this.apiService,
      blockchainService: this.blockchainService,
      config: this.config,
    });
  }

  /**
   * View the Access Control List (ACL) for a handle.
   *
   * @param handle The handle representing the encrypted value
   * @returns The {@link ACL} details of the handle, including public access, admins, and viewers
   *
   * @remarks
   * The ACL contains the following properties:
   * - `isPublic`: Indicates if the Handle is publicly decryptable (if `true`, anyone can decrypt it).
   * - `admins`: List of addresses that have admin permissions on the Handle.
   * - `viewers`: List of addresses that have viewer permissions on the Handle.
   *
   * @example
   * ```ts
   * const { isPublic, admins, viewers } = await client.viewACL(handle);
   * ```
   */
  async viewACL(handle: Handle<SolidityType>): Promise<ACL> {
    return viewACL({
      subgraphService: this.subgraphService,
      handle,
    });
  }

  /**
   * Request the original value and a decryption proof associated with a publicly decryptable handle.
   *
   * @param handle The publicly decryptable handle representing the encrypted value
   * @returns The decrypted value, its {@link SolidityType} and the decryptionProof
   *
   * @remarks
   * To request public decryption, the handle must be publicly decryptable.
   * The decryption proof can be verified in a smart contract and used to produce a plaintext value onchain.
   *
   * @example
   * ```ts
   * const { value, solidityType, decryptionProof } = await client.publicDecrypt(handle);
   * ```
   */
  async publicDecrypt<T extends SolidityType>(
    handle: Handle<T>
  ): Promise<{
    value: JsValue<T>;
    solidityType: T;
    decryptionProof: HexString;
  }> {
    return publicDecrypt({
      handle,
      apiService: this.apiService,
      blockchainService: this.blockchainService,
      config: this.config,
    });
  }
}
