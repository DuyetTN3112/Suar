export interface TaxonomyVersionReader {
  getVersion(namespace: string): Promise<number>
}
