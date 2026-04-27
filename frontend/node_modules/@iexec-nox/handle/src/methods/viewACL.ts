import type { ISubgraphService } from '../services/subgraph/SubgraphService.js';
import {
  VIEW_ACL_QUERY,
  type ViewACLResponse,
} from '../services/subgraph/queries/viewACL.js';
import type { Handle, SolidityType } from '../types/publicTypes.js';
import { assertRequiredParams } from '../utils/validators.js';

/**
 * Access Control List (ACL) for a Handle, including public access, admins, and viewers.
 *
 * The ACL contains the following properties:
 * - `isPublic`: Indicates if the Handle is publicly decryptable (if `true`, anyone can decrypt it).
 * - `admins`: List of addresses that have admin permissions on the Handle.
 * - `viewers`: List of addresses that have viewer permissions on the Handle.
 */
export type ACL = {
  isPublic: boolean;
  admins: string[];
  viewers: string[];
};

export async function viewACL({
  subgraphService,
  handle,
}: {
  subgraphService: ISubgraphService;
  handle: Handle<SolidityType>;
}): Promise<ACL> {
  assertRequiredParams({ handle }, ['handle']);

  const response = (await subgraphService.request(VIEW_ACL_QUERY, {
    handleId: handle.toString(),
  })) as ViewACLResponse;

  if (
    !response ||
    typeof response !== 'object' ||
    !('handle' in response) ||
    response.handle === null
  ) {
    throw new Error('Handle not found');
  }

  const admins = response.handle.admins?.map((admin) => admin.account) ?? [];
  const viewers =
    response.handle.viewers?.map((viewer) => viewer.account) ?? [];

  return {
    isPublic: response.handle.isPubliclyDecryptable ?? false,
    admins,
    viewers,
  };
}
