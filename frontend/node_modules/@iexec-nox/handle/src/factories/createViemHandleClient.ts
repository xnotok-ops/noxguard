import type { WalletClient } from 'viem';
import { HandleClient } from '../client/HandleClient.js';
import type { HandleClientConfig } from '../client/HandleClient.js';
import { resolveNetworkConfig } from '../config/networks.js';
import { ApiService } from '../services/api/ApiService.js';
import { ViemBlockchainService } from '../services/blockchain/ViemBlockchainService.js';
import SubgraphService from '../services/subgraph/SubgraphService.js';

/**
 * Creates a {@link HandleClient} from a viem WalletClient or SmartAccount
 *
 * @param viemClient A viem WalletClient instance connected to an account or a viem SmartAccount instance
 * @param config Optional partial {@link HandleClientConfig} to override network defaults
 * @returns A Promise of {@link HandleClient} instance
 * @throws {TypeError} if the provided viemClient is invalid
 * @throws {Error} if the viemClient fails to detect the connected chain or if the chain is not supported and no complete config is provided
 *
 * @example
 * ```ts
 * // JSON-RPC Account
 * import { createWalletClient, custom } from 'viem'
 *
 * const viemClient = createWalletClient({
 *   transport: custom(window.ethereum)
 * })
 *
 * const handleClient = createViemHandleClient(viemClient);
 * ```
 *
 * @example
 * ```ts
 * // Local Account
 * import { createWalletClient, http } from "viem";
 * import { privateKeyToAccount } from "viem/accounts";
 *
 * import { createViemHandleClient } from "@iexec-nox/handle";
 *
 * const { RPC_URL, PRIVATE_KEY } = process.env;
 *
 * const viemClient = createWalletClient({
 *   account: privateKeyToAccount(PRIVATE_KEY),
 *   transport: http(RPC_URL),
 * });
 *
 * const handleClient = createViemHandleClient(viemClient);
 * ```
 */
export const createViemHandleClient = async (
  viemClient: WalletClient,
  config?: Partial<HandleClientConfig>
): Promise<HandleClient> => {
  const viemBlockchainService = new ViemBlockchainService(viemClient);
  const chainId = await viemBlockchainService.getChainId();
  const resolvedConfig = resolveNetworkConfig(chainId, config);
  const subgraphService = new SubgraphService(resolvedConfig.subgraphUrl);
  const apiService = new ApiService(resolvedConfig.gatewayUrl);
  return new HandleClient({
    blockchainService: viemBlockchainService,
    subgraphService,
    apiService,
    config: resolvedConfig,
  });
};
