import type { ResponseRecord, SerializableResponseRecord } from '#controllers/organizations/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#controllers/organizations/current/mappers/response/shared'

export function mapCurrentOrganizationProjectMutationApiBody(
  project: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForCurrentOrganizationResponse(project),
  }
}
