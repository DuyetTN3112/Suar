import type { HttpSearchHealthReader } from '#modules/http/actions/ports/outbound/http_search_health_reader'

export interface SearchHealthCapability {
  isEnabled(): boolean
  ping(): Promise<boolean>
  talentIndexName(): string
}

export class HttpSearchHealthReaderAdapter implements HttpSearchHealthReader {
  constructor(private readonly searchCapability: SearchHealthCapability) {}

  isEnabled(): boolean {
    return this.searchCapability.isEnabled()
  }

  ping(): Promise<boolean> {
    return this.searchCapability.ping()
  }

  talentIndexName(): string {
    return this.searchCapability.talentIndexName()
  }
}

export default HttpSearchHealthReaderAdapter
