export interface UserProfileProjectionUpdatedV1 {
  eventType: 'users.profile_projection_updated.v1'
  userId: string
  sourceModule: string
  sourceId: string
  updatedAt: string
}
