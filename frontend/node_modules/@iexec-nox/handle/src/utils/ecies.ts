import type { HexString } from '../types/internalTypes.js';
import { bytesToHex, hexToBytes } from './hex.js';

const DERIVATION_INFO = hexToBytes(
  '0x45434945533a4145535f47434d3a7631' // hardcoded "ECIES:AES_GCM:v1" hex
);

/**
 * Decrypts cipher text using ECIES HKDF with the provided ephemeral shared secret point.
 *
 * @param params - The decryption parameters
 * @param params.ciphertext - Hex encoded cipher text to decrypt (format: encrypted_data + auth_tag[16])
 * @param params.iv - Hex encoded 12 bytes initialization vector (IV) used during AES-256-GCM encryption
 * @param params.sharedSecret - Hex encoded 32 bytes x coordinate of the secret point (K*privateKey)
 * @returns Decrypted hex encoded plaintext (with "0x" prefix)
 */
export async function eciesDecrypt({
  ciphertext,
  iv,
  sharedSecret,
}: {
  ciphertext: HexString;
  iv: HexString;
  sharedSecret: HexString;
}): Promise<HexString> {
  // Convert hex strings to Uint8Array
  const ciphertextBytes = hexToBytes(ciphertext);
  const sharedSecretBytes = hexToBytes(sharedSecret);
  const ivBytes = hexToBytes(iv);

  if (sharedSecretBytes.length !== 32) {
    throw new TypeError('Invalid shared secret length');
  }

  if (ivBytes.length !== 12) {
    throw new TypeError('Invalid IV length');
  }

  // Import shared secret as key material for HKDF
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecretBytes,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key using HKDF with SHA-256
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // empty salt
      info: DERIVATION_INFO, // protocol-specific info
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Decrypt using AES-256-GCM
  const decryptedBytes = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
      tagLength: 128,
    },
    aesKey,
    ciphertextBytes
  );

  // Convert decrypted bytes back to hex
  return bytesToHex(new Uint8Array(decryptedBytes));
}
