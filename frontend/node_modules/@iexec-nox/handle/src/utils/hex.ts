import type { HexString } from '../types/internalTypes.js';

/**
 * Converts Uint8Array to hex string with "0x" prefix
 */
export function bytesToHex(bytes: Uint8Array): HexString {
  let hex: HexString = '0x';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex;
}

/**
 * Converts hex string with "0x" prefix to Uint8Array<ArrayBuffer>
 */
export function hexToBytes(hex: HexString): Uint8Array<ArrayBuffer> {
  // Validate hex encoding: must have leading 0x, even length and only contain hex characters
  if (!isHexString(hex)) {
    throw new TypeError(
      `Invalid hex string: expected even length string with "0x" prefix, got ${typeof hex} ${hex}`
    );
  }
  const hexWithoutPrefix = hex.slice(2);
  const bytes = new Uint8Array(hexWithoutPrefix.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(
      hexWithoutPrefix.slice(index * 2, index * 2 + 2),
      16
    );
  }
  return bytes;
}

/**
 * Checks if a value is a valid hex string with "0x" prefix and optional specific byte size
 */
export function isHexString(
  value: unknown,
  byteSize?: number
): value is HexString {
  if (typeof value !== 'string') {
    return false;
  }
  if (!/^0x([0-9a-fA-F]{2})*$/.test(value)) {
    return false;
  }
  if (byteSize !== undefined && value.length !== 2 + byteSize * 2) {
    return false;
  }
  return true;
}

/**
 * Checks if bitSize is a positive multiple of 8 and less than or equal to 256
 */
function isValidBitSize(bitSize: number): boolean {
  return (
    Number.isInteger(bitSize) &&
    bitSize > 0 &&
    bitSize <= 256 &&
    bitSize % 8 === 0
  );
}

/**
 * Converts a bigint to a hex string with "0x" prefix, representing an unsigned integer of specified bit size
 */
export function uintXToHex(value: bigint, bitSize: number): HexString {
  if (typeof value !== 'bigint') {
    throw new TypeError(
      `Invalid value: expected bigint, got ${typeof value} ${value}`
    );
  }
  if (!isValidBitSize(bitSize)) {
    throw new RangeError(
      `Invalid bitSize: expected a positive multiple of 8 and less than or equal to 256, got ${bitSize}`
    );
  }
  const min = 0n;
  const max = (1n << BigInt(bitSize)) - 1n;
  if (value < min || value > max) {
    throw new RangeError(
      `Invalid uint${bitSize} value: expected a bigint between ${min} and ${max}, got ${value}`
    );
  }
  const hex = value.toString(16).padStart(2 * (bitSize / 8), '0');
  return `0x${hex}`;
}

/**
 * Converts a bigint to a hex string with "0x" prefix, representing a signed integer of specified bit size
 */
export function intXToHex(value: bigint, bitSize: number): HexString {
  if (typeof value !== 'bigint') {
    throw new TypeError(
      `Invalid value: expected bigint, got ${typeof value} ${value}`
    );
  }
  if (!isValidBitSize(bitSize)) {
    throw new RangeError(
      `Invalid bitSize: expected a positive multiple of 8 and less than or equal to 256, got ${bitSize}`
    );
  }
  const min = -(1n << BigInt(bitSize - 1));
  const max = (1n << BigInt(bitSize - 1)) - 1n;
  if (value < min || value > max) {
    throw new RangeError(
      `Invalid int${bitSize} value: expected a bigint between ${min} and ${max}, got ${value}`
    );
  }
  if (value < 0) {
    value = (1n << BigInt(bitSize)) + value;
  }
  return uintXToHex(value, bitSize);
}

/**
 * Converts hex string with "0x" prefix to a bigint representing a signed integer of specified bit size
 */
export function hexToIntX(hex: HexString, bitSize: number): bigint {
  if (!isValidBitSize(bitSize)) {
    throw new RangeError(
      `Invalid bitSize: expected a positive multiple of 8 and less than or equal to 256, got ${bitSize}`
    );
  }
  if (!isHexString(hex, bitSize / 8)) {
    throw new TypeError(
      `Invalid int${bitSize} hex string: expected ${bitSize / 8} byte hex string with "0x" prefix, got ${typeof hex} ${hex}`
    );
  }
  const value = BigInt(hex);
  const max = (1n << BigInt(bitSize - 1)) - 1n;
  if (value > max) {
    return value - (1n << BigInt(bitSize));
  }
  return value;
}

/**
 * Converts hex string with "0x" prefix to a bigint representing an unsigned integer of specified bit size
 */
export function hexToUintX(hex: HexString, bitSize: number): bigint {
  if (!isValidBitSize(bitSize)) {
    throw new RangeError(
      `Invalid bitSize: expected a positive multiple of 8 and less than or equal to 256, got ${bitSize}`
    );
  }
  if (!isHexString(hex, bitSize / 8)) {
    throw new TypeError(
      `Invalid uint${bitSize} hex string: expected ${bitSize / 8} byte hex string with "0x" prefix, got ${typeof hex} ${hex}`
    );
  }
  return BigInt(hex);
}

/**
 * Converts hex string with "0x" prefix to an UTF-8 string
 */
export function hexToString(hex: HexString): string {
  const bytes = hexToBytes(hex);
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Converts an UTF-8 string to hex string with "0x" prefix
 */
export function stringToHex(value: string): HexString {
  if (typeof value !== 'string') {
    throw new TypeError(
      `Invalid value: expected string, got ${typeof value} ${value}`
    );
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  return bytesToHex(bytes);
}

/**
 * Converts hex string with "0x" prefix to a boolean
 */
export function hexToBool(hex: HexString): boolean {
  if (hex !== '0x00' && hex !== '0x01') {
    throw new TypeError(
      `Invalid boolean hex string: expected 0x00 or 0x01, got ${typeof hex} ${hex}`
    );
  }
  return hex === '0x01';
}

/**
 * Converts a boolean to hex string with "0x" prefix
 */
export function boolToHex(value: boolean): HexString {
  if (typeof value !== 'boolean') {
    throw new TypeError(
      `Invalid boolean value: expected boolean, got ${typeof value} ${value}`
    );
  }
  return value ? '0x01' : '0x00';
}
