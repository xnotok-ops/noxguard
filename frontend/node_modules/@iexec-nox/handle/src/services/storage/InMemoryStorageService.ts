import type { IStorageService } from './IStorageService.js';

/**
 * InMemoryStorageService is a simple implementation of IStorageService that stores data in memory.
 */
export class InMemoryStorageService implements IStorageService {
  private storage: Record<string, string> = {};
  getItem(key: string): string | null {
    // eslint-disable-next-line unicorn/no-null
    return this.storage[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.storage[key] = value;
  }
  removeItem(key: string): void {
    delete this.storage[key];
  }
}
