import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildCreateOrganizationDTO,
  buildDeleteOrganizationDTO,
  buildUpdateOrganizationDTO,
} from '#modules/organizations/controllers/mappers/request/directory/organization_request_mapper'

function requestOf(values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return { input: (key: string) => values[key] } as never
}

test.group('Organization request mapper', () => {
  test('constructs the validated create organization DTO', ({ assert }) => {
    const dto = buildCreateOrganizationDTO(requestOf({
      name: 'Acme', slug: 'acme', description: 'A company', website: 'https://acme.test',
    }))
    assert.deepEqual(dto.toObject(), {
      name: 'Acme', slug: 'acme', description: 'A company', logo: null, website: 'https://acme.test',
    })
  })

  test('rejects malformed organization names before command execution', ({ assert }) => {
    assert.throws(
      () => buildCreateOrganizationDTO(requestOf({ name: 'x' })),
      ValidationException
    )
  })

  test('rejects malformed organization route ids before mutation commands', ({ assert }) => {
    assert.throws(() => buildDeleteOrganizationDTO(requestOf({}), 42), ValidationException)
    assert.throws(() => buildUpdateOrganizationDTO(requestOf({ name: 'Acme' }), ''), ValidationException)
  })
})
