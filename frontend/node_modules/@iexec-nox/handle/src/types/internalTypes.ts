/**
 * Internal types - not exported to consumers
 */

export type BaseUrl = `http${'' | 's'}://${string}`;
export type EthereumAddress = `0x${string}`;

/** Hex-encoded string with "0x" prefix */
export type HexString = `0x${string}`;
