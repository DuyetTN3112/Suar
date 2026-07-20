export interface SearchAliasIntegrityIndices {
  getAlias(input: { readonly name: string }): Promise<Record<string, unknown>>
  create(input: { readonly index: string; readonly mappings: Record<string, unknown> }): Promise<unknown>
  delete(input: { readonly index: string }, options?: { readonly ignore: readonly number[] }): Promise<unknown>
  updateAliases(input: {
    readonly actions: readonly SearchAliasIntegrityAliasAction[]
  }): Promise<unknown>
}

export type SearchAliasIntegrityAliasAction =
  | { readonly add: { readonly index: string; readonly alias: string } }
  | { readonly remove: { readonly index: string; readonly alias: string } }

export class SearchAliasIntegrityFaultConflict extends Error {
  constructor(message = 'Search task alias must have exactly one backing generation') {
    super(message)
    this.name = 'SearchAliasIntegrityFaultConflict'
  }
}

export interface SearchAliasIntegrityFaultResult {
  readonly operation: 'enabled' | 'restored'
  readonly faultIndexName: string
  readonly faultIndexPresent: boolean
  readonly backingIndexCount: number
}

export class SearchAliasIntegrityFaultController {
  #tail: Promise<void> = Promise.resolve()

  constructor(private readonly indices: SearchAliasIntegrityIndices) {}

  enable(input: {
    readonly aliasName: string
    readonly faultIndexName: string
    readonly mappings: Record<string, unknown>
  }): Promise<SearchAliasIntegrityFaultResult> {
    return this.#withLock(() => this.#enable(input))
  }

  restore(input: {
    readonly aliasName: string
    readonly faultIndexName: string
  }): Promise<SearchAliasIntegrityFaultResult> {
    return this.#withLock(() => this.#restore(input))
  }

  async #enable(input: {
    readonly aliasName: string
    readonly faultIndexName: string
    readonly mappings: Record<string, unknown>
  }): Promise<SearchAliasIntegrityFaultResult> {
    const activeAliases = await this.indices.getAlias({ name: input.aliasName })
    if (Object.keys(activeAliases).length !== 1) throw new SearchAliasIntegrityFaultConflict()

    await this.indices.delete({ index: input.faultIndexName }, { ignore: [404] })
    await this.indices.create({ index: input.faultIndexName, mappings: input.mappings })
    try {
      await this.indices.updateAliases({
        actions: [{ add: { index: input.faultIndexName, alias: input.aliasName } }],
      })
    } catch (error) {
      const afterFailure = await this.indices.getAlias({ name: input.aliasName })
      if (!Object.prototype.hasOwnProperty.call(afterFailure, input.faultIndexName)) {
        await this.indices.delete({ index: input.faultIndexName }, { ignore: [404] })
      }
      throw error
    }

    const verifiedAliases = await this.indices.getAlias({ name: input.aliasName })
    if (
      Object.keys(verifiedAliases).length !== 2 ||
      !Object.prototype.hasOwnProperty.call(verifiedAliases, input.faultIndexName)
    ) {
      throw new SearchAliasIntegrityFaultConflict('Search task alias fault backing could not be verified')
    }

    return {
      operation: 'enabled',
      faultIndexName: input.faultIndexName,
      faultIndexPresent: true,
      backingIndexCount: Object.keys(verifiedAliases).length,
    }
  }

  async #restore(input: {
    readonly aliasName: string
    readonly faultIndexName: string
  }): Promise<SearchAliasIntegrityFaultResult> {
    const activeAliases = await this.indices.getAlias({ name: input.aliasName })
    if (Object.prototype.hasOwnProperty.call(activeAliases, input.faultIndexName)) {
      try {
        await this.indices.updateAliases({
          actions: [{ remove: { index: input.faultIndexName, alias: input.aliasName } }],
        })
      } catch (error) {
        const afterFailure = await this.indices.getAlias({ name: input.aliasName })
        if (Object.prototype.hasOwnProperty.call(afterFailure, input.faultIndexName)) throw error
      }
    }

    await this.indices.delete({ index: input.faultIndexName }, { ignore: [404] })
    const restoredAliases = await this.indices.getAlias({ name: input.aliasName })
    return {
      operation: 'restored',
      faultIndexName: input.faultIndexName,
      faultIndexPresent: Object.prototype.hasOwnProperty.call(restoredAliases, input.faultIndexName),
      backingIndexCount: Object.keys(restoredAliases).length,
    }
  }

  async #withLock<T>(work: () => Promise<T>): Promise<T> {
    const previous = this.#tail
    let release!: () => void
    this.#tail = new Promise<void>((resolve) => { release = resolve })
    await previous
    try {
      return await work()
    } finally {
      release()
    }
  }
}
