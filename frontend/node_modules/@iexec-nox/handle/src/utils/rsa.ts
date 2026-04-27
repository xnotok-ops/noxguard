import type { HexString } from '../types/internalTypes.js';
import { bytesToHex, hexToBytes } from './hex.js';

/**
 * Generate RSA key pair
 *
 * @returns An object containing the public and private keys in PEM format
 */
export async function generateRsaKeyPair(): Promise<CryptoKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
  return keyPair;
}

/**
 * Export RSA public key to spki (DER) hex encoded format
 *
 * @param param0
 * @param param0.publicKey The RSA public key to export
 * @returns spki (DER) hex encoded string public key
 */
export async function exportRsaPublicKey({
  publicKey,
}: {
  publicKey: CryptoKey;
}): Promise<HexString> {
  const publicKeyBuffer = await crypto.subtle.exportKey('spki', publicKey);
  return bytesToHex(new Uint8Array(publicKeyBuffer));
}

/**
 * Export RSA private key to pkcs8 (DER) hex encoded format
 *
 * @param param0
 * @param param0.privateKey The RSA private key to export
 * @returns pkcs8 (DER) hex encoded string private key
 */
export async function exportRsaPrivateKey({
  privateKey,
}: {
  privateKey: CryptoKey;
}): Promise<HexString> {
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', privateKey);
  return bytesToHex(new Uint8Array(privateKeyBuffer));
}

/**
 * Import RSA private key from pkcs8 (DER) hex encoded format
 *
 * @param param0
 * @param param0.pkcs8Hex The pkcs8 (DER) hex encoded string private key to import
 * @returns The imported RSA private key as a CryptoKey
 */
export async function importRsaPrivateKey({
  pkcs8Hex,
}: {
  pkcs8Hex: HexString;
}): Promise<CryptoKey> {
  const pkcs8Buffer = hexToBytes(pkcs8Hex);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Buffer,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['decrypt']
  );
  return privateKey;
}

/**
 * Decrypts ciphertext using RSA-OAEP
 *
 * @param privateKey - The RSA private key
 * @param ciphertextHex - The hex encoded ciphertext to decrypt
 * @returns Hex encoded decrypted plaintext
 */
export async function rsaDecrypt({
  privateKey,
  ciphertext,
}: {
  privateKey: CryptoKey;
  ciphertext: HexString;
}): Promise<HexString> {
  const ciphertextBytes = hexToBytes(ciphertext);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
    },
    privateKey,
    ciphertextBytes
  );
  return bytesToHex(new Uint8Array(decryptedBuffer));
}
