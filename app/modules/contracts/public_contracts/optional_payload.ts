type OptionalKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

export type OmitUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalKeys<T>]?: Exclude<T[Key], undefined>
}

export function omitUndefined<T extends object>(value: T): OmitUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmitUndefined<T>
}
