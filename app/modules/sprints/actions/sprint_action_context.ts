export interface SprintActionContext {
  readonly userId: string | null
  readonly organizationId: string | null
  readonly ip: string
  readonly userAgent: string
}
