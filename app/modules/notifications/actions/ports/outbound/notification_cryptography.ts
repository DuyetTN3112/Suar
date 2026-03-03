export interface NotificationDigestGenerator {
  digest(canonicalValue: string): string
}

export interface NotificationIdentityGenerator {
  next(): string
}
