import type { HandleClientConfig } from '../client/HandleClient.js';
import {
  isBaseURL,
  isEthereumAddress,
  isSubgraphURL,
} from '../utils/validators.js';

export const NETWORK_CONFIGS: Record<number, HandleClientConfig> = {
  421_614: {
    gatewayUrl:
      'https://2e1800fc0dddeeadc189283ed1dce13c1ae28d48-3000.apps.ovh-tdx-dev.noxprotocol.dev',
    smartContractAddress: '0xd464B198f06756a1d00be223634b85E0a731c229',
    subgraphUrl:
      'https://thegraph.arbitrum-sepolia-testnet.noxprotocol.io/api/subgraphs/id/BjQAX2HpmsSAzURJimKDhjZZnkSJtaczA8RPumggrStb',
  },
};

export function resolveNetworkConfig(
  chainId: number,
  override?: Partial<HandleClientConfig>
): HandleClientConfig {
  const networkConfig = NETWORK_CONFIGS[chainId];

  const gatewayUrl = override?.gatewayUrl ?? networkConfig?.gatewayUrl;
  const smartContractAddress =
    override?.smartContractAddress ?? networkConfig?.smartContractAddress;
  const subgraphUrl = override?.subgraphUrl ?? networkConfig?.subgraphUrl;

  if (!gatewayUrl || !smartContractAddress || !subgraphUrl) {
    const supported = Object.keys(NETWORK_CONFIGS).join(', ');
    throw new Error(
      `Chain ${chainId} is not supported. Supported chains: ${supported}. ` +
        `To use an unsupported chain, provide both gatewayUrl, smartContractAddress and subgraphUrl.`
    );
  }

  if (!isBaseURL(gatewayUrl)) {
    throw new TypeError(
      `Invalid gatewayUrl: expected base URL without path or query parameters, got ${gatewayUrl}`
    );
  }

  if (!isEthereumAddress(smartContractAddress)) {
    throw new TypeError(
      `Invalid smartContractAddress: expected ethereum address, got ${smartContractAddress}`
    );
  }

  if (!isSubgraphURL(subgraphUrl)) {
    throw new TypeError(
      `Invalid subgraphUrl: expected valid URL, got ${subgraphUrl}`
    );
  }

  return { gatewayUrl, smartContractAddress, subgraphUrl };
}
