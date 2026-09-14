export interface MemoryCacheEntry {
  value: string
  expiresAt: number
}

const memoryCache = new Map<string, MemoryCacheEntry>()
const memoryCacheGenerations = new Map<string, string>()

export function usesMemoryCache(): boolean {
  return process.env['NODE_ENV'] === 'test' && process.env['CACHE_INTEGRATION_DRIVER'] !== 'redis'
}

export function readMemoryEntry(key: string, currentTime: number): MemoryCacheEntry | null {
  const entry = memoryCache.get(key)
  if (!entry) {
    return null
  }

  if (entry.expiresAt <= currentTime) {
    memoryCache.delete(key)
    return null
  }

  return entry
}

export function writeMemoryEntry(key: string, value: string, expiresAt: number): void {
  memoryCache.set(key, { value, expiresAt })
}

export function deleteMemoryEntry(key: string): boolean {
  return memoryCache.delete(key)
}

export function getMemoryCacheKeys(): IterableIterator<string> {
  return memoryCache.keys()
}

export function getMemoryGeneration(namespace: string): string | undefined {
  return memoryCacheGenerations.get(namespace)
}

export function setMemoryGeneration(namespace: string, token: string): void {
  memoryCacheGenerations.set(namespace, token)
}

export function clearMemoryCache(): void {
  memoryCache.clear()
  memoryCacheGenerations.clear()
}
