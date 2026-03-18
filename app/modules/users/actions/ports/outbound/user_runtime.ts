export interface UserRuntime {
  createId(): string
  createToken(byteLength: number): string
}
