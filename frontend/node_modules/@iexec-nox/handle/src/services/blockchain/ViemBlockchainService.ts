import type { Client, WalletClient } from 'viem';
import type { SmartAccount } from 'viem/account-abstraction';
import type { EthereumAddress, HexString } from '../../types/internalTypes.js';
import { safeJsonStringify } from '../../utils/format.js';
import type {
  EIP712TypedData,
  IBlockchainService,
} from './IBlockchainService.js';
import type {
  AbiFragmentTypes,
  AbiReadFunctionJsonFragment,
} from './abi.types.js';

export type ViemClient = WalletClient | SmartAccount;

/**
 * Internal adapter interface for viem clients
 */
interface ViemAdapter {
  getClient(): Promise<Client>;
  getChainId(): Promise<number>;
  getAddress(): Promise<EthereumAddress>;
  signTypedData(data: EIP712TypedData): Promise<HexString>;
}

/**
 * Type guard to check if a client is a viem WalletClient connected to an account
 *
 * @dev ⚠️ Update this function to match WalletClientAdapter requirements changes
 */
export function isViemWalletClient(object: unknown): object is WalletClient {
  return (
    !!object &&
    typeof object === 'object' &&
    'getChainId' in object &&
    typeof object.getChainId === 'function' &&
    'getAddresses' in object &&
    typeof object.getAddresses === 'function' &&
    'signTypedData' in object &&
    typeof object.signTypedData === 'function'
  );
}

/**
 * Adapter for viem WalletClient
 *
 * @dev ⚠️ Update isViemWalletClient function if this class is modified requiring more duck type checks
 */
class WalletClientAdapter implements ViemAdapter {
  private readonly walletClient: WalletClient;

  constructor(walletClient: WalletClient) {
    this.walletClient = walletClient;
  }

  async getClient(): Promise<Client> {
    return this.walletClient;
  }

  async getChainId(): Promise<number> {
    return this.walletClient.getChainId();
  }

  async getAddress(): Promise<EthereumAddress> {
    const addresses = await this.walletClient.getAddresses();
    const address = addresses[0];
    if (!address) {
      throw new Error('No connected account');
    }
    return address;
  }

  async signTypedData(data: EIP712TypedData): Promise<HexString> {
    return this.walletClient.signTypedData({
      ...data,
      account: this.walletClient.account ?? (await this.getAddress()), // use the local account if available, otherwise fallback to RPC call
    });
  }
}

/**
 * Type guard to check if a client is a viem SmartAccount (ERC-4337)
 *
 * @dev ⚠️ Update this function to match SmartAccountAdapter requirements changes
 */
export function isViemSmartAccount(object: unknown): object is SmartAccount {
  return (
    !!object &&
    typeof object === 'object' &&
    'type' in object &&
    object.type === 'smart' &&
    'getAddress' in object &&
    typeof object.getAddress === 'function' &&
    'signTypedData' in object &&
    typeof object.signTypedData === 'function' &&
    'client' in object &&
    !!object.client
  );
}

/**
 * Adapter for viem SmartAccount
 *
 * @dev ⚠️ Update isSmartAccount function if this class is modified requiring more duck type checks
 */
class SmartAccountAdapter implements ViemAdapter {
  private readonly smartAccount: SmartAccount;

  constructor(smartAccount: SmartAccount) {
    this.smartAccount = smartAccount;
  }

  async getClient(): Promise<Client> {
    return this.smartAccount.client;
  }

  async getChainId(): Promise<number> {
    const chainId = this.smartAccount.client.chain?.id;
    if (chainId === undefined) {
      throw new Error('SmartAccount client is not connected to a chain');
    }
    return chainId;
  }

  async getAddress(): Promise<EthereumAddress> {
    return this.smartAccount.getAddress();
  }

  async signTypedData(data: EIP712TypedData): Promise<HexString> {
    return this.smartAccount.signTypedData(data);
  }
}

/**
 * Implements IBlockchainService using viem library.
 */
export class ViemBlockchainService implements IBlockchainService {
  // eslint-disable-next-line unicorn/no-null
  private static viemModule: typeof import('viem') | null = null;

  private static async getViemModule(): Promise<typeof import('viem')> {
    this.viemModule ??= await import('viem');
    return this.viemModule;
  }

  private readonly adapter: ViemAdapter;

  /**
   * Creates an instance of ViemBlockchainService.
   * @param client - A viem WalletClient instance connected to an account or a viem SmartAccount instance
   * @returns A ViemBlockchainService instance
   * @throws {TypeError} if the provided client is invalid
   */
  constructor(client: ViemClient) {
    if (isViemSmartAccount(client)) {
      this.adapter = new SmartAccountAdapter(client);
    } else if (isViemWalletClient(client)) {
      this.adapter = new WalletClientAdapter(client);
    } else {
      throw new TypeError(
        'Unsupported client. Expected a viem WalletClient instance connected to an account.'
      );
    }
  }

  async getChainId(): Promise<number> {
    try {
      const chainId = await this.adapter.getChainId();
      return chainId;
    } catch (error) {
      throw new Error('Failed to get chain ID', { cause: error });
    }
  }

  async getAddress(): Promise<EthereumAddress> {
    try {
      return await this.adapter.getAddress();
    } catch (error) {
      throw new Error('Failed to get address', { cause: error });
    }
  }

  async readContract<T extends AbiReadFunctionJsonFragment>(
    contractAddress: EthereumAddress,
    abiFunctionFragment: T,
    parameters: AbiFragmentTypes<T, 'inputs'>
  ): Promise<AbiFragmentTypes<T, 'outputs'>> {
    try {
      const { publicActions } = await ViemBlockchainService.getViemModule();

      // Use the underlying client for SmartAccount
      const clientToExtend = await this.adapter.getClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const publicClient = (clientToExtend as any).extend(publicActions);

      return (await publicClient.readContract({
        address: contractAddress,
        abi: [abiFunctionFragment],
        functionName: abiFunctionFragment.name,
        args: parameters,
      })) as AbiFragmentTypes<T, 'outputs'>;
    } catch (error) {
      throw new Error(
        `Failed to read contract at ${contractAddress} (method: ${abiFunctionFragment.name}, parameters: ${safeJsonStringify(parameters)})`,
        {
          cause: error,
        }
      );
    }
  }

  async signTypedData(data: EIP712TypedData): Promise<HexString> {
    try {
      const signature = await this.adapter.signTypedData({
        domain: data.domain,
        types: data.types,
        primaryType: data.primaryType,
        message: data.message,
      });
      return signature;
    } catch (error) {
      throw new Error('Failed to sign typed data', { cause: error });
    }
  }
}
