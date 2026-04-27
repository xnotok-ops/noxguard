import type { EthereumAddress, HexString } from '../../types/internalTypes.js';
import type {
  AbiFragmentTypes,
  AbiReadFunctionJsonFragment,
} from './abi.types.js';

/**
 * Interface for Blockchain Service
 *
 * Defines methods to interact with the blockchain regardless of the underlying library.
 */
export interface IBlockchainService {
  getChainId(): Promise<number>;
  getAddress(): Promise<EthereumAddress>;
  readContract<T extends AbiReadFunctionJsonFragment>(
    contractAddress: EthereumAddress,
    /**
     * The ABI function fragment describing the contract method to call
     *
     * ⚠️ must be passed with 'as const' to preserve literal types
     */
    abiFunctionFragment: T,
    parameters: AbiFragmentTypes<T, 'inputs'>
  ): Promise<AbiFragmentTypes<T, 'outputs'>>;
  signTypedData(data: EIP712TypedData): Promise<HexString>;
}

/**
 * EIP-712 Typed Data structure
 */
export interface EIP712TypedData {
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  domain: {
    name?: string;
    version?: string;
    chainId?: number | bigint;
    verifyingContract?: HexString;
    salt?: HexString;
  };
  message: Record<string, unknown>;
}
