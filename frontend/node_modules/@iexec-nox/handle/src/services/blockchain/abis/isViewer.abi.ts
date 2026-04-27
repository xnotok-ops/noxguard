/**
 * isViewer function ABI fragment
 */
export const IS_VIEWER_ABI = {
  inputs: [
    {
      internalType: 'bytes32',
      name: 'handle',
      type: 'bytes32',
    },
    {
      internalType: 'address',
      name: 'viewer',
      type: 'address',
    },
  ],
  name: 'isViewer',
  outputs: [
    {
      internalType: 'bool',
      name: '',
      type: 'bool',
    },
  ],
  stateMutability: 'view',
  type: 'function',
} as const;
