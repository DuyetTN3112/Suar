import type {
  SerializedModelRecord,
  SerializableModelRecord,
} from '#modules/organizations/controllers/current/mappers/response/model_response_serialization'
import {
  camelizeCurrentOrganizationResponseValue,
  serializeForCurrentOrganizationResponse,
} from '#modules/organizations/controllers/current/mappers/response/model_response_serialization'

export function mapCurrentOrganizationProjectMutationApiBody(
  project: SerializableModelRecord | SerializedModelRecord
) {
  return {
    data: camelizeCurrentOrganizationResponseValue(
      serializeForCurrentOrganizationResponse(project)
    ),
  }
}
