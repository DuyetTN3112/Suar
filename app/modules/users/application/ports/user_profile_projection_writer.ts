export interface UserProfileProjectionInput {
  userId: string
  sourceModule: string
  sourceId: string
  occurredAt: string
}

export interface UserProfileProjectionWriter {
  updateProfileProjection(input: UserProfileProjectionInput): Promise<void>
}
