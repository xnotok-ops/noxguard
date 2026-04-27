import { HandleClient } from '../client/HandleClient.js';
import type { HandleClientConfig } from '../client/HandleClient.js';
import { resolveNetworkConfig } from '../config/networks.js';
import { ApiService } from '../services/api/ApiService.js';
import {
  EthersBlockchainService,
  isEthersSigner,
  isEthersBrowserProvider,
  type EthersClient,
} from '../services/blockchain/EthersBlockchainService.js';
import {
  isViemWalletClient,
  isViemSmartAccount,
  ViemBlockchainService,
  type ViemClient,
} from '../services/blockchain/ViemBlockchainService.js';
import SubgraphService from '../services/subgraph/SubgraphService.js';

export type BlockchainClient = EthersClient | ViemClient;

/**
 * Creates a {@link HandleClient} from a client of either ethers or viem
 *
 * @param blockchainClient An ethers or viem client
 * @param config Optional partial {@link HandleClientConfig} to override network defaults
 * @returns A Promise of {@link HandleClient} instance
 * @throws {TypeError} if the provided blockchainClient is invalid
 * @throws {Error} if the blockchainClient fails to detect the connected chain or if the chain is not supported and no complete config is provided
 *
 * @remarks
 * This function is provided for convenience, you should use {@link createEthersHandleClient}
 * or {@link createViemHandleClient} for smaller bundle size.
 *
 * @example
 * ```ts
 * // Ethers BrowserProvider
 * import { BrowserProvider } from 'ethers';
 * import { createHandleClient } from '@iexec-nox/handle';
 *
 * const ethersClient = new BrowserProvider(window.ethereum);
 *
 * const handleClient = createHandleClient(ethersClient);
 * ```
 *
 * @example
 * ```ts
 * // Viem JSON-RPC Account
 * import { createWalletClient, custom } from 'viem'
 * import { createHandleClient } from '@iexec-nox/handle';
 *
 * const viemClient = createWalletClient({
 *   transport: custom(window.ethereum)
 * })
 *
 * const handleClient = createHandleClient(viemClient);
 * ```
 */
export const createHandleClient = async (
  blockchainClient: BlockchainClient,
  config?: Partial<HandleClientConfig>
): Promise<HandleClient> => {
  if (
    isEthersSigner(blockchainClient) ||
    isEthersBrowserProvider(blockchainClient)
  ) {
    const ethersBlockchainService = new EthersBlockchainService(
      blockchainClient
    );
    const chainId = await ethersBlockchainService.getChainId();
    const resolvedConfig = resolveNetworkConfig(chainId, config);
    const apiService = new ApiService(resolvedConfig.gatewayUrl);
    const subgraphService = new SubgraphService(resolvedConfig.subgraphUrl);
    return new HandleClient({
      blockchainService: ethersBlockchainService,
      subgraphService,
      apiService,
      config: resolvedConfig,
    });
  }

  if (
    isViemWalletClient(blockchainClient) ||
    isViemSmartAccount(blockchainClient)
  ) {
    const viemBlockchainService = new ViemBlockchainService(blockchainClient);
    const chainId = await viemBlockchainService.getChainId();
    const resolvedConfig = resolveNetworkConfig(chainId, config);
    const apiService = new ApiService(resolvedConfig.gatewayUrl);
    const subgraphService = new SubgraphService(resolvedConfig.subgraphUrl);
    return new HandleClient({
      blockchainService: viemBlockchainService,
      subgraphService,
      apiService,
      config: resolvedConfig,
    });
  }

  throw new TypeError(
    'Unsupported blockchain client. Expected either an ethers AbstractSigner with connected provider or a viem WalletClient connected to an account.'
  );
};
