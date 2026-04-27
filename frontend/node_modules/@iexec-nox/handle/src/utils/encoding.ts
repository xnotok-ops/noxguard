import type { HexString } from '../types/internalTypes.js';
import {
  hexToBool,
  hexToIntX,
  hexToString,
  hexToUintX,
  isHexString,
} from './hex.js';
import type { JsValue, SolidityType } from './types.js';

/**
 * Decodes a hex string (with "0x" prefix) to a JavaScript value of the specified Solidity type.
 */
export function decodeValue<T extends SolidityType>(
  plaintext: HexString,
  solidityType: T
): JsValue<T> {
  let value: JsValue<T>;
  /* eslint unicorn/prefer-switch: ["error", {"minimumCases": 5}] */
  if (solidityType === 'bool') {
    value = hexToBool(plaintext) as JsValue<T>;
  } else if (solidityType === 'string') {
    value = hexToString(plaintext) as JsValue<T>;
  } else if (solidityType === 'bytes') {
    // no validation needed plaintext is always hex
    value = plaintext as JsValue<T>;
  } else if (solidityType === 'address') {
    if (!isHexString(plaintext, 20)) {
      throw new TypeError('Invalid address');
    }
    value = plaintext as JsValue<T>;
  } else if (solidityType.startsWith('uint')) {
    const bitSize = Number.parseInt(solidityType.slice(4), 10);
    value = hexToUintX(plaintext, bitSize) as JsValue<T>;
  } else if (solidityType.startsWith('int')) {
    const bitSize = Number.parseInt(solidityType.slice(3), 10);
    value = hexToIntX(plaintext, bitSize) as JsValue<T>;
  } else if (solidityType.startsWith('bytes')) {
    const byteSize = Number.parseInt(solidityType.slice(5), 10);
    if (!isHexString(plaintext, byteSize)) {
      throw new TypeError(`Invalid ${solidityType}`);
    }
    value = plaintext as JsValue<T>;
  } else {
    throw new Error(`Unsupported solidity type ${solidityType}`); // should never happen
  }
  return value;
}
