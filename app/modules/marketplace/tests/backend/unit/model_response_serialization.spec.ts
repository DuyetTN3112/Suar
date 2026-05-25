import { test } from '@japa/runner'

import {
  camelizeResponseValue,
  serializeModelForHttpResponse,
} from '#modules/marketplace/controllers/mappers/response/marketplace-tasks/model_response_serialization'

test.group('', () => {
  test('serializes model values before camelizing nested response keys', ({ assert }) => {
    const serialized = serializeModelForHttpResponse({
      serialize() {
        return {
          task_id: 'task-1',
          applicant_profile: {
            display_name: 'Contributor',
          },
        }
      },
    })

    assert.deepEqual(camelizeResponseValue(serialized), {
      taskId: 'task-1',
      applicantProfile: {
        displayName: 'Contributor',
      },
    })
  })

})
