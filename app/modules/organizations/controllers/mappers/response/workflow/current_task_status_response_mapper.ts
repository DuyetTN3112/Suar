import type {
  SerializedModelRecord,
  SerializableModelRecord,
} from '#modules/organizations/controllers/mappers/response/workflow/model_response_serialization'
import {
  camelizeCurrentOrganizationResponseValue,
  serializeForCurrentOrganizationResponse,
} from '#modules/organizations/controllers/mappers/response/workflow/model_response_serialization'

export function mapCurrentOrganizationTaskStatusMutationApiBody(
  data: SerializableModelRecord | SerializedModelRecord
) {
  return {
    data: camelizeCurrentOrganizationResponseValue(
      serializeForCurrentOrganizationResponse(data)
    ),
  }
}
