import { GraphQLClient } from 'graphql-request';
import type { BaseUrl } from '../../types/internalTypes.js';

export interface ISubgraphService {
  subgraphUrl: BaseUrl;
  request(query: string, variables: Record<string, unknown>): Promise<unknown>;
}
class SubgraphService implements ISubgraphService {
  private readonly client: GraphQLClient;

  constructor(public readonly subgraphUrl: BaseUrl) {
    this.client = new GraphQLClient(subgraphUrl, { headers: {} });
  }

  async request(
    query: string,
    variables: Record<string, unknown>
  ): Promise<unknown> {
    try {
      return await this.client.request(query, variables);
    } catch (error) {
      throw new Error('Failed to request from subgraph', { cause: error });
    }
  }
}

export default SubgraphService;
