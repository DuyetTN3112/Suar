export interface HttpSearchHealthReader {
  isEnabled(): boolean
  ping(): Promise<boolean>
  talentIndexName(): string
}
