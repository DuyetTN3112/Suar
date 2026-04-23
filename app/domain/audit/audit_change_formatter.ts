export function formatAuditChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): { field: string; oldValue: unknown; newValue: unknown }[] {
  const changes: { field: string; oldValue: unknown; newValue: unknown }[] = []

  for (const key in newValues) {
    if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
      changes.push({
        field: key,
        oldValue: oldValues[key] ?? null,
        newValue: newValues[key] ?? null,
      })
    }
  }

  return changes
}
