import type { ResponseRecord, SerializableResponseRecord } from '#controllers/organizations/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#controllers/organizations/current/mappers/response/shared'

export function mapCurrentOrganizationTaskStatusMutationApiBody(
  data: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForCurrentOrganizationResponse(data),
  }
}
