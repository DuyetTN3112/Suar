export interface SearchIndexCutoverFencePort {
  runExclusive<T>(aliasName: string, callback: () => Promise<T>): Promise<T>
}
