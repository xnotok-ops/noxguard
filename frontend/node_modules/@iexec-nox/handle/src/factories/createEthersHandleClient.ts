import { HandleClient } from '../client/HandleClient.js';
import type { HandleClientConfig } from '../client/HandleClient.js';
import { resolveNetworkConfig } from '../config/networks.js';
import { ApiService } from '../services/api/ApiService.js';
import {
  EthersBlockchainService,
  type EthersClient,
} from '../services/blockchain/EthersBlockchainService.js';
import SubgraphService from '../services/subgraph/SubgraphService.js';

/**
 * Creates a {@link HandleClient} from an ethers signer provider
 *
 * @param ethersClient An ethers AbstractSigner instance connected to a Provider or a BrowserProvider instance
 * @param config Optional partial {@link HandleClientConfig} to override network defaults
 * @returns A Promise of {@link HandleClient} instance
 * @throws {TypeError} if the provided signer is invalid
 * @throws {Error} if the ethersClient fails to detect the connected chain or if the chain is not supported and no complete config is provided
 *
 * @example
 * ```ts
 * // BrowserProvider
 * import { BrowserProvider } from 'ethers';
 * import { createEthersHandleClient } from '@iexec-nox/handle';
 *
 * const ethersClient = new BrowserProvider(window.ethereum);
 *
 * const handleClient = createEthersHandleClient(ethersClient);
 * ```
 *
 * @example
 * ```ts
 * // Ethers Wallet
 * import { JsonRpcProvider, Wallet } from 'ethers';
 * import { createEthersHandleClient } from '@iexec-nox/handle';
 *
 * const { RPC_URL, PRIVATE_KEY } = process.env;
 *
 * const provider = new JsonRpcProvider(RPC_URL);
 * const ethersClient = new Wallet(PRIVATE_KEY, provider);
 *
 * const handleClient = createEthersHandleClient(ethersClient);
 * ```
 */
export const createEthersHandleClient = async (
  ethersClient: EthersClient,
  config?: Partial<HandleClientConfig>
): Promise<HandleClient> => {
  const ethersBlockchainService = new EthersBlockchainService(ethersClient);
  const chainId = await ethersBlockchainService.getChainId();
  const resolvedConfig = resolveNetworkConfig(chainId, config);
  const subgraphService = new SubgraphService(resolvedConfig.subgraphUrl);
  const apiService = new ApiService(resolvedConfig.gatewayUrl);
  return new HandleClient({
    blockchainService: ethersBlockchainService,
    subgraphService,
    apiService,
    config: resolvedConfig,
  });
};
