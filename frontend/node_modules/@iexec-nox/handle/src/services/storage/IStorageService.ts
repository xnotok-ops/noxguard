/**
 * IStorageService defines the interface for a simple key-value storage service.
 *
 * This interface can be implemented by different storage backends, such as localStorage or sessionStorage.
 */
export interface IStorageService {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
