export interface SocialAuthCallbackSource {
  accessDenied(): boolean
  stateMisMatch(): boolean
  hasError(): boolean
  getError(): unknown
  user(): Promise<unknown>
}
