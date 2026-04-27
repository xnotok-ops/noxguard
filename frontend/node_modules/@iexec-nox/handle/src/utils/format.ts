/**
 * Safe JSON.stringify
 *
 * - serializes bigints as strings
 *
 * @param input The value to stringify
 * @returns A JSON string representation of the value
 */
export function safeJsonStringify(input: unknown): string {
  return JSON.stringify(input, (_key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}
