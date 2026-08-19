import { test } from '@japa/runner'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}



test.group('omitUndefined', () => {
  test('drops undefined keys while preserving required values and nulls', ({ assert }) => {
    const value = omitUndefined({
      page: 1,
      search: undefined as string | undefined,
      status: 'active',
      deletedAt: null as string | null | undefined,
    })

    assert.deepEqual(value, {
      page: 1,
      status: 'active',
      deletedAt: null,
    })
    assert.notProperty(value, 'search')
  })
})
