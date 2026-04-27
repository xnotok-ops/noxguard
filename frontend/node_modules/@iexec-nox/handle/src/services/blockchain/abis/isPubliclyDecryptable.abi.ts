/**
 * isPubliclyDecryptable function ABI fragment
 */
export const IS_PUBLICLY_DECRYPTABLE_ABI = {
  inputs: [
    {
      internalType: 'bytes32',
      name: 'handle',
      type: 'bytes32',
    },
  ],
  name: 'isPubliclyDecryptable',
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
