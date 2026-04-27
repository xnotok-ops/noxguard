import type { AbstractSigner, BrowserProvider, Provider, Signer } from 'ethers';
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

export type EthersClient = AbstractSigner | BrowserProvider;

/**
 * Internal adapter interface for ethers clients
 */
interface EthersAdapter {
  getSigner(): Promise<Signer>;
  getProvider(): Promise<Provider>;
}

/**
 * Type guard to check if a client is an ethers AbstractSigner with a connected Provider
 *
 * @dev ⚠️ Update this function to match SignerAdapter requirements changes
 */
export function isEthersSigner(
  object: unknown
): object is AbstractSigner<Provider> {
  return (
    !!object &&
    typeof object === 'object' &&
    'getAddress' in object &&
    typeof object.getAddress === 'function' &&
    'provider' in object &&
    !!object.provider &&
    typeof object.provider === 'object' &&
    'getNetwork' in object.provider &&
    typeof object.provider.getNetwork === 'function'
  );
}

/**
 * Adapter for ethers AbstractSigner
 *
 * @dev ⚠️ Update isEthersSigner function if this class is modified requiring more duck type checks
 */
export class SignerAdapter implements EthersAdapter {
  private readonly signer: AbstractSigner<Provider>;

  constructor(signer: AbstractSigner<Provider>) {
    this.signer = signer;
  }

  async getSigner(): Promise<Signer> {
    return this.signer;
  }

  async getProvider(): Promise<Provider> {
    return this.signer.provider;
  }
}

/**
 * Type guard to check if a client is an ethers BrowserProvider
 *
 * @dev ⚠️ Update this function to match BrowserProviderAdapter requirements changes
 */
export function isEthersBrowserProvider(
  object: unknown
): object is BrowserProvider {
  return (
    !!object &&
    typeof object === 'object' &&
    'getSigner' in object &&
    typeof object.getSigner === 'function' &&
    'getNetwork' in object &&
    typeof object.getNetwork === 'function'
  );
}

/**
 * Adapter for ethers BrowserProvider
 *
 * @dev ⚠️ Update isEthersBrowserProvider function if this class is modified requiring more duck type checks
 */
export class BrowserProviderAdapter implements EthersAdapter {
  private readonly provider: BrowserProvider;

  constructor(provider: BrowserProvider) {
    this.provider = provider;
  }

  async getSigner(): Promise<Signer> {
    try {
      return await this.provider.getSigner();
    } catch (error) {
      throw new Error('Failed to get signer from BrowserProvider', {
        cause: error,
      });
    }
  }

  async getProvider(): Promise<Provider> {
    return this.provider;
  }
}

/**
 * Implements IBlockchainService using ethers library.
 */
export class EthersBlockchainService implements IBlockchainService {
  // eslint-disable-next-line unicorn/no-null
  private static ethersModule: typeof import('ethers') | null = null;

  private static async getEthersModule(): Promise<typeof import('ethers')> {
    this.ethersModule ??= await import('ethers');
    return this.ethersModule;
  }

  private readonly adapter: EthersAdapter;

  /**
   * Creates an instance of EthersBlockchainService.
   * @param client - An ethers AbstractSigner instance connected to a Provider or a BrowserProvider
   * @returns A EthersBlockchainService instance
   * @throws {TypeError} if the provided client is invalid
   */

  constructor(client: EthersClient) {
    if (isEthersSigner(client)) {
      this.adapter = new SignerAdapter(client);
    } else if (isEthersBrowserProvider(client)) {
      this.adapter = new BrowserProviderAdapter(client);
    } else {
      throw new TypeError(
        'Unsupported client. Expected an ethers AbstractSigner instance connected to a Provider or a BrowserProvider.'
      );
    }
  }

  async getChainId(): Promise<number> {
    try {
      const provider = await this.adapter.getProvider();
      const network = await provider.getNetwork();
      return Number(network.chainId);
    } catch (error) {
      throw new Error('Failed to get chain ID', { cause: error });
    }
  }

  async getAddress(): Promise<EthereumAddress> {
    try {
      const signer = await this.adapter.getSigner();
      return (await signer.getAddress()) as EthereumAddress;
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
      const provider = await this.adapter.getProvider();
      const { Contract } = await EthersBlockchainService.getEthersModule();
      const contract = new Contract(
        contractAddress,
        [abiFunctionFragment],
        provider
      );
      const method = contract[abiFunctionFragment.name];
      return await method!(...parameters);
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
      const signer = await this.adapter.getSigner();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { EIP712Domain, ...types } = data.types; // strip out EIP712Domain for ethers
      return (await signer.signTypedData(
        data.domain,
        types,
        data.message
      )) as HexString;
    } catch (error) {
      throw new Error('Failed to sign typed data', { cause: error });
    }
  }
}
