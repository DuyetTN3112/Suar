import type {
  ResponseRecord,
  SerializableResponseRecord,
} from '#modules/organizations/controllers/current/mappers/response/shared'
import { serializeForCurrentOrganizationResponse } from '#modules/organizations/controllers/current/mappers/response/shared'

export function mapCurrentOrganizationTaskStatusMutationApiBody(
  data: SerializableResponseRecord | ResponseRecord
) {
  return {
    success: true,
    data: serializeForCurrentOrganizationResponse(data),
  }
}
