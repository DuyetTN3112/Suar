import type {
  ResponseRecord,
  SerializableResponseRecord,
} from '#modules/organizations/controllers/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#modules/organizations/controllers/current/mappers/response/shared'

export function mapCurrentOrganizationProjectMutationApiBody(
  project: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForCurrentOrganizationResponse(project),
  }
}
