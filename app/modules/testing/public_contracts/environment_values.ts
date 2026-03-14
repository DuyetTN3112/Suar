export function readNonEmptyEnvironmentValue(
  env: NodeJS.ProcessEnv,
  key: string
): string | undefined {
  const value = env[key]?.trim()
  return value && value.length > 0 ? value : undefined
}

export function readRequiredEnvironmentValues<const TKeys extends readonly string[]>(
  env: NodeJS.ProcessEnv,
  keys: TKeys
): { [TIndex in keyof TKeys]: string } | null {
  const values = keys.map((key) => readNonEmptyEnvironmentValue(env, key))
  if (values.some((value) => value === undefined)) {
    return null
  }

  return values as { [TIndex in keyof TKeys]: string }
}
