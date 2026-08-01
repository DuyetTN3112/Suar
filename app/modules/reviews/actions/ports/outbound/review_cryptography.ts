export interface ReviewCryptography {
  nextId(): string
  digest(value: string): string
  verifyHmac(secret: string, value: string, signature: string): boolean
}
